import { appendFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { diffTraces, normalize } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import {
  STRATEGIES,
  SYSTEM_PROMPT,
  ScriptedProvider,
  buildEvidence,
  buildPrompt,
  buildProviders,
  loadConfig,
  parseVerdict,
  scoreVerdict,
} from '@a11y-lab/analysis';
import type { Category, Provider, Score, Strategy } from '@a11y-lab/analysis';
import { ignoreBrokenPipe } from './io';
import { RESULTS, tracePath } from './paths';
import { leftOf, loadApp, mutantsOf } from './spec';
import type { VariantSpec } from './spec';
import { APPS } from './static-server';

/**
 * Ejecuta el experimento: cada par del benchmark contra cada estrategia y cada
 * modelo, con el esquema de repeticiones declarado en 3.4.
 *
 *   pnpm --filter @a11y-lab/benchmark run-analysis [--block full|subsample] [modelo]
 *
 * Cuatro propiedades que no son adornos:
 *
 *  1. **Las trazas se leen de disco.** La captura es idéntica para las tres
 *     estrategias y los cuatro modelos; recapturarla por modelo fue el cuello de
 *     botella del piloto. Correr `capture-all` es requisito previo.
 *  2. **Orden por modelo y no por par.** Ollama carga y descarga pesos al
 *     cambiar de modelo; por par serían cientos de cambios, por modelo son tres.
 *  3. **Persistencia incremental.** Cada llamada se escribe en el acto en un
 *     JSONL, y al arrancar se saltan las combinaciones ya hechas. Una corrida
 *     interrumpida se reanuda donde quedó. Sin esto, una caída a mitad de la
 *     corrida cuesta la corrida entera.
 *  4. **Una llamada que falla se registra y la corrida sigue.** El fallo es un
 *     dato sobre el modelo, no una avería del experimento.
 */

ignoreBrokenPipe();

/** Reintentos solo para fallos de transporte. Un corte por longitud es
 *  determinista con semilla fija y reintentarlo solo gasta tiempo. */
const TRANSPORT_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

type Block = 'full' | 'subsample';

interface ResultRow {
  app: string;
  variant: string;
  label: string;
  stratum: string;
  leftVariant: string;
  strategy: Strategy;
  model: string;
  repetition: number;
  /** Quién resolvió el caso: la compuerta determinista o el modelo. */
  resolvedBy: 'gate' | 'model';
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  evidenceSteps: number[];
  raw: string;
  issues: string[];
  score: Score | null;
  error?: string;
  at: string;
  /**
   * Huella de la configuración que produjo esta fila.
   *
   * Existe por un incidente concreto: una corrida lanzada horas antes siguió
   * ejecutándose mientras se corregían la ventana de contexto, el formato de la
   * evidencia y el tiempo de vida del modelo, y escribió en el mismo archivo que
   * las corridas nuevas. El resultado fue una bitácora con doscientas una claves
   * duplicadas producidas bajo configuraciones distintas y **sin forma de
   * distinguirlas**, que hubo que descartar entera.
   *
   * Una bitácora que no dice bajo qué condiciones se produjo cada fila no es una
   * bitácora: es un montón de números. Con la huella, una mezcla se detecta y se
   * filtra en lugar de invalidar el conjunto.
   */
  config: {
    evidenceFormat: string;
    numCtx: number;
    numPredict: number;
    charsPerToken: number;
    temperature: number;
    seed: number;
    /** Resumen del enunciado del sistema, que fija la plantilla usada. */
    systemHash: string;
  };
}

function keyOf(row: {
  app: string;
  variant: string;
  strategy: string;
  model: string;
  repetition: number;
}): string {
  return `${row.app}|${row.variant}|${row.strategy}|${row.model}|${row.repetition}`;
}

const otherConfigs = new Set<string>();

async function loadDone(path: string): Promise<Set<string>> {
  const done = new Set<string>();
  try {
    const stream = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of stream) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as ResultRow;
        done.add(keyOf(row));
        if (row.config) otherConfigs.add(JSON.stringify(row.config));
      } catch {
        // Una línea truncada por una caída a mitad de escritura se ignora y la
        // combinación se vuelve a ejecutar, que es el comportamiento correcto.
      }
    }
  } catch {
    // Primera corrida: todavía no hay archivo.
  }
  return done;
}

