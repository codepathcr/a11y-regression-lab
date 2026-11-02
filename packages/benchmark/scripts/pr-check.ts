import { mkdtemp, rm, writeFile, access, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import { buildProviderFromEnv, buildProviders, loadConfig } from '@a11y-lab/analysis';
import type { Provider } from '@a11y-lab/analysis';
import { launchChromium } from './browser';
import {
  externalUrl,
  loadExternalConfig,
  resolveExternalAffected,
  stageAppsRoot,
} from './external';
import type { ExternalConfig } from './external';
import { serveExternal } from './external-server';
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
 * Y el modo de repositorio externo, que es el que usa el workflow reutilizable.
 * Los escenarios no salen de `packages/benchmark/apps` sino de un archivo
 * `a11y-lab.json` que mantiene el repositorio consumidor, uno por cada lado:
 *
 *   pnpm --filter @a11y-lab/benchmark pr-check --external \
 *     --base-config <a11y-lab.json de la base> --head-config <a11y-lab.json del cambio> \
 *     --base-dist <dir> --head-dist <dir> --changed-from <archivo> [--config-rel <ruta>]
 *
 * Pasar rutas ABSOLUTAS: `pnpm --filter` ejecuta el script dentro de
 * `packages/benchmark`, de modo que una ruta relativa se resuelve desde ahí.
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
/** Modo de repositorio externo: ver external.ts. */
const external = args.includes('--external');
const baseConfigPath = flag('base-config');
const headConfigPath = flag('head-config');
/** Ruta del archivo de configuración dentro del repositorio consumidor, tal
 *  como aparece en la lista de archivos modificados. */
const configRel = flag('config-rel') ?? 'a11y-lab.json';
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

/** Un lado del repositorio externo: la carpeta compilada y la raíz de apps
 *  fabricada desde su a11y-lab.json (vacía si el archivo no existía en ese lado). */
async function prepareExternal(dist: string, config: ExternalConfig | undefined, label: string): Promise<Side> {
  const appsRoot =
    config === undefined ? await mkdtemp(join(tmpdir(), 'a11y-ext-')) : await stageAppsRoot(config);
  return {
    dist: resolve(dist),
    appsRoot,
    label,
    cleanup: () => rm(appsRoot, { recursive: true, force: true }),
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
  let externalHead: ExternalConfig | undefined;
  let externalBase: ExternalConfig | undefined;
  if (external) {
    if (
      headConfigPath === undefined ||
      baseDist === undefined ||
      headDist === undefined ||
      changedFrom === undefined
    ) {
      console.error(
        'El modo --external necesita --head-config, --base-dist, --head-dist y --changed-from ' +
          '(y --base-config si la base ya tenía el archivo).'
      );
      process.exit(1);
    }
    try {
      externalHead = await loadExternalConfig(resolve(headConfigPath));
      // En el primer Pull Request que agrega a11y-lab.json la base no lo tiene:
      // todas las aplicaciones se reportan como nuevas, no como error.
      externalBase =
        baseConfigPath !== undefined && (await exists(resolve(baseConfigPath)))
          ? await loadExternalConfig(resolve(baseConfigPath))
          : undefined;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  const changedRaw =
    changedFrom !== undefined
      ? await readFile(changedFrom, 'utf8')
      : headRef === undefined
        ? await git('diff', '--name-only', baseRef)
        : await git('diff', '--name-only', `${baseRef}...${diffTarget}`);
  const changed = changedRaw.split('\n').map((line) => line.trim()).filter((line) => line !== '');

  const affected = externalHead
    ? resolveExternalAffected(changed, externalHead, configRel)
    : resolveAffected(
        changed,
        await listApps(headApps !== undefined ? resolve(headApps) : join(ROOT, 'apps'))
      );

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
    // Vía opcional: si A11Y_LLM_PROVIDER está definida, el modelo sale de las
    // variables de entorno (Ollama remoto, API compatible con OpenAI o
    // Anthropic) y no de analysis.config.json. Sin esa variable el
    // comportamiento es el de siempre. Es lo que permite usar el framework en
    // un repositorio ajeno sin tocar la configuración del estudio.
    let fromEnv: Provider | null;
    try {
      fromEnv = buildProviderFromEnv();
    } catch (error) {
      console.error(`Configuración del modelo inválida: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    if (fromEnv !== null) {
      if (modelId !== undefined) {
        console.warn('Aviso: --model se ignora porque el modelo viene de las variables A11Y_LLM_*.');
      }
      provider = fromEnv;
    } else {
      const config = await loadConfig();
      const providers = buildProviders(config);
      provider = modelId === undefined ? providers[0] : providers.find((p) => p.id === modelId);
      if (provider === undefined) {
        console.error(`Modelo desconocido: ${modelId}. Disponibles: ${providers.map((p) => p.id).join(', ')}`);
        process.exit(1);
      }
    }
    modelLabel = provider.label;
    console.log(`Modelo: ${provider.label}`);
  } else {
    console.log('Sin modelo: solo comparación determinista.');
  }
  console.log('');

  // --- Los dos lados -------------------------------------------------------
  if (affected.apps.length > 0) {
    const base = external
      ? await prepareExternal(baseDist!, externalBase, etiquetaBase)
      : baseDist !== undefined && baseApps !== undefined
        ? prepareGiven(baseDist, baseApps, etiquetaBase)
        : await prepareRef(baseRef);
    sides.push(base);
    const head = external
      ? await prepareExternal(headDist!, externalHead, etiquetaHead)
      : headDist !== undefined && headApps !== undefined
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
        // Solo en modo externo: otro servidor (salida SPA y señal de listo) y
        // otra forma de armar la URL. Sin --external no se pasa nada y el
        // motor se comporta como siempre.
        ...(externalHead
          ? {
              serve: (port: number, root: string) =>
                serveExternal(port, root, { ready: externalHead!.ready }),
              urlFor: (origin: string, appId: string, side: 'base' | 'head') =>
                externalUrl(side === 'base' ? (externalBase ?? externalHead!) : externalHead!, origin, appId),
              readyTimeoutMs:
                externalHead.readyTimeoutMs ?? (externalHead.ready?.timeoutMs ?? 10_000) + 5_000,
            }
          : {}),
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
    const generic = renderReport(
      { verdicts: [], base: etiquetaBase, head: etiquetaHead, strategy: 'trace-diff' },
      affected
    );
    const report = external
      ? [
          '### Accesibilidad dinámica: sin aplicaciones afectadas',
          '',
          `Ningún archivo del cambio afecta a las aplicaciones declaradas en \`${configRel}\` ` +
            '(se ignoran documentación, `.github/` y lo indicado en `ignore`).',
        ].join('\n')
      : generic;
    await writeFile(outFile, `${report}\n`, 'utf8');
    console.log(report);
  }
} finally {
  for (const side of sides) await side.cleanup();
}
