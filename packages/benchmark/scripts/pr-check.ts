import { mkdtemp, rm, writeFile, access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import { buildProviders, loadConfig } from '@a11y-lab/analysis';
import type { Provider } from '@a11y-lab/analysis';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
import { resolveAffected, runPrCheck } from './pr-core';
import { exitCode, renderReport } from './pr-report';

/**
 * Simulador local del flujo de Pull Requests.
 *
 * Hace lo mismo que el workflow y con el mismo motor; la única diferencia es
 * de dónde saca los dos lados del cambio. Acá salen de dos referencias de git
 * exportadas con `git archive`, que no escribe nada dentro de `.git` y por
 * tanto no deja metadatos que limpiar; en el workflow salen de dos checkouts.
 *
 *   pnpm --filter @a11y-lab/benchmark pr-check [--base <ref>] [--head <ref>]
 *                                              [--model <id>] [--sin-modelo]
 *                                              [--out <archivo.md>]
 *
 * Y el modo de lados ya preparados, que es el que usa el workflow:
 *
 *   pnpm --filter @a11y-lab/benchmark pr-check \
 *     --base-dist <dir> --base-apps <dir> --base-label <texto> \
 *     --head-dist <dir> --head-apps <dir> --head-label <texto> \
 *     --changed-from <archivo con un camino por línea>
 *
 * Por omisión compara `HEAD~1` contra el árbol de trabajo tal como está, que es
 * el caso de uso de quien está escribiendo el cambio. `--head <ref>` compara dos
 * referencias entre sí, que es el caso de uso de la revisión.
 */

ignoreBrokenPipe();

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '..');
const REPO = resolve(ROOT, '..', '..');
const WORKDIR = 'árbol de trabajo';

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}
const baseRef = flag('base') ?? 'HEAD~1';
const headRef = flag('head');
/** Lados ya preparados. Es el modo que usa el workflow, donde los dos lados
 *  vienen de dos checkouts y no hay nada que exportar ni compilar acá. */
const baseDist = flag('base-dist');
const baseApps = flag('base-apps');
const baseLabel = flag('base-label');
const headDist = flag('head-dist');
const headApps = flag('head-apps');
const headLabel = flag('head-label');
/** Lista de archivos modificados, uno por línea. El workflow la calcula contra
 *  la referencia base del Pull Request y la pasa por archivo, en lugar de
 *  obligar a que los dos lados vivan en el mismo repositorio local. */
const changedFrom = flag('changed-from');
const outFile = flag('out') ?? join(ROOT, 'data', 'pr-report.md');
const modelId = flag('model');
const sinModelo = args.includes('--sin-modelo');