async function readTrace(app: string, variant: string): Promise<Trace> {
  try {
    return JSON.parse(await readFile(tracePath(app, variant), 'utf8')) as Trace;
  } catch {
    throw new Error(
      `Falta la traza de ${app}/${variant}. Corré primero: pnpm --filter @a11y-lab/benchmark capture-all`
    );
  }
}

const args = process.argv.slice(2);
const blockArg = args.indexOf('--block');
const block: Block = blockArg === -1 ? 'full' : ((args[blockArg + 1] ?? 'full') as Block);
const wantedModel = args.find(
  (arg, index) => !arg.startsWith('--') && args[index - 1] !== '--block' && args[index - 1] !== '--strategy'
);

/** Permite correr una sola estrategia. Sirve para diagnosticar: las dos
 *  diferenciales producen prompts pequenos y la de una sola version los mas
 *  grandes del benchmark, de modo que un problema de capacidad del servidor de
 *  inferencia se aisla corriendo primero la mas barata. */
const strategyArg = args.indexOf('--strategy');
const onlyStrategy = strategyArg === -1 ? null : (args[strategyArg + 1] as Strategy | undefined) ?? null;
if (onlyStrategy !== null && !STRATEGIES.includes(onlyStrategy)) {
  console.error(`--strategy debe ser una de: ${STRATEGIES.join(', ')}`);
  process.exit(1);
}

/**
 * Corte temprano: si las primeras llamadas fallan todas y ninguna ha tenido
 * exito, la corrida se detiene en lugar de insistir.
 *
 * Existe porque la primera corrida real agoto el timeout tres veces sobre la
 * primera llamada. Con el timeout de entonces, cada llamada fallida costaba doce
 * minutos, y doscientas doce llamadas asi son dos dias de nada. El peor resultado
 * posible de un ejecutor no es fallar: es tardar horas en fallar.
 */
const EARLY_ABORT_AFTER = 3;

const dry = args.includes('--dry');

const config = await loadConfig();

/**
 * Corrida en seco: el ejecutor completo contra un proveedor de guion, sin red y
 * sin modelo.
 *
 * Verifica lo que no tiene que ver con la calidad de las respuestas y que es
 * justamente donde un ejecutor falla: que la compuerta determinista registre los
 * casos sin divergencia, que la reanudación salte lo ya hecho, que el JSONL
 * quede bien formado, que las cuatro clases de par se puntúen como corresponde.
 * Descubrir cualquiera de esas cosas a mitad de una corrida real cuesta la
 * corrida.
 *
 * El guion alterna un veredicto afirmativo y uno negativo, de modo que la
 * corrida en seco produce las cuatro celdas de la matriz de confusión y ejercita
 * las ramas de puntaje de categoría y localización.
 */
const DRY_SCRIPT = [
  '{"regression": true, "category": "orden y continuidad del foco", "transitionStep": 3, "evidence": "guion"}',
  '{"regression": false, "category": null, "transitionStep": null, "evidence": "guion"}',
];

/**
 * Ventana útil: lo que queda para el prompt después de reservar la respuesta.
 *
 * La comprobación previa por par existe porque un prompt que excede la ventana
 * no se recorta en silencio, como se creía al redactar las amenazas a la
 * validez. El motor desplaza el contexto y reevalúa en bucle: la llamada no
 * termina, y el timeout del cliente NO cancela el trabajo del servidor. Una sola
 * llamada desbordada deja la cola de inferencia inservible para todas las
 * siguientes, y los reintentos la empeoran.
 *
 * De ahí que el caso se resuelva sin enviar nada. Un par que no entra se
 * registra como no evaluable por ventana de contexto, que es un resultado
 * legítimo y reportable: dice que esa estrategia no es aplicable a ese par en
 * ese hardware.
 */
const contextBudget =
  (config.providers['ollama']?.options.num_ctx ?? config.minContextTokens) -
  config.responseReserveTokens;

function projectedTokens(prompt: { system: string; user: string }): number {
  return Math.ceil((prompt.system.length + prompt.user.length) / config.charsPerToken);
}

const providers = dry
  ? [new ScriptedProvider('guion', 'Proveedor de guion', DRY_SCRIPT)]
  : buildProviders(config);
const models: Provider[] = wantedModel
  ? providers.filter((entry) => entry.id === wantedModel)
  : providers;

if (models.length === 0) {
  console.error(
    `No hay modelos para correr. Declarados: ${providers.map((entry) => entry.id).join(', ')}`
  );
  process.exit(1);
}

