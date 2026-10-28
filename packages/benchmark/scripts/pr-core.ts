import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { captureTrace, diffTraces, normalize } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import { buildEvidence, buildPrompt, parseVerdict, resolveCategory } from '@a11y-lab/analysis';
import type { Evidence, EvidenceFormat, Provider, Strategy, Verdict } from '@a11y-lab/analysis';
import type { Browser } from 'playwright';
import { reportEnvironment } from './environment';
import { serveDist } from './static-server';
import type { AppFile } from './spec';

/**
 * Motor del flujo de Pull Requests.
 *
 * Recibe DOS DIRECTORIOS YA COMPILADOS, uno por lado del cambio, y no sabe de
 * dónde salieron. Esa es la decisión de diseño que permite tener un solo motor
 * con dos frentes: el simulador local obtiene los directorios de dos commits
 * mediante `git worktree`, y el workflow los obtiene de dos checkouts. La
 * lógica de medición no se duplica y el reporte es idéntico por los dos
 * caminos.
 *
 * Es la operacionalización del OE4: el mismo escenario sobre las dos versiones
 * que el Pull Request pone en comparación, con la evidencia y la compuerta de
 * 3.6, pero con los dos lados tomados del control de versiones en lugar del
 * archivo de variantes del benchmark.
 */

/** Un lado del cambio, ya compilado. */
export interface PrSide {
  /** Directorio servido al navegador. */
  dist: string;
  /** Raíz de `apps/`, para leer el escenario de ese lado. */
  appsRoot: string;
  /** Identificación legible del lado: una referencia de git, una rama. */
  label: string;
}

export type AppVerdict =
  /** La aplicación no existe en el lado base: es nueva y no hay con qué comparar. */
  | { app: string; status: 'nueva' }
  /** La aplicación desapareció en el lado modificado. */
  | { app: string; status: 'eliminada' }
  /**
   * El cambio alteró el escenario de interacción.
   *
   * No se reporta como regresión y no se envía al modelo. La equivalencia del
   * recorrido entre los dos lados es la condición que hace comparables las dos
   * trazas (3.6, Instrumento 2); sin ella, toda diferencia observada es
   * indistinguible de un cambio de recorrido. Rechazar es la única respuesta
   * honesta.
   */
  | { app: string; status: 'escenario-cambiado'; detail: string }
  /** La compuerta determinista resolvió el caso: las trazas no difieren. */
  | { app: string; status: 'sin-divergencia'; steps: number }
  /** Hay divergencia. Con proveedor trae veredicto; sin proveedor, solo la evidencia. */
  | {
      app: string;
      status: 'divergente';
      title: string;
      changedSteps: number[];
      eventDivergence: number;
      axDivergence: number;
      evidence: Evidence;
      verdict?: Verdict;
      issues?: string[];
      model?: string;
      latencyMs?: number;
      promptTokens?: number;
      error?: string;
    }
  | { app: string; status: 'error'; detail: string };

export interface PrCheckOptions {
  browser: Browser;
  base: PrSide;
  head: PrSide;
  apps: string[];
  strategy?: Strategy;
  format?: EvidenceFormat;
  /** Ausente: solo se aplica la comparación determinista, sin consultar modelos. */
  provider?: Provider;
  modelLabel?: string;
  basePort?: number;
  headPort?: number;
}

export interface PrCheckResult {
  verdicts: AppVerdict[];
  /** Versión de navegador con la que se capturó, leída de la traza. */
  browserVersion?: string;
  base: string;
  head: string;
  strategy: Strategy;
}

async function readApp(appsRoot: string, appId: string): Promise<AppFile | null> {
  try {
    return JSON.parse(await readFile(join(appsRoot, appId, 'app.json'), 'utf8')) as AppFile;
  } catch {
    return null;
  }
}

/** Compara los dos escenarios por su contenido, no por su identificador: un
 *  escenario puede conservar el nombre y haber cambiado de pasos. */
function sameScenario(left: Scenario, right: Scenario): boolean {
  return JSON.stringify(left.steps) === JSON.stringify(right.steps);
}

function describeScenarioChange(left: Scenario, right: Scenario): string {
  if (left.steps.length !== right.steps.length) {
    return `el recorrido pasó de ${left.steps.length} a ${right.steps.length} pasos`;
  }
  for (let index = 0; index < left.steps.length; index += 1) {
    if (JSON.stringify(left.steps[index]) !== JSON.stringify(right.steps[index])) {
      return `el paso ${index} cambió de acción`;
    }
  }
  return 'el recorrido cambió';
}

