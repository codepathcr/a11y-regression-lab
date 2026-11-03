import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Browser, Page } from 'playwright';
import type { Step } from '@a11y-lab/framework';
import { launchChromium } from './browser';
import { externalUrl, loadExternalConfig } from './external';
import type { ExternalConfig } from './external';
import { serveExternal } from './external-server';
import { ignoreBrokenPipe } from './io';

/**
 * Validador estático (axe-core) sobre los mismos lados de un Pull Request.
 *
 * Es la línea base de comparación del estudio (OE5) aplicada a la verificación
 * en integración continua: con el MISMO axe-core que `axe-check.ts` (versión
 * fijada por el lockfile) y la misma configuración (`axe.run(document)` con las
 * reglas por omisión, ventana de 1280x900), se evalúa la base y el cambio y se
 * informa qué hallazgos aparecen solo en el cambio.
 *
 * Se mide en DOS momentos, para darle al validador estático su mejor
 * oportunidad: el estado inicial, que es lo único que mira `axe-check.ts`, y el
 * estado final tras ejecutar el recorrido de `a11y-lab.json`. Aun así sigue
 * siendo una fotografía de un instante: no compara versiones ni ve la
 * transición donde ocurre una regresión dinámica.
 *
 * No participa en la decisión de la comprobación: nunca hace fallar la corrida.
 *
 *   pnpm --filter @a11y-lab/benchmark axe-external \
 *     --head-config <a11y-lab.json> --head-dist <dir> \
 *     [--base-config <a11y-lab.json> --base-dist <dir>] \
 *     [--apps id1,id2] [--out-md <archivo>] [--out-json <archivo>]
 *
 * Pasar rutas ABSOLUTAS (`pnpm --filter` ejecuta dentro de packages/benchmark).
 */

ignoreBrokenPipe();

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}

const headConfigPath = flag('head-config');
const headDist = flag('head-dist');
const baseConfigPath = flag('base-config');
const baseDist = flag('base-dist');
const onlyApps = flag('apps')?.split(',').map((id) => id.trim()).filter((id) => id !== '');
const outMd = flag('out-md');
const outJson = flag('out-json');

if (headConfigPath === undefined || headDist === undefined) {
  console.error('Uso: axe-external --head-config <a11y-lab.json> --head-dist <dir> [--base-config ... --base-dist ...]');
  process.exit(1);
}

const AXE = resolve(import.meta.dirname, '..', 'node_modules', 'axe-core', 'axe.min.js');
const SETTLE_MS = 150;
const STEP_TIMEOUT_MS = 2_000;

interface Finding {
  rule: string;
  impact: string | null;
  target: string;
}

interface Scan {
  /** Hallazgos con la página recién montada. */
  inicial: Finding[];
  /** Hallazgos tras el recorrido completo. */
  final: Finding[];
  /** Pasos del recorrido que no se pudieron ejecutar. */
  pasosFallidos: number;
}

async function axeVersion(): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(resolve(AXE, '..', 'package.json'), 'utf8')) as { version?: string };
    return pkg.version ?? 'desconocida';
  } catch {
    return 'desconocida';
  }
}

async function findings(page: Page): Promise<Finding[]> {
  const loaded = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== 'undefined');
  if (!loaded) await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: Document,
          options: { resultTypes: string[] }
        ) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: Array<{ target: unknown[] }> }> }>;
      };
    }).axe;
    const result = await axe.run(document, { resultTypes: ['violations'] });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target.map(String).join(' ')),
    }));
  });
  return violations.flatMap((v) => v.targets.map((target) => ({ rule: v.id, impact: v.impact, target })));
}

/** Réplica mínima de la ejecución de un paso, para llevar la página al estado
 *  final. Es deliberadamente la misma semántica que el framework de captura. */
async function perform(page: Page, step: Step): Promise<void> {
  switch (step.action) {
    case 'focus':
      await page.focus(step.selector!, { timeout: STEP_TIMEOUT_MS });
      break;
    case 'fill':
      await page.fill(step.selector!, step.value ?? '', { timeout: STEP_TIMEOUT_MS });
      break;
    case 'click':
      await page.click(step.selector!, { timeout: STEP_TIMEOUT_MS });
      break;
    case 'press':
      await page.keyboard.press(step.key ?? 'Tab');
      break;
    case 'settle':
      break;
  }
  await page.waitForTimeout(step.ms ?? SETTLE_MS);
}

