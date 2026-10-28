import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { captureTrace, diffTraces, normalize } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import {
  buildEvidence,
  buildPrompt,
  buildProviders,
  loadConfig,
  parseVerdict,
  scoreVerdict,
} from '@a11y-lab/analysis';
import type { Category, EvidenceFormat, Provider, Score } from '@a11y-lab/analysis';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
import { leftOf, loadApp, mutantsOf } from './spec';
import { serveDist } from './static-server';

/**
 * Piloto que decide el formato de la evidencia por medición.
 *
 *   pnpm --filter @a11y-lab/benchmark pilot-format [idDelModelo]
 *
 * Es la misma forma en que se decidió la identidad semántica en la fase 3: dos
 * alternativas defendibles, una medición acotada y la que mide mejor gana. La
 * alternativa era elegir por intuición y defenderla ante el jurado sin dato.
 *
 * CRITERIO DECLARADO ANTES DE MEDIR, en este orden:
 *
 *   1. más veredictos binarios correctos;
 *   2. si empatan, más exactitud de categoría en los positivos acertados;
 *   3. si empatan, más localizaciones exactas de la transición;
 *   4. si empatan, menos tokens de prompt.
 *
 * Declararlo acá y no después es lo que impide racionalizar el resultado. Si los
 * dos formatos empatan en los cuatro criterios, gana `lines` por ser el más
 * barato, y eso también queda dicho de antemano.
 *
 * ALCANCE: diez pares, un modelo, la estrategia `trace-diff`, dos repeticiones.
 * No es un resultado del estudio y no va al capítulo 4: es una decisión de
 * instrumento, y con diez pares el intervalo de confianza de cualquier
 * proporción es inservible para contrastar hipótesis.
 */

ignoreBrokenPipe();

const PORT = 5393;
const FORMATS: EvidenceFormat[] = ['lines', 'json'];
const REPETITIONS = 2;

/**
 * Submuestra declarada, no aleatoria.
 *
 * Cubre los seis operadores, los tres estratos y tres de las cuatro clases. Los
 * dos benignos son los dos más discutibles del benchmark: uno cambia un nombre
 * accesible y el otro suma un punto de tabulación, que son las dos señales que
 * un detector ingenuo usaría para afirmar una regresión.
 *
 * Es declarada para que el piloto sea reproducible y para que la elección de
 * pares no dependa de una semilla que nadie revisa.
 */
const SUBSAMPLE: { app: string; variant: string }[] = [
  { app: 'a01-landing', variant: 'm01-kbd-activation' },
  { app: 'a02-piscina', variant: 'm01-cto-slot-tab-order' },
  { app: 'a03-panel', variant: 'm04-ccs-focus-steal' },
  { app: 'a05-blog', variant: 'm02-ccb-search-on-blur' },
  { app: 'a06-equipo', variant: 'm01-focus-loss-row-removal' },
  { app: 'a10-tramites', variant: 'm06-status-silent' },
  { app: 'a06-equipo', variant: 'n01-benign-better-label' },
  { app: 'a09-tienda', variant: 'n01-benign-extra-disclosure' },
  { app: 'a04-multipaso', variant: 'p01-preexisting-cto-defect' },
  { app: 'a10-tramites', variant: 'p01-preexisting-cto-defect' },
];

interface Record_ {
  app: string;
  variant: string;
  label: string;
  format: EvidenceFormat;
  repetition: number;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  raw: string;
  issues: string[];
  parsed: boolean;
  score: Score | null;
  /** Motivo por el que la llamada no llegó a producir respuesta. */
  error?: string;
}

const config = await loadConfig();
const providers = buildProviders(config);
const wanted = process.argv[2];
const provider: Provider | undefined = wanted
  ? providers.find((entry) => entry.id === wanted)
  : providers[0];

if (!provider) {
  console.error(
    wanted
      ? `No hay ningún modelo con id "${wanted}". Declarados: ${providers.map((p) => p.id).join(', ')}`
      : 'No hay modelos declarados en analysis.config.json.'
  );
  process.exit(1);
}

console.log(`Piloto de formato de evidencia · modelo ${provider.label} (${provider.id})`);
console.log(`Estrategia: trace-diff · ${SUBSAMPLE.length} pares · ${REPETITIONS} repeticiones`);
console.log('');

