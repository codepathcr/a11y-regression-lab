import { execFile } from 'node:child_process';
import { copyFile, cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildProviders, loadConfig, resolveCategory } from '@a11y-lab/analysis';
import type { Provider } from '@a11y-lab/analysis';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
import { runPrCheck } from './pr-core';
import { renderReport } from './pr-report';
import type { AppFile } from './spec';

/**
 * Prueba de punta a punta del flujo de Pull Requests, contra verdad de terreno
 * conocida.
 *
 * El problema que resuelve: una corrida del flujo sobre un cambio cualquiera
 * ejercita los controles que RECHAZAN —aplicación nueva, escenario alterado—
 * pero no el camino que MIDE. Esta prueba construye a propósito un cambio
 * comparable cuyo resultado correcto está declarado en el benchmark, y verifica
 * que el flujo lo produzca.
 *
 * Cómo arma el cambio: una variante mutante del benchmark sustituye exactamente
 * una entrada del mapa de partes de la aplicación, de modo que sobrescribir
 * `variants/base.tsx` con la variante mutante simula con precisión lo que hace
 * un cambio real que cablea un componente defectuoso en la composición base.
 * No se toca el árbol de trabajo: todo ocurre sobre una exportación de `HEAD`.
 *
 *   pnpm --filter @a11y-lab/benchmark pr-selftest [app] [variante] [--sin-modelo]
 */

ignoreBrokenPipe();

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '..');
const REPO = resolve(ROOT, '..', '..');

const args = process.argv.slice(2);
const sinModelo = args.includes('--sin-modelo');
const positional = args.filter((arg) => !arg.startsWith('--'));
const appId = positional[0] ?? 'a01-landing';
const variantId = positional[1];

let dir: string | undefined;
try {
  dir = await mkdtemp(join(tmpdir(), 'a11y-selftest-'));
  const benchmark = join(dir, 'packages', 'benchmark');
  const appsRoot = join(benchmark, 'apps');

  console.log(`Exportando HEAD a ${dir}`);
  await run('bash', ['-lc', `git -C "${REPO}" archive HEAD | tar -x -C "${dir}"`], {
    maxBuffer: 256 * 1024 * 1024,
  });

  const app = JSON.parse(await readFile(join(appsRoot, appId, 'app.json'), 'utf8')) as AppFile;
  const mutant =
    variantId === undefined
      ? app.variants.find((variant) => variant.label === 'positive')
      : app.variants.find((variant) => variant.id === variantId);
  if (mutant === undefined) {
    console.error(`No hay variante ${variantId ?? 'positiva'} en ${appId}.`);
    process.exit(1);
  }
  const truth = mutant.groundTruth;
  if (truth === undefined) {
    console.error(`La variante ${mutant.id} no declara verdad de terreno.`);
    process.exit(1);
  }

  console.log(`Aplicación: ${appId} · ${app.title}`);
  console.log(`Variante inyectada: ${mutant.id}`);
  console.log(
    `Verdad de terreno: regresión=${truth.regression} · categoría=${truth.category ?? 'ninguna'} ` +
      `· paso=${truth.expectedStep ?? 'ninguno'}`
  );
  console.log('');

  console.log('Instalando dependencias');
  await run('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
    cwd: dir,
    maxBuffer: 64 * 1024 * 1024,
  });

  // Una sola instalación y dos compilaciones: el lado base se compila primero y
  // su `dist` se aparta antes de inyectar el mutante.
  console.log('Compilando el lado base');
  await run('pnpm', ['--filter', '@a11y-lab/benchmark', 'build'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
  const baseDist = join(benchmark, 'dist-base');
  await cp(join(benchmark, 'dist'), baseDist, { recursive: true });

  console.log(`Inyectando ${mutant.id} en la composición base`);
  await copyFile(
    join(appsRoot, appId, 'variants', `${mutant.id}.tsx`),
    join(appsRoot, appId, 'variants', 'base.tsx')
  );

  console.log('Compilando el lado modificado');
  await run('pnpm', ['--filter', '@a11y-lab/benchmark', 'build'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
  console.log('');

  let provider: Provider | undefined;
  let modelLabel: string | undefined;
  if (!sinModelo) {
    const config = await loadConfig();
    provider = buildProviders(config)[0];
    modelLabel = provider.label;
    console.log(`Modelo: ${provider.label}`);
    console.log('');
  }

  const browser = await launchChromium();
  try {
    const result = await runPrCheck({
      browser,
      base: { dist: baseDist, appsRoot, label: 'HEAD' },
      head: { dist: join(benchmark, 'dist'), appsRoot, label: `HEAD + ${mutant.id}` },
      apps: [appId],
      provider,
      modelLabel,
    });

    console.log(renderReport(result, { apps: [appId], frameworkTouched: false, uiTouched: false }));
    console.log('');
    console.log('='.repeat(70));
    console.log('CONTRASTE CONTRA LA VERDAD DE TERRENO');
    console.log('='.repeat(70));

    const verdict = result.verdicts[0];
    const fallos: string[] = [];

    if (verdict === undefined || verdict.status !== 'divergente') {
      const estado = verdict === undefined ? 'sin resultado' : verdict.status;
      console.log(`  divergencia observable      FALLA  (${estado})`);
      fallos.push('la mutación no produjo divergencia observable');
    } else {
      console.log(`  divergencia observable      PASA   (${verdict.changedSteps.join(', ')})`);
      if (truth.expectedStep !== null && truth.expectedStep !== undefined) {
        const alcanzado = verdict.changedSteps.includes(truth.expectedStep);
        console.log(
          `  el paso esperado divergió   ${alcanzado ? 'PASA' : 'FALLA'}   (esperado ${truth.expectedStep})`
        );
        if (!alcanzado) fallos.push(`el paso ${truth.expectedStep} no figura entre los divergentes`);
      }

      if (provider !== undefined) {
        const dicho = verdict.verdict;
        if (dicho === undefined) {
          console.log(`  veredicto del modelo        FALLA  (${verdict.error ?? 'sin veredicto legible'})`);
          fallos.push('el modelo no produjo un veredicto legible');
        } else {
          const detecto = dicho.regression === truth.regression;
          console.log(`  detección                   ${detecto ? 'PASA' : 'FALLA'}   (dijo ${dicho.regression})`);
          if (!detecto) fallos.push('la detección no coincide con la verdad de terreno');

          if (dicho.regression && truth.category !== null && truth.category !== undefined) {
            const categoria = resolveCategory(dicho.category) === resolveCategory(truth.category);
            console.log(
              `  categoría                   ${categoria ? 'PASA' : 'FALLA'}   (dijo ${dicho.category ?? 'ninguna'})`
            );
          }
          if (dicho.regression && truth.expectedStep !== null && truth.expectedStep !== undefined) {
            const exacto = dicho.transitionStep === truth.expectedStep;
            console.log(
              `  localización estricta       ${exacto ? 'PASA' : 'FALLA'}   (dijo ${dicho.transitionStep ?? 'ninguno'})`
            );
          }
        }
      }
    }

    console.log('');
    if (fallos.length === 0) {
      console.log('El flujo de Pull Requests reproduce la verdad de terreno de este par.');
      console.log('');
      console.log(
        'Las dimensiones de categoría y localización se informan y no hacen fallar la prueba: ' +
          'son desempeño del modelo, medido en el Capítulo 4, y no corrección del flujo.'
      );
    } else {
      console.log('FALLA la prueba del flujo:');
      for (const fallo of fallos) console.log(`  · ${fallo}`);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
} finally {
  if (dir !== undefined) await rm(dir, { recursive: true, force: true });
}
