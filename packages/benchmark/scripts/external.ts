import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Step } from '@a11y-lab/framework';
import type { Affected } from './pr-core';
import type { ReadyOptions } from './external-server';
import type { AppFile } from './spec';

/**
 * Adaptador para repositorios que NO son el benchmark.
 *
 * El motor (`pr-core`) recibe dos carpetas compiladas y una raíz con un
 * `app.json` por aplicación; no sabe de dónde salen. Este módulo fabrica esa
 * raíz a partir de un archivo que el repositorio consumidor mantiene
 * (`a11y-lab.json`), de modo que el motor y la compuerta determinista son
 * exactamente los mismos que en el estudio y solo cambia la fuente de los
 * escenarios.
 *
 * Cada lado del Pull Request trae su propia copia del archivo. Si el cambio
 * modifica un escenario, los dos lados difieren y el motor lo reporta como
 * "escenario cambiado" en lugar de comparar trazas de recorridos distintos,
 * igual que en el estudio.
 */

export interface ExternalApp {
  /** Identificador estable. Es lo que une el escenario de la base con el del cambio. */
  id: string;
  title: string;
  /** Ruta inicial dentro de la aplicación compilada. Por omisión `/`. */
  path?: string;
  /**
   * Prefijos de ruta (relativos a la raíz del repositorio) cuyo cambio afecta a
   * esta aplicación. Sin `watch`, cualquier cambio no ignorado la afecta.
   */
  watch?: string[];
  scenario: { id?: string; steps: Step[] };
}

export interface ExternalConfig {
  apps: ExternalApp[];
  /** Cómo se decide que la página está lista. Ver `ReadyOptions`. */
  ready?: ReadyOptions;
  /**
   * Cambios que no afectan a ninguna aplicación. Un elemento que empieza con
   * `*.` es una extensión (`*.md`); cualquier otro es un prefijo de ruta.
   */
  ignore?: string[];
  /** Espera máxima, en ms, a que el servidor reciba la señal de listo. */
  readyTimeoutMs?: number;
}

/** Lo que casi nunca cambia el comportamiento de la interfaz. */
export const DEFAULT_IGNORE = ['.github/', 'docs/', '*.md', '*.mdx', 'LICENSE'];

const ACTIONS = ['focus', 'fill', 'click', 'press', 'settle'] as const;
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export class ExternalConfigError extends Error {}

function fail(file: string, where: string, message: string): never {
  throw new ExternalConfigError(`${file}: ${where}: ${message}`);
}

function validateStep(file: string, where: string, raw: unknown): Step {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail(file, where, 'el paso debe ser un objeto');
  }
  const step = raw as Record<string, unknown>;
  const action = step.action;
  if (typeof action !== 'string' || !(ACTIONS as readonly string[]).includes(action)) {
    fail(file, where, `"action" debe ser una de: ${ACTIONS.join(', ')}`);
  }
  if ((action === 'focus' || action === 'fill' || action === 'click') && typeof step.selector !== 'string') {
    fail(file, where, `la acción "${action}" necesita "selector" (texto)`);
  }
  if (action === 'fill' && step.value !== undefined && typeof step.value !== 'string') {
    fail(file, where, '"value" debe ser texto');
  }
  if (action === 'press' && step.key !== undefined && typeof step.key !== 'string') {
    fail(file, where, '"key" debe ser texto (p. ej. "Tab", "Enter")');
  }
  if (step.ms !== undefined && (typeof step.ms !== 'number' || !(step.ms >= 0))) {
    fail(file, where, '"ms" debe ser un número no negativo');
  }
  const out: Step = { action: action as Step['action'] };
  if (typeof step.selector === 'string') out.selector = step.selector;
  if (typeof step.value === 'string') out.value = step.value;
  if (typeof step.key === 'string') out.key = step.key;
  if (typeof step.ms === 'number') out.ms = step.ms;
  return out;
}

function stringList(file: string, where: string, raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) {
    fail(file, where, 'debe ser una lista de textos');
  }
  return raw as string[];
}

