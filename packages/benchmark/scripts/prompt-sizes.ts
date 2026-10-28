import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { captureTrace } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import { STRATEGIES, buildEvidence, buildPrompt } from '@a11y-lab/analysis';
import type { Strategy } from '@a11y-lab/analysis';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
import { APPS, serveDist } from './static-server';
import { leftOf, loadApp, mutantsOf } from './spec';

/**
 * Mide el tamaño de los prompts de las tres estrategias sobre los sesenta pares,
 * sin ejecutar una sola inferencia.
 *
 * Es la comprobación de viabilidad previa a la fase 7. Un prompt que no entra en
 * la ventana de contexto no produce un error: Ollama lo recorta en silencio y el
 * modelo responde sobre evidencia truncada, de modo que el resultado es un falso
 * negativo indistinguible de un fallo de detección. Descubrirlo después de
 * novecientas inferencias significa repetirlas.
 *
 *   pnpm --filter @a11y-lab/benchmark prompt-sizes
 */

ignoreBrokenPipe();

const PORT = 5394;

/**
 * Estimación de tokens por caracteres.
 *
 * Es deliberadamente conservadora: 3 caracteres por token, cuando en español
 * técnico la proporción real ronda 3,5 a 4. Lo que se busca acá no es una cifra
 * exacta —la real la devuelve Ollama en `prompt_eval_count`— sino decidir si un
 * par cabe. Una estimación optimista haría pasar pares que luego se recortan en
 * silencio, que es justamente el fallo que este script existe para evitar.
 */
const CHARS_PER_TOKEN = 3;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}


interface Row {
  app: string;
  stratum: string;
  variant: string;
  label: string;
  strategy: Strategy;
  tokens: number;
  lines: number;
  steps: number;
  pruned: boolean;
}

const server = await serveDist(PORT);
const browser = await launchChromium();
const rows: Row[] = [];

try {
  const dirs = (await readdir(APPS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();

  for (const app of dirs) {
    const spec = await loadApp(app);
    const scenario: Scenario = { id: app, steps: spec.scenario.steps };
    const url = (variant: string): string => `${server.origin}/?app=${app}&variant=${variant}`;
    const run = (variant: string): Promise<Trace> =>
      captureTrace(browser, { url: url(variant), scenario });

    const left = new Map<string, Trace>();

    for (const variant of mutantsOf(spec)) {
      const leftId = leftOf(variant);
      if (!left.has(leftId)) left.set(leftId, await run(leftId));
      const base = left.get(leftId) as Trace;
      const modified = await run(variant.id);
      for (const strategy of STRATEGIES) {
        const evidence = buildEvidence(strategy, { base, modified, scenario });
        const prompt = buildPrompt({ appTitle: spec.title, evidence });
        rows.push({
          app,
          stratum: spec.stratum,
          variant: variant.id,
          label: variant.label ?? 'sin etiqueta',
          strategy,
          tokens: estimateTokens(prompt.system) + estimateTokens(prompt.user),
          lines: evidence.lineCount,
          steps: evidence.includedSteps.length,
          pruned: evidence.pruned,
        });
      }
    }
    process.stderr.write(`  ${app} listo\n`);
  }
} finally {
  await browser.close();
  await server.close();
}

function stats(values: number[]): { min: number; median: number; max: number } {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0] ?? 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

console.log('');
console.log('TAMAÑO DE PROMPT POR ESTRATEGIA — tokens estimados, 3 caracteres por token');
console.log('');
console.log('  estrategia      pares   mínimo  mediana   máximo   pasos (mediana)');
for (const strategy of STRATEGIES) {
  const subset = rows.filter((row) => row.strategy === strategy);
  const tokens = stats(subset.map((row) => row.tokens));
  const steps = stats(subset.map((row) => row.steps));
  console.log(
    `  ${strategy.padEnd(14)} ${String(subset.length).padStart(5)}   ` +
      `${String(tokens.min).padStart(6)}  ${String(tokens.median).padStart(7)}  ` +
      `${String(tokens.max).padStart(7)}   ${String(steps.median).padStart(6)}`
  );
}

console.log('');
console.log('MÁXIMO POR ESTRATO Y ESTRATEGIA');
console.log('');
console.log('  estrato   static   state-diff   trace-diff');
for (const stratum of ['small', 'medium', 'large']) {
  const cell = (strategy: Strategy): string => {
    const subset = rows.filter((row) => row.stratum === stratum && row.strategy === strategy);
    return String(stats(subset.map((row) => row.tokens)).max).padStart(6);
  };
  console.log(
    `  ${stratum.padEnd(9)} ${cell('static')}   ${cell('state-diff')}       ${cell('trace-diff')}`
  );
}

const worst = [...rows].sort((a, b) => b.tokens - a.tokens).slice(0, 8);
console.log('');
console.log('LOS OCHO PARES MÁS GRANDES');
console.log('');
for (const row of worst) {
  console.log(
    `  ${String(row.tokens).padStart(6)} tok  ${row.app}/${row.variant}  ${row.strategy}` +
      `  (${row.steps} pasos, ${row.lines} líneas${row.pruned ? ', podado' : ', sin podar'})`
  );
}

const CONTEXT = 32768;
// Se reserva margen para la respuesta y para la diferencia entre la estimación
// conservadora y el tokenizador real de cada modelo.
const BUDGET = CONTEXT - 2048;
const over = rows.filter((row) => row.tokens > BUDGET);
console.log('');
if (over.length === 0) {
  console.log(`Los ${rows.length} prompts entran en ${CONTEXT} tokens con margen para la respuesta.`);
} else {
  console.log(`${over.length} prompts de ${rows.length} NO entran en ${BUDGET} tokens útiles:`);
  for (const row of over) {
    console.log(`  ${row.app}/${row.variant}  ${row.strategy}  ${row.tokens} tok`);
  }
}

await writeFile(
  join(APPS, '..', 'prompt-sizes.json'),
  `${JSON.stringify(rows, null, 2)}\n`,
  'utf8'
);
console.log('');
console.log('Detalle por par en packages/benchmark/prompt-sizes.json');
