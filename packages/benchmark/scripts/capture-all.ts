import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { captureTrace } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import { launchChromium } from './browser';
import { reportEnvironment } from './environment';
import { ignoreBrokenPipe } from './io';
import { TRACES, tracePath } from './paths';
import { loadApp } from './spec';
import { APPS, serveDist } from './static-server';

/**
 * Captura una vez la traza de cada variante del benchmark y la guarda en disco.
 *
 *   pnpm --filter @a11y-lab/benchmark capture-all [--force] [app]
 *
 * Existe por una medición del piloto: con cuatro modelos, el ejecutor que
 * recaptura las trazas pasa la mayor parte del tiempo abriendo navegadores y no
 * infiriendo. La captura de una variante es idéntica para las tres estrategias y
 * para los cuatro modelos, de modo que repetirla es trabajo puro.
 *
 * Separar la captura de la inferencia tiene tres consecuencias útiles más allá
 * del tiempo. El análisis puede recalcularse sin navegador. La traza queda como
 * dato crudo publicable, que es lo que el capítulo compromete. Y un fallo de
 * captura se distingue de un fallo de inferencia, porque ocurren en etapas
 * distintas.
 *
 * Las trazas son regenerables a partir del repositorio y del navegador fijado,
 * así que no se versionan; los resultados de inferencia sí.
 */

ignoreBrokenPipe();

const PORT = 5392;
const force = process.argv.includes('--force');
const only = process.argv.slice(2).find((arg) => !arg.startsWith('--'));

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const server = await serveDist(PORT);
const browser = await launchChromium();

let captured = 0;
let skipped = 0;
let reported = false;

try {
  const dirs = (await readdir(APPS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .filter((name) => !only || name === only)
    .sort();

  for (const app of dirs) {
    const spec = await loadApp(app);
    const scenario: Scenario = { id: app, steps: spec.scenario.steps };

    for (const variant of spec.variants) {
      const path = tracePath(app, variant.id);
      if (!force && (await exists(path))) {
        skipped += 1;
        continue;
      }

      const trace: Trace = await captureTrace(browser, {
        url: `${server.origin}/?app=${app}&variant=${variant.id}`,
        scenario,
      });

      if (!reported) {
        await reportEnvironment(trace);
        console.log('');
        reported = true;
      }

      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(trace)}\n`, 'utf8');
      captured += 1;
      process.stderr.write(`  ${app}/${variant.id}\n`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log('');
console.log(`${captured} trazas capturadas, ${skipped} ya estaban en disco.`);
if (skipped > 0 && !force) {
  console.log('Usá --force para recapturar: hacelo siempre que cambie el instrumento de captura.');
}
console.log(`Destino: ${TRACES}`);