// --- Qué pares entran, según el bloque ------------------------------------

interface Pair {
  app: string;
  stratum: string;
  title: string;
  scenario: Scenario;
  variant: VariantSpec;
}

const pairs: Pair[] = [];

if (block === 'subsample') {
  const spec = JSON.parse(
    await readFile(join(APPS, '..', 'subsample.json'), 'utf8')
  ) as { pairs: { app: string; variant: string }[] };
  for (const entry of spec.pairs) {
    const app = await loadApp(entry.app);
    const variant = mutantsOf(app).find((candidate) => candidate.id === entry.variant);
    if (!variant) throw new Error(`subsample.json nombra ${entry.app}/${entry.variant}, que no existe`);
    pairs.push({
      app: entry.app,
      stratum: app.stratum,
      title: app.title,
      scenario: { id: entry.app, steps: app.scenario.steps },
      variant,
    });
  }
} else {
  const dirs = (await readdir(APPS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
  for (const name of dirs) {
    const app = await loadApp(name);
    for (const variant of mutantsOf(app)) {
      pairs.push({
        app: name,
        stratum: app.stratum,
        title: app.title,
        scenario: { id: name, steps: app.scenario.steps },
        variant,
      });
    }
  }
}

const repetitions = block === 'subsample' ? config.repetitions.subsample : config.repetitions.full;

await mkdir(RESULTS, { recursive: true });
const out = join(RESULTS, `${dry ? 'dry-' : ''}${block}.jsonl`);

/**
 * Cerrojo por archivo de salida.
 *
 * Dos corridas escribiendo la misma bitácora producen claves duplicadas bajo
 * configuraciones distintas, y eso ya ocurrió: una corrida olvidada siguió
 * ejecutándose durante dos horas y contaminó el archivo de las nuevas. El
 * cerrojo guarda el identificador del proceso, de modo que un cerrojo huérfano
 * de un proceso muerto se puede retirar a mano con conocimiento de causa.
 */
const lock = `${out}.lock`;

/** Si el proceso que dejó el cerrojo sigue vivo. La señal 0 no se entrega: solo
 *  comprueba la existencia del proceso. */
function alive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM significa que existe y es de otro usuario; ESRCH que no existe.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

try {
  const holder = Number.parseInt((await readFile(lock, 'utf8')).trim(), 10);
  if (alive(holder)) {
    console.error(`Ya hay una corrida escribiendo ${out} (proceso ${holder}, vivo).`);
    console.error('Esperá a que termine, o matala con:');
    console.error(`  kill ${holder}`);
    process.exit(1);
  }
  // Cerrojo huérfano: el proceso que lo dejó ya no existe, de modo que se toma.
  console.log(`Cerrojo huérfano del proceso ${holder}, que ya no existe: se retoma.`);
  await rm(lock, { force: true });
} catch (error) {
  // Sin cerrojo previo, o ilegible: se crea.
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) {
    // Un cerrojo con contenido inesperado no debe impedir la corrida.
  }
}
await writeFile(lock, `${process.pid}\n`, 'utf8');

/**
 * La liberación del cerrojo es SINCRÓNICA.
 *
 * La primera versión usaba `rm` asíncrono dentro del manejador de `exit`, y un
 * manejador de salida no espera promesas: el proceso termina antes de que la
 * operación corra. El cerrojo sobrevivía a la corrida y bloqueaba las
 * siguientes, que es exactamente lo que ocurrió — tres modelos no se ejecutaron
 * porque el cerrojo de un cuarto ya terminado seguía ahí.
 */
function releaseLock(): void {
  try {
    rmSync(lock, { force: true });
  } catch {
    // Si no se puede borrar, el cerrojo huérfano se detecta por el pid.
  }
}
process.on('exit', releaseLock);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    releaseLock();
    process.exit(130);
  });
}

const ollamaOptions = config.providers['ollama']?.options ?? {};
const runConfig = {
  evidenceFormat: config.evidenceFormat,
  numCtx: Number(ollamaOptions.num_ctx ?? 0),
  numPredict: Number(ollamaOptions.num_predict ?? 0),
  charsPerToken: config.charsPerToken,
  temperature: Number(ollamaOptions.temperature ?? 0),
  seed: Number(ollamaOptions.seed ?? 0),
  systemHash: createHash('sha256').update(SYSTEM_PROMPT).digest('hex').slice(0, 12),
};

