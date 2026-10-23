import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { captureTrace, diffTraces, normalize } from '@a11y-lab/framework';
import type { IdentityMode, Scenario, Trace } from '@a11y-lab/framework';
import { launchChromium } from './browser';
import { APPS, serveDist } from './static-server';

/**
 * Experimento de ruido y señal.
 *
 * Mide dos cosas sobre la misma captura:
 *
 *  - **Piso de ruido**: cuánto difieren entre sí varias repeticiones de la
 *    MISMA versión. Es variación que no viene de ningún defecto.
 *  - **Señal**: cuánto difiere la base de cada variante mutante.
 *
 * La señal solo es interpretable por encima del ruido. Si una mutación produce
 * menos divergencia que dos corridas idénticas, el enfoque diferencial no puede
 * detectarla y eso es un límite del método, no un fallo del modelo.
 *
 * Además evalúa las tres formas de identificar elementos sobre las mismas
 * trazas capturadas, de modo que la decisión de normalización se tome con datos
 * y en una sola corrida.
 */

const PORT = 5398;
const IDENTITIES: IdentityMode[] = ['structural', 'semantic', 'both'];

interface VariantSpec {
  id: string;
  kind: 'base' | 'mutant';
  label?: 'positive' | 'negative';
  wcag?: string[];
  groundTruth?: { regression: boolean };
}

interface AppFile {
  id: string;
  title: string;
  scenario: Scenario & { note?: string };
  variants: VariantSpec[];
}

const appId = process.argv[2] ?? 'a01-landing';
const repetitions = Number(process.argv[3] ?? 3);

const app = JSON.parse(
  await readFile(join(APPS, appId, 'app.json'), 'utf8')
) as AppFile;
const scenario: Scenario = { id: app.scenario.id ?? appId, steps: app.scenario.steps };

const server = await serveDist(PORT);
const browser = await launchChromium();

function url(variant: string): string {
  return `${server.origin}/?app=${appId}&variant=${variant}`;
}

function divergence(left: Trace, right: Trace, identity: IdentityMode): number {
  return diffTraces(normalize(left, { identity }), normalize(right, { identity })).eventDivergence;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`.padStart(7);
}

try {
  console.log(`App: ${app.id} — ${app.title}`);
  console.log(`Escenario: ${scenario.steps.length} pasos${app.scenario.provisional ? ' (provisional)' : ''}`);
  console.log(`Repeticiones de la base: ${repetitions}`);
  console.log('');

  // --- Piso de ruido -------------------------------------------------------
  const baseRuns: Trace[] = [];
  for (let run = 1; run <= repetitions; run += 1) {
    baseRuns.push(await captureTrace(browser, { url: url('base'), scenario, repetition: run }));
  }

  const eventCount = baseRuns[0].steps.reduce((sum, step) => sum + step.events.length, 0);
  const axCount = baseRuns[0].steps.reduce((sum, step) => sum + step.ax.length, 0);
  console.log(`Traza de la base: ${eventCount} eventos, ${axCount} nodos de árbol por paso acumulados`);
  console.log('');

  console.log('PISO DE RUIDO — base contra base');
  console.log('  identidad     mínimo  mediana  máximo');
  for (const identity of IDENTITIES) {
    const values: number[] = [];
    for (let i = 0; i < baseRuns.length; i += 1) {
      for (let j = i + 1; j < baseRuns.length; j += 1) {
        values.push(divergence(baseRuns[i], baseRuns[j], identity));
      }
    }
    values.sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)] ?? 0;
    console.log(
      `  ${identity.padEnd(12)}${percent(values[0] ?? 0)} ${percent(median)} ${percent(values.at(-1) ?? 0)}`
    );
  }
  console.log('');

  // --- Señal ---------------------------------------------------------------
  console.log('SEÑAL — base contra cada variante');
  console.log('  variante                 esperado    structural  semantic  both     pasos con diff');

  const reference = baseRuns[0];
  for (const variant of app.variants.filter((entry) => entry.kind === 'mutant')) {
    const trace = await captureTrace(browser, { url: url(variant.id), scenario });
    const expected = variant.groundTruth?.regression ? 'regresión' : 'limpio';
    const columns = IDENTITIES.map((identity) => percent(divergence(reference, trace, identity))).join(' ');
    const changed = diffTraces(normalize(reference), normalize(trace)).changedSteps;
    console.log(
      `  ${variant.id.padEnd(24)} ${expected.padEnd(11)}${columns}   [${changed.join(', ')}]`
    );
  }

  console.log('');
  console.log('Lectura: el control negativo debería dar 0% en la identidad correcta.');
  console.log('Si da más que el piso de ruido, la normalización todavía no sirve.');
} finally {
  await browser.close();
  server.close();
}