export async function runPrCheck(options: PrCheckOptions): Promise<PrCheckResult> {
  const strategy = options.strategy ?? 'trace-diff';
  const format = options.format ?? 'json';
  const basePort = options.basePort ?? 5401;
  const headPort = options.headPort ?? 5402;

  const baseServer = await serveDist(basePort, options.base.dist);
  const headServer = await serveDist(headPort, options.head.dist);
  const verdicts: AppVerdict[] = [];
  let browserVersion: string | undefined;

  try {
    for (const appId of options.apps) {
      const baseApp = await readApp(options.base.appsRoot, appId);
      const headApp = await readApp(options.head.appsRoot, appId);

      if (headApp === null) {
        verdicts.push({ app: appId, status: 'eliminada' });
        continue;
      }
      if (baseApp === null) {
        verdicts.push({ app: appId, status: 'nueva' });
        continue;
      }
      if (!sameScenario(baseApp.scenario, headApp.scenario)) {
        verdicts.push({
          app: appId,
          status: 'escenario-cambiado',
          detail: describeScenarioChange(baseApp.scenario, headApp.scenario),
        });
        continue;
      }

      const scenario: Scenario = { id: headApp.scenario.id ?? appId, steps: headApp.scenario.steps };

      try {
        const left: Trace = await captureTrace(options.browser, {
          url: `${baseServer.origin}/?app=${appId}&variant=base`,
          scenario,
          repetition: 1,
        });
        const right: Trace = await captureTrace(options.browser, {
          url: `${headServer.origin}/?app=${appId}&variant=base`,
          scenario,
          repetition: 1,
        });
        if (browserVersion === undefined) {
          // Misma garantía que el resto de los scripts: el entorno se informa y
          // la ejecución aborta si no es el declarado. El flujo de Pull Requests
          // no es una excepción, porque un veredicto producido en otro navegador
          // no es comparable con las cifras del documento.
          await reportEnvironment(left);
          browserVersion = left.environment.browserVersion;
        }

        const diff = diffTraces(normalize(left), normalize(right));
        const evidence = buildEvidence(strategy, { base: left, modified: right, scenario }, format);

        if (evidence.gated) {
          verdicts.push({ app: appId, status: 'sin-divergencia', steps: scenario.steps.length });
          continue;
        }

        const entry: AppVerdict = {
          app: appId,
          status: 'divergente',
          title: headApp.title,
          changedSteps: evidence.includedSteps,
          eventDivergence: diff.eventDivergence,
          axDivergence: diff.axDivergence,
          evidence,
        };

        if (options.provider !== undefined) {
          const prompt = buildPrompt({ appTitle: headApp.title, evidence });
          try {
            const completion = await options.provider.complete(prompt);
            const parsed = parseVerdict(completion.text);
            entry.verdict = parsed.verdict ?? undefined;
            entry.issues = parsed.issues;
            entry.model = options.modelLabel ?? options.provider.id;
            entry.latencyMs = completion.latencyMs;
            entry.promptTokens = completion.promptTokens;
          } catch (error) {
            entry.error = error instanceof Error ? error.message : String(error);
            entry.model = options.modelLabel ?? options.provider.id;
          }
        }

        verdicts.push(entry);
      } catch (error) {
        verdicts.push({
          app: appId,
          status: 'error',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    baseServer.close();
    headServer.close();
  }

  return {
    verdicts,
    browserVersion,
    base: options.base.label,
    head: options.head.label,
    strategy,
  };
}

/** Qué aplicaciones toca un cambio, a partir de la lista de archivos modificados. */
export interface Affected {
  apps: string[];
  /** El cambio toca el framework de captura: lo que cambió es el INSTRUMENTO y no
   *  la aplicación, de modo que una diferencia de trazas no es una regresión del
   *  producto. Se reporta como advertencia y no como hallazgo. */
  frameworkTouched: boolean;
  /** El cambio toca la biblioteca de componentes, que es base común de todas las
   *  aplicaciones: el alcance se extiende a todas. */
  uiTouched: boolean;
}

const APP_PATH = /^packages\/benchmark\/apps\/([^/]+)\//;

export function resolveAffected(changedFiles: string[], allApps: string[]): Affected {
  const apps = new Set<string>();
  let frameworkTouched = false;
  let uiTouched = false;

  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, '/');
    const match = APP_PATH.exec(normalized);
    if (match) {
      apps.add(match[1]);
      continue;
    }
    if (normalized.startsWith('packages/framework/')) frameworkTouched = true;
    if (normalized.startsWith('packages/ui/')) uiTouched = true;
  }

  if (uiTouched) for (const app of allApps) apps.add(app);
  return { apps: [...apps].sort(), frameworkTouched, uiTouched };
}

export { resolveCategory };