const done = await loadDone(out);

console.log(`Bloque: ${block} · ${pairs.length} pares · ${repetitions} repeticiones`);
console.log(`Modelos: ${models.map((entry) => entry.id).join(', ')}`);
console.log(`Formato de evidencia: ${config.evidenceFormat}`);
console.log(
  `Ventana util: ${contextBudget} tokens (num_ctx ${config.providers['ollama']?.options.num_ctx} ` +
    `menos ${config.responseReserveTokens} de reserva) · proyeccion a ${config.charsPerToken} car/token`
);
if (dry) console.log('CORRIDA EN SECO: respuestas de guion, sin modelo. Las cifras no significan nada.');
console.log(`Bitácora: ${out}`);
console.log(`Huella de configuración: ${JSON.stringify(runConfig)}`);
if (done.size > 0) {
  console.log(`Ya registradas: ${done.size} llamadas; se reanuda donde quedó.`);
  const foreign = [...otherConfigs].filter((entry) => entry !== JSON.stringify(runConfig));
  if (foreign.length > 0) {
    console.error('');
    console.error(`ATENCIÓN: la bitácora ya contiene filas de ${foreign.length} configuración(es) distinta(s).`);
    console.error('Las cifras de un archivo que mezcla configuraciones no son comparables.');
    console.error(`Archivá ${out} y empezá de nuevo, o filtrá por el campo config al analizar.`);
  }
}
console.log('');

// --- Evidencia por par y estrategia, calculada una sola vez ---------------

interface Prepared {
  pair: Pair;
  truth: { regression: boolean; category: Category | null; expectedStep: number | null; evidenceSteps: number[] };
  byStrategy: Map<Strategy, { system: string; user: string; evidenceSteps: number[]; gated: boolean }>;
}

const prepared: Prepared[] = [];

for (const pair of pairs) {
  const base = await readTrace(pair.app, leftOf(pair.variant));
  const modified = await readTrace(pair.app, pair.variant.id);
  const diff = diffTraces(normalize(base), normalize(modified));

  const byStrategy = new Map<Strategy, { system: string; user: string; evidenceSteps: number[]; gated: boolean }>();
  for (const strategy of STRATEGIES) {
    const evidence = buildEvidence(
      strategy,
      { base, modified, scenario: pair.scenario },
      config.evidenceFormat
    );
    const prompt = buildPrompt({ appTitle: pair.title, evidence });
    byStrategy.set(strategy, {
      ...prompt,
      evidenceSteps: evidence.includedSteps,
      gated: evidence.gated,
    });
  }

  prepared.push({
    pair,
    truth: {
      regression: pair.variant.groundTruth?.regression ?? false,
      category: (pair.variant.groundTruth?.category ?? null) as Category | null,
      expectedStep: pair.variant.groundTruth?.expectedStep ?? null,
      evidenceSteps: diff.evidenceSteps,
    },
    byStrategy,
  });
}

console.log(`Evidencia preparada para ${prepared.length} pares, sin abrir el navegador.`);
console.log('');

// --- Ejecución -------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isTransport(message: string): boolean {
  return /no respondió en|fetch failed|ECONNRESET|socket hang up|respondió 5\d\d/i.test(message);
}

let calls = 0;
let failures = 0;
let gated = 0;
let successes = 0;
let consecutiveFailures = 0;
let abortReason: string | null = null;
const started = Date.now();