const server = await serveDist(PORT);
const browser = await launchChromium();
const records: Record_[] = [];

try {
  for (const entry of SUBSAMPLE) {
    const spec = await loadApp(entry.app);
    const variant = mutantsOf(spec).find((candidate) => candidate.id === entry.variant);
    if (!variant) {
      console.error(`${entry.app}/${entry.variant} no existe en app.json`);
      process.exit(1);
    }

    const scenario: Scenario = { id: entry.app, steps: spec.scenario.steps };
    const run = (id: string): Promise<Trace> =>
      captureTrace(browser, {
        url: `${server.origin}/?app=${entry.app}&variant=${id}`,
        scenario,
      });

    const base = await run(leftOf(variant));
    const modified = await run(variant.id);
    const diff = diffTraces(normalize(base), normalize(modified));

    const truth = {
      regression: variant.groundTruth?.regression ?? false,
      category: (variant.groundTruth?.category ?? null) as Category | null,
      expectedStep: variant.groundTruth?.expectedStep ?? null,
      evidenceSteps: diff.evidenceSteps,
    };

    for (const format of FORMATS) {
      const evidence = buildEvidence('trace-diff', { base, modified, scenario }, format);
      const prompt = buildPrompt({ appTitle: spec.title, evidence });

      for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
        const common = {
          app: entry.app,
          variant: variant.id,
          label: variant.label ?? 'sin clase',
          format,
          repetition,
        };

        // Una llamada que falla se REGISTRA y la corrida sigue.
        //
        // Antes esto lanzaba y abortaba el piloto completo, y con phi3.5 ocurrió
        // en el segundo par: veinte minutos de capturas perdidos por una
        // respuesta cortada por longitud. En una corrida de setecientas sesenta y
        // ocho inferencias es inadmisible, y además el fallo es un dato: un
        // modelo que se corta o que no responde a tiempo tiene una propiedad que
        // merece su propia cifra, no un apagón.
        let result;
        try {
          result = await provider.complete(prompt);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          records.push({
            ...common,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: 0,
            raw: '',
            issues: [],
            parsed: false,
            score: null,
            error: detail,
          });
          process.stderr.write(`  !!  ${entry.app}/${variant.id}  ${format}  r${repetition}  ${detail}\n`);
          continue;
        }

        const parsed = parseVerdict(result.text);
        records.push({
          ...common,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          latencyMs: result.latencyMs,
          raw: result.text,
          issues: parsed.issues,
          parsed: parsed.verdict !== null,
          score: scoreVerdict(parsed.verdict, truth),
        });

        const score = records[records.length - 1]?.score;
        const mark = score === null ? '??' : score.detection ? 'OK' : 'NO';
        process.stderr.write(
          `  ${mark}  ${entry.app}/${variant.id}  ${format}  r${repetition}  ` +
            `${result.promptTokens} tok  ${Math.round(result.latencyMs / 100) / 10}s\n`
        );
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

// --- Resumen ---------------------------------------------------------------

function summarize(format: EvidenceFormat) {
  const subset = records.filter((row) => row.format === format);
  // Tres estados distintos que no se mezclan: la llamada falló y no hubo
  // respuesta; hubo respuesta y no se pudo interpretar; hubo veredicto.
  const failed = subset.filter((row) => row.error !== undefined);
  const scored = subset.filter((row) => row.score !== null);
  const detection = scored.filter((row) => row.score?.detection).length;
  const categories = scored.filter((row) => row.score?.category !== null);
  const categoryHits = categories.filter((row) => row.score?.category).length;
  const transitions = scored.filter((row) => row.score?.transition !== null);
  const transitionHits = transitions.filter((row) => row.score?.transition).length;
  const withinHits = transitions.filter((row) => row.score?.transitionWithinEvidence).length;
  const falsePositives = scored.filter((row) => row.score?.outcome === 'false-positive').length;
  const falseNegatives = scored.filter((row) => row.score?.outcome === 'false-negative').length;

  return {
    calls: subset.length,
    failed: failed.length,
    invalid: subset.length - scored.length - failed.length,
    formatIssues: subset.filter((row) => row.issues.length > 0).length,
    detection,
    detectionOf: scored.length,
    categoryHits,
    categoryOf: categories.length,
    transitionHits,
    withinHits,
    transitionOf: transitions.length,
    falsePositives,
    falseNegatives,
    tokens: Math.round(subset.reduce((sum, row) => sum + row.promptTokens, 0) / (subset.length || 1)),
    latency: Math.round(subset.reduce((sum, row) => sum + row.latencyMs, 0) / (subset.length || 1)),
  };
}

const summaries = new Map(FORMATS.map((format) => [format, summarize(format)]));

console.log('');
console.log('RESULTADO');
console.log('');
console.log('  formato  llamadas  falladas  inválidas  detección  categoría  transición  (en evidencia)  FP  FN  tok medios  latencia');
for (const format of FORMATS) {
  const s = summaries.get(format);
  if (!s) continue;
  console.log(
    `  ${format.padEnd(8)} ${String(s.calls).padStart(8)}  ${String(s.invalid).padStart(9)}  ` +
      `${`${s.detection}/${s.detectionOf}`.padStart(9)}  ${`${s.categoryHits}/${s.categoryOf}`.padStart(9)}  ` +
      `${`${s.transitionHits}/${s.transitionOf}`.padStart(10)}  ${`${s.withinHits}/${s.transitionOf}`.padStart(14)}  ` +
      `${String(s.falsePositives).padStart(2)}  ${String(s.falseNegatives).padStart(2)}  ` +
      `${String(s.tokens).padStart(10)}  ${String(Math.round(s.latency / 100) / 10).padStart(7)}s`
  );
}

// --- Consistencia entre repeticiones ---------------------------------------

const disagreements: string[] = [];
for (const entry of SUBSAMPLE) {
  for (const format of FORMATS) {
    const runs = records.filter(
      (row) => row.app === entry.app && row.variant === entry.variant && row.format === format
    );
    const verdicts = new Set(runs.map((row) => (row.score === null ? 'inválida' : row.score.outcome)));
    if (verdicts.size > 1) {
      disagreements.push(`${entry.app}/${entry.variant} ${format}: ${[...verdicts].join(' vs ')}`);
    }
  }
}

console.log('');
if (disagreements.length === 0) {
  console.log(`Consistencia: las ${REPETITIONS} repeticiones coinciden en los ${SUBSAMPLE.length * FORMATS.length} casos.`);
} else {
  console.log(`Consistencia: ${disagreements.length} casos con repeticiones discrepantes.`);
  for (const line of disagreements) console.log(`  - ${line}`);
  console.log('  Con temperatura y semilla fijas, la discrepancia es del servidor de inferencia.');
}

// --- Decisión según el criterio declarado ----------------------------------

const lines = summaries.get('lines');
const json = summaries.get('json');
let winner: EvidenceFormat = 'lines';
let reason = 'empate en los cuatro criterios; gana el formato más barato, como quedó declarado';

if (lines && json) {
  if (json.detection !== lines.detection) {
    winner = json.detection > lines.detection ? 'json' : 'lines';
    reason = `más veredictos correctos (${Math.max(json.detection, lines.detection)} contra ${Math.min(json.detection, lines.detection)})`;
  } else if (json.categoryHits !== lines.categoryHits) {
    winner = json.categoryHits > lines.categoryHits ? 'json' : 'lines';
    reason = 'empate en detección; decide la exactitud de categoría';
  } else if (json.transitionHits !== lines.transitionHits) {
    winner = json.transitionHits > lines.transitionHits ? 'json' : 'lines';
    reason = 'empate en detección y categoría; decide la localización de la transición';
  } else if (json.tokens !== lines.tokens) {
    winner = json.tokens < lines.tokens ? 'json' : 'lines';
    reason = `empate en los tres criterios de acierto; decide el costo (${Math.min(json.tokens, lines.tokens)} contra ${Math.max(json.tokens, lines.tokens)} tokens)`;
  }
}

console.log('');
console.log(`DECISIÓN: ${winner} — ${reason}.`);
console.log('');
console.log(`Anotá evidenceFormat: "${winner}" en packages/analysis/analysis.config.json.`);

const out = join(import.meta.dirname, '..', '..', '..', 'docs', 'piloto-formato');
await mkdir(out, { recursive: true });
await writeFile(
  join(out, `${provider.id}.json`),
  `${JSON.stringify({ provider: provider.id, subsample: SUBSAMPLE, records }, null, 2)}\n`,
  'utf8'
);
console.log(`Respuestas crudas y puntajes en docs/piloto-formato/${provider.id}.json`);