/** Valida y normaliza el contenido de un `a11y-lab.json`. */
export function parseExternalConfig(text: string, file = 'a11y-lab.json'): ExternalConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ExternalConfigError(`${file}: no es JSON válido (${error instanceof Error ? error.message : String(error)})`);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail(file, 'raíz', 'debe ser un objeto con la lista "apps"');
  }
  const root = raw as Record<string, unknown>;
  if (!Array.isArray(root.apps) || root.apps.length === 0) {
    fail(file, '"apps"', 'debe ser una lista con al menos una aplicación');
  }

  const seen = new Set<string>();
  const apps: ExternalApp[] = (root.apps as unknown[]).map((entry, index) => {
    const where = `apps[${index}]`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      fail(file, where, 'debe ser un objeto');
    }
    const app = entry as Record<string, unknown>;
    if (typeof app.id !== 'string' || !ID_PATTERN.test(app.id)) {
      fail(file, `${where}.id`, 'es obligatorio y solo admite minúsculas, dígitos, punto, guion y guion bajo');
    }
    if (seen.has(app.id)) fail(file, `${where}.id`, `"${app.id}" está repetido`);
    seen.add(app.id);
    if (app.title !== undefined && typeof app.title !== 'string') fail(file, `${where}.title`, 'debe ser texto');
    if (app.path !== undefined && (typeof app.path !== 'string' || !app.path.startsWith('/'))) {
      fail(file, `${where}.path`, 'debe ser texto y empezar con "/" (p. ej. "/", "/login", "/#/cuenta")');
    }
    const scenario = app.scenario as Record<string, unknown> | undefined;
    if (typeof scenario !== 'object' || scenario === null || !Array.isArray(scenario.steps)) {
      fail(file, `${where}.scenario.steps`, 'debe ser una lista de pasos');
    }
    const steps = (scenario.steps as unknown[]).map((step, i) => validateStep(file, `${where}.scenario.steps[${i}]`, step));
    if (steps.length === 0) fail(file, `${where}.scenario.steps`, 'el recorrido no puede estar vacío');
    return {
      id: app.id,
      title: typeof app.title === 'string' ? app.title : app.id,
      ...(typeof app.path === 'string' ? { path: app.path } : {}),
      ...(app.watch !== undefined ? { watch: stringList(file, `${where}.watch`, app.watch) } : {}),
      scenario: { ...(typeof scenario.id === 'string' ? { id: scenario.id } : {}), steps },
    };
  });

  const config: ExternalConfig = { apps };
  if (root.ignore !== undefined) config.ignore = stringList(file, '"ignore"', root.ignore);
  if (root.readyTimeoutMs !== undefined) {
    if (typeof root.readyTimeoutMs !== 'number' || !(root.readyTimeoutMs > 0)) {
      fail(file, '"readyTimeoutMs"', 'debe ser un número positivo');
    }
    config.readyTimeoutMs = root.readyTimeoutMs;
  }
  if (root.ready !== undefined) {
    const ready = root.ready as Record<string, unknown>;
    if (typeof ready !== 'object' || ready === null || Array.isArray(ready)) {
      fail(file, '"ready"', 'debe ser un objeto');
    }
    if (ready.mode !== undefined && ready.mode !== 'auto' && ready.mode !== 'app') {
      fail(file, '"ready.mode"', 'debe ser "auto" o "app"');
    }
    if (ready.selector !== undefined && typeof ready.selector !== 'string') fail(file, '"ready.selector"', 'debe ser texto');
    for (const key of ['quietMs', 'timeoutMs'] as const) {
      if (ready[key] !== undefined && (typeof ready[key] !== 'number' || !((ready[key] as number) >= 0))) {
        fail(file, `"ready.${key}"`, 'debe ser un número no negativo');
      }
    }
    config.ready = ready as ReadyOptions;
  }
  return config;
}

export async function loadExternalConfig(path: string): Promise<ExternalConfig> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    throw new ExternalConfigError(
      `No se encontró ${path}. El repositorio necesita un a11y-lab.json con sus aplicaciones y recorridos ` +
        '(ver docs/github-actions.md).'
    );
  }
  return parseExternalConfig(text, path);
}

function isIgnored(file: string, ignore: string[]): boolean {
  return ignore.some((rule) =>
    rule.startsWith('*.') ? file.toLowerCase().endsWith(rule.slice(1).toLowerCase()) : file.startsWith(rule)
  );
}

/**
 * Qué aplicaciones toca un cambio. Equivale a `resolveAffected` del benchmark,
 * con la diferencia de que acá no hay una convención de carpetas: la relación
 * entre archivos y aplicaciones la declara el repositorio con `watch`.
 *
 * Si el propio `a11y-lab.json` cambió, se evalúan todas las aplicaciones: un
 * escenario modificado debe quedar reportado como tal y no pasar inadvertido.
 */
export function resolveExternalAffected(
  changedFiles: string[],
  config: ExternalConfig,
  configRelativePath = 'a11y-lab.json'
): Affected {
  const ignore = config.ignore ?? DEFAULT_IGNORE;
  const changed = changedFiles.map((file) => file.replace(/\\/g, '/'));
  const configChanged = changed.includes(configRelativePath);
  const relevant = changed.filter((file) => file !== configRelativePath && !isIgnored(file, ignore));

  const apps = config.apps
    .filter(
      (app) =>
        configChanged ||
        (relevant.length > 0 &&
          (app.watch === undefined || app.watch.length === 0 || relevant.some((file) => app.watch!.some((prefix) => file.startsWith(prefix)))))
    )
    .map((app) => app.id)
    .sort();
  return { apps, frameworkTouched: false, uiTouched: false };
}

/**
 * Escribe la raíz de aplicaciones que espera el motor: una carpeta por
 * aplicación con su `app.json`. Devuelve la carpeta temporal.
 */
export async function stageAppsRoot(config: ExternalConfig): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'a11y-ext-'));
  for (const app of config.apps) {
    const dir = join(root, app.id);
    await mkdir(dir, { recursive: true });
    const file: AppFile = {
      id: app.id,
      title: app.title,
      stratum: 'external',
      scenario: { id: app.scenario.id ?? app.id, steps: app.scenario.steps },
      variants: [],
    };
    await writeFile(join(dir, 'app.json'), JSON.stringify(file, null, 2), 'utf8');
  }
  return root;
}

/** URL de una aplicación dentro del servidor de un lado. */
export function externalUrl(config: ExternalConfig, origin: string, appId: string): string {
  const app = config.apps.find((candidate) => candidate.id === appId);
  return `${origin}${app?.path ?? '/'}`;
}