for (const provider of models) {
  for (const entry of prepared) {
    const { pair, truth, byStrategy } = entry;

    for (const strategy of STRATEGIES) {
      if (onlyStrategy !== null && strategy !== onlyStrategy) continue;
      const prompt = byStrategy.get(strategy);
      if (!prompt) continue;

      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        const common = {
          app: pair.app,
          variant: pair.variant.id,
          label: pair.variant.label ?? 'sin clase',
          stratum: pair.stratum,
          leftVariant: leftOf(pair.variant),
          strategy,
          model: provider.id,
          repetition,
          evidenceSteps: prompt.evidenceSteps,
          config: runConfig,
        };

        if (done.has(keyOf(common))) continue;

        // La compuerta determinista: sin divergencia no hay nada que analizar y
        // no se gasta una inferencia. Se registra con resolvedBy "gate" para que
        // el Capítulo 4 pueda reportar la matriz de confusión con la compuerta y
        // sin ella, que son dos cifras distintas y las dos informativas.
        if (prompt.gated) {
          const verdict = { regression: false, category: null, transitionStep: null, evidence: '' };
          const row: ResultRow = {
            ...common,
            resolvedBy: 'gate',
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: 0,
            raw: '',
            issues: [],
            score: scoreVerdict(verdict, truth),
            at: new Date().toISOString(),
          };
          await appendFile(out, `${JSON.stringify(row)}\n`, 'utf8');
          done.add(keyOf(common));
          gated += 1;
          continue;
        }

        const projected = projectedTokens(prompt);
        if (projected > contextBudget) {
          const row: ResultRow = {
            ...common,
            resolvedBy: 'model',
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: 0,
            raw: '',
            issues: [],
            score: null,
            error:
              `no evaluable por ventana de contexto: el prompt proyecta ${projected} tokens y la ` +
              `ventana util es ${contextBudget}`,
            at: new Date().toISOString(),
          };
          await appendFile(out, `${JSON.stringify(row)}\n`, 'utf8');
          done.add(keyOf(common));
          calls += 1;
          failures += 1;
          process.stderr.write(
            `  >>  ${provider.id}  ${pair.app}/${pair.variant.id}  ${strategy}  r${repetition}  ` +
              `no entra: ${projected} tok proyectados sobre ${contextBudget}\n`
          );
          continue;
        }

        let attempt = 0;
        let row: ResultRow | null = null;

        while (row === null) {
          try {
            const result = await provider.complete({ system: prompt.system, user: prompt.user });
            const parsed = parseVerdict(result.text);
            row = {
              ...common,
              resolvedBy: 'model',
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              latencyMs: result.latencyMs,
              raw: result.text,
              issues: parsed.issues,
              score: scoreVerdict(parsed.verdict, truth),
              at: new Date().toISOString(),
            };
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            if (isTransport(detail) && attempt < TRANSPORT_RETRIES) {
              attempt += 1;
              process.stderr.write(`  ..  reintento ${attempt} de ${TRANSPORT_RETRIES}: ${detail}\n`);
              await sleep(RETRY_DELAY_MS);
              continue;
            }
            row = {
              ...common,
              resolvedBy: 'model',
              promptTokens: 0,
              completionTokens: 0,
              latencyMs: 0,
              raw: '',
              issues: [],
              score: null,
              error: detail,
              at: new Date().toISOString(),
            };
            failures += 1;
          }
        }

        if (row.error === undefined) {
          successes += 1;
          consecutiveFailures = 0;
        } else {
          consecutiveFailures += 1;
          if (successes === 0 && consecutiveFailures >= EARLY_ABORT_AFTER) {
            abortReason =
              `las primeras ${consecutiveFailures} llamadas fallaron y ninguna tuvo exito. ` +
              `Ultimo motivo: ${row.error}`;
          }
        }

        await appendFile(out, `${JSON.stringify(row)}\n`, 'utf8');
        done.add(keyOf(common));
        calls += 1;

        const mark = row.error ? '!!' : row.score === null ? '??' : row.score.detection ? 'OK' : 'NO';
        process.stderr.write(
          `  ${mark}  ${provider.id}  ${pair.app}/${pair.variant.id}  ${strategy}  r${repetition}  ` +
            `${row.promptTokens} tok  ${Math.round(row.latencyMs / 100) / 10}s\n`
        );
      }
      if (abortReason !== null) break;
    }
    if (abortReason !== null) break;
  }
  if (abortReason !== null) break;
}

const minutes = Math.round((Date.now() - started) / 60_000);
console.log('');
if (abortReason !== null) {
  console.error(`CORRIDA DETENIDA: ${abortReason}`);
  console.error('');
  console.error('Lo registrado hasta aca queda en la bitacora y la proxima corrida lo salta.');
  console.error('Antes de relanzar, comproba la capacidad del servidor de inferencia:');
  console.error('  · ollama ps  muestra el modelo cargado, su ventana y el reparto GPU/CPU');
  console.error('  · --strategy trace-diff  corre solo los prompts pequenos, para aislar');
  console.error('    un problema de tamano de prompt de un problema de conectividad');
  process.exit(1);
}
console.log(
  `${calls} inferencias, ${gated} casos resueltos por la compuerta sin inferencia, ` +
    `${failures} llamadas falladas, en ${minutes} minutos.`
);
console.log(`Bitácora en ${out}`);