async function scan(browser: Browser, url: string, steps: Step[], readyTimeoutMs: number): Promise<Scan> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('html[data-harness-ready="true"]', { timeout: readyTimeoutMs });
    await page.waitForTimeout(SETTLE_MS);
    const inicial = await findings(page);
    let pasosFallidos = 0;
    for (const step of steps) {
      try {
        await perform(page, step);
      } catch {
        pasosFallidos += 1;
      }
    }
    const final = await findings(page);
    return { inicial, final, pasosFallidos };
  } finally {
    await context.close();
  }
}

const key = (f: Finding): string => `${f.rule}|${f.target}`;

function onlyNew(head: Finding[], base: Finding[] | undefined): Finding[] | null {
  if (base === undefined) return null;
  const known = new Set(base.map(key));
  return head.filter((f) => !known.has(key(f)));
}

interface Row {
  app: string;
  moment: 'inicial' | 'final';
  base: number | null;
  head: number;
  nuevos: Finding[] | null;
}

async function main(): Promise<void> {
  const headConfig = await loadExternalConfig(resolve(headConfigPath!));
  const baseConfig: ExternalConfig | undefined =
    baseConfigPath !== undefined ? await loadExternalConfig(resolve(baseConfigPath)).catch(() => undefined) : undefined;
  const readyTimeoutMs = headConfig.readyTimeoutMs ?? (headConfig.ready?.timeoutMs ?? 10_000) + 5_000;

  const apps = headConfig.apps.filter((app) => onlyApps === undefined || onlyApps.includes(app.id));
  const headServer = await serveExternal(5412, resolve(headDist!), { ready: headConfig.ready });
  const baseServer =
    baseDist !== undefined && baseConfig !== undefined
      ? await serveExternal(5411, resolve(baseDist), { ready: baseConfig.ready ?? headConfig.ready })
      : undefined;
  const browser = await launchChromium();

  const rows: Row[] = [];
  const errors: string[] = [];
  try {
    for (const app of apps) {
      const steps = app.scenario.steps;
      let head: Scan;
      try {
        head = await scan(browser, externalUrl(headConfig, headServer.origin, app.id), steps, readyTimeoutMs);
      } catch (error) {
        errors.push(`${app.id} (cambio): ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      let base: Scan | undefined;
      if (baseServer !== undefined && baseConfig?.apps.some((candidate) => candidate.id === app.id)) {
        try {
          base = await scan(browser, externalUrl(baseConfig, baseServer.origin, app.id), steps, readyTimeoutMs);
        } catch (error) {
          errors.push(`${app.id} (base): ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      for (const moment of ['inicial', 'final'] as const) {
        rows.push({
          app: app.id,
          moment,
          base: base ? base[moment].length : null,
          head: head[moment].length,
          nuevos: onlyNew(head[moment], base?.[moment]),
        });
      }
    }
  } finally {
    await browser.close();
    headServer.close();
    baseServer?.close();
  }

  const version = await axeVersion();
  const lines: string[] = [];
  lines.push(`#### Validador estático (axe-core ${version})`);
  lines.push('');
  if (rows.length === 0) {
    lines.push('No se pudo evaluar ninguna aplicación.');
  } else {
    lines.push('| Aplicación | Momento | Hallazgos en la base | Hallazgos en el cambio | Nuevos en el cambio |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const row of rows) {
      lines.push(
        `| \`${row.app}\` | ${row.moment} | ${row.base ?? 'n/d'} | ${row.head} | ${row.nuevos === null ? 'n/d' : row.nuevos.length} |`
      );
    }
    const detail = rows.filter((row) => (row.nuevos?.length ?? 0) > 0);
    for (const row of detail) {
      lines.push('');
      lines.push(`Nuevos en \`${row.app}\` (${row.moment}):`);
      for (const finding of row.nuevos!.slice(0, 10)) {
        lines.push(`- [${finding.impact ?? 'sin impacto'}] ${finding.rule}: \`${finding.target}\``);
      }
    }
    lines.push('');
    lines.push(
      'axe evalúa el DOM en un instante y no compara versiones. "Inicial" es la página recién montada ' +
        '(lo que mira el chequeo estático del estudio) y "final", tras ejecutar el recorrido. "n/d": no hay lado base con qué comparar.'
    );
  }
  for (const error of errors) {
    lines.push('');
    lines.push(`Aviso: ${error}`);
  }
  const md = lines.join('\n');
  console.log(md);
  if (outMd !== undefined) await writeFile(resolve(outMd), `${md}\n`, 'utf8');
  if (outJson !== undefined) {
    await writeFile(resolve(outJson), JSON.stringify({ axeVersion: version, rows, errors }, null, 2), 'utf8');
  }
}

await main();