async function git(...argv: string[]): Promise<string> {
  const { stdout } = await run('git', argv, { cwd: REPO, maxBuffer: 32 * 1024 * 1024 });
  return stdout.trim();
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

interface Side {
  dist: string;
  appsRoot: string;
  label: string;
  cleanup: () => Promise<void>;
}

/** Exporta una referencia a un directorio temporal y la compila. */
async function prepareRef(ref: string): Promise<Side> {
  const dir = await mkdtemp(join(tmpdir(), 'a11y-pr-'));
  console.log(`Preparando ${ref} en ${dir}`);
  // `git archive` escribe el árbol de la referencia sin tocar .git: no crea
  // worktrees ni metadatos, de modo que no hay nada que borrar dentro del
  // repositorio al terminar.
  await run('bash', ['-lc', `git -C "${REPO}" archive ${ref} | tar -x -C "${dir}"`], {
    maxBuffer: 256 * 1024 * 1024,
  });
  console.log(`  instalando dependencias de ${ref}`);
  await run('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
  console.log(`  compilando ${ref}`);
  await run('pnpm', ['--filter', '@a11y-lab/benchmark', 'build'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
  return {
    dist: join(dir, 'packages', 'benchmark', 'dist'),
    appsRoot: join(dir, 'packages', 'benchmark', 'apps'),
    label: ref,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

/** Un lado ya preparado por quien invoca: dos checkouts en el workflow. */
function prepareGiven(dist: string, apps: string, label: string): Side {
  return {
    dist: resolve(dist),
    appsRoot: resolve(apps),
    label,
    cleanup: async () => undefined,
  };
}

/** El árbol de trabajo tal como está, que debe venir ya compilado. */
async function prepareWorkdir(): Promise<Side> {
  const dist = join(ROOT, 'dist');
  if (!(await exists(join(dist, 'index.html')))) {
    console.error(
      'El árbol de trabajo no está compilado. Corré `pnpm --filter @a11y-lab/benchmark build` ' +
        'antes, o pasá --head <ref> para comparar dos referencias entre sí.'
    );
    process.exit(1);
  }
  return {
    dist,
    appsRoot: join(ROOT, 'apps'),
    label: WORKDIR,
    cleanup: async () => undefined,
  };
}

async function listApps(appsRoot: string): Promise<string[]> {
  const entries = await readdir(appsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^a\d\d-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const sides: Side[] = [];
try {
  // --- Qué cambió ----------------------------------------------------------
  const diffTarget = headRef ?? '';
  const changedRaw =
    changedFrom !== undefined
      ? await readFile(changedFrom, 'utf8')
      : headRef === undefined
        ? await git('diff', '--name-only', baseRef)
        : await git('diff', '--name-only', `${baseRef}...${diffTarget}`);
  const changed = changedRaw.split('\n').map((line) => line.trim()).filter((line) => line !== '');

  const allApps = await listApps(headApps !== undefined ? resolve(headApps) : join(ROOT, 'apps'));
  const affected = resolveAffected(changed, allApps);

  const etiquetaBase = baseLabel ?? baseRef;
  const etiquetaHead = headLabel ?? headRef ?? WORKDIR;
  console.log(`Cambio: ${etiquetaBase} contra ${etiquetaHead}`);
  console.log(`Archivos modificados: ${changed.length}`);
  console.log(
    `Aplicaciones afectadas: ${affected.apps.length === 0 ? 'ninguna' : affected.apps.join(', ')}`
  );
  if (affected.frameworkTouched) console.log('El cambio toca el framework de captura.');
  if (affected.uiTouched) console.log('El cambio toca la biblioteca de componentes.');
  console.log('');

  // --- Proveedor -----------------------------------------------------------
  let provider: Provider | undefined;
  let modelLabel: string | undefined;
  if (!sinModelo) {
    const config = await loadConfig();
    const providers = buildProviders(config);
    provider = modelId === undefined ? providers[0] : providers.find((p) => p.id === modelId);
    if (provider === undefined) {
      console.error(`Modelo desconocido: ${modelId}. Disponibles: ${providers.map((p) => p.id).join(', ')}`);
      process.exit(1);
    }
    modelLabel = provider.label;
    console.log(`Modelo: ${provider.label}`);
  } else {
    console.log('Sin modelo: solo comparación determinista.');
  }
  console.log('');

  // --- Los dos lados -------------------------------------------------------
  if (affected.apps.length > 0) {
    const base =
      baseDist !== undefined && baseApps !== undefined
        ? prepareGiven(baseDist, baseApps, etiquetaBase)
        : await prepareRef(baseRef);
    sides.push(base);
    const head =
      headDist !== undefined && headApps !== undefined
        ? prepareGiven(headDist, headApps, etiquetaHead)
        : headRef === undefined
          ? await prepareWorkdir()
          : await prepareRef(headRef);
    sides.push(head);

    const browser = await launchChromium();
    try {
      const result = await runPrCheck({
        browser,
        base: { dist: base.dist, appsRoot: base.appsRoot, label: base.label },
        head: { dist: head.dist, appsRoot: head.appsRoot, label: head.label },
        apps: affected.apps,
        provider,
        modelLabel,
      });
      const report = renderReport(result, affected);
      await writeFile(outFile, `${report}\n`, 'utf8');
      console.log('');
      console.log(report);
      console.log('');
      console.log(`Reporte en ${outFile}`);
      process.exitCode = exitCode(result);
    } finally {
      await browser.close();
    }
  } else {
    const report = renderReport(
      { verdicts: [], base: etiquetaBase, head: etiquetaHead, strategy: 'trace-diff' },
      affected
    );
    await writeFile(outFile, `${report}\n`, 'utf8');
    console.log(report);
  }
} finally {
  for (const side of sides) await side.cleanup();
}
