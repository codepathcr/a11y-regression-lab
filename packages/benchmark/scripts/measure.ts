import { captureTrace, diffTraces, normalize } from '@a11y-lab/framework';
import type { IdentityMode, Scenario, Trace } from '@a11y-lab/framework';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
import { reportEnvironment } from './environment';
import { serveDist } from './static-server';
import { leftOf, loadApp, mutantsOf } from './spec';

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

ignoreBrokenPipe();

const PORT = 5398;
const IDENTITIES: IdentityMode[] = ['structural', 'semantic', 'both'];


const appId = process.argv[2] ?? 'a01-landing';
const repetitions = Number(process.argv[3] ?? 3);

const app = await loadApp(appId);
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

  await reportEnvironment(baseRuns[0]);

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
  console.log('SEÑAL — cada par contra su lado izquierdo (identidad semántica)');
  console.log('  variante                      esperado    eventos  árbol   pasos con diff        pasos de árbol');

  // Cada par se compara contra su propio lado izquierdo. Para casi todos es
  // `base`, y para la clase `preexisting` es una variante defectuosa: comparar
  // ese par contra `base` mediría el defecto previo y el cambio benigno juntos,
  // que es justamente lo que la clase existe para separar.
  const left = new Map<string, Trace>([['base', baseRuns[0]]]);

  for (const variant of mutantsOf(app)) {
    const leftId = leftOf(variant);
    if (!left.has(leftId)) {
      left.set(leftId, await captureTrace(browser, { url: url(leftId), scenario }));
    }
    const reference = left.get(leftId) as Trace;
    const trace = await captureTrace(browser, { url: url(variant.id), scenario });
    const expected = variant.groundTruth?.regression
      ? 'regresión'
      : variant.label === 'negative'
        ? 'limpio'
        : 'benigno';
    const diff = diffTraces(normalize(reference), normalize(trace));
    console.log(
      `  ${variant.id.padEnd(29)} ${expected.padEnd(11)}${percent(diff.eventDivergence)} ${percent(
        diff.axDivergence
      )}  [${diff.changedSteps.join(', ')}]`.padEnd(100) + `[${diff.axChangedSteps.join(', ')}]`
    );
  }

  console.log('');
  console.log('Eventos = el comportamiento observable. Árbol = el estado resultante.');
  console.log('Los dos cuentan: la evidencia que se entrega al modelo es la unión de ambos conjuntos de pasos.');
} finally {
  await browser.close();
  server.close();
}
