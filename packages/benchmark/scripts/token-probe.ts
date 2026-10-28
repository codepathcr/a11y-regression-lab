import { readFile } from 'node:fs/promises';
import { diffTraces, normalize } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import {
  OllamaProvider,
  STRATEGIES,
  buildEvidence,
  buildPrompt,
  loadConfig,
} from '@a11y-lab/analysis';
import type { Strategy } from '@a11y-lab/analysis';
import { ignoreBrokenPipe } from './io';
import { tracePath } from './paths';
import { leftOf, loadApp, mutantsOf } from './spec';
import { APPS } from './static-server';
import { readdir } from 'node:fs/promises';

/**
 * Pregunta al servidor de inferencia cuántos tokens pesa el prompt más grande de
 * cada estrategia.
 *
 *   pnpm --filter @a11y-lab/benchmark token-probe [modelo]
 *
 * Existe porque el tamaño en tokens se estimó dos veces a partir de los
 * caracteres y las dos veces salió mal. La primera, con una razón de tres
 * caracteres por token medida sobre el formato de líneas, que subestimó el
 * formato estructurado en un factor de tres. La segunda, al reanclar la razón
 * sobre un prompt que entretanto se había compactado, de modo que el numerador y
 * el denominador describían artefactos distintos.
 *
 * La lección es la misma que ya apareció dos veces en este proyecto: **una
 * magnitud derivada de una representación se rompe en silencio cuando la
 * representación cambia.** La ventana de contexto es un requisito duro y un
 * prompt que no entra se recorta sin aviso, de modo que el valor no se estima:
 * se pregunta a quien tokeniza.
 *
 * Son tres llamadas, una por estrategia, y cada una envía solo una MUESTRA del
 * prompt más grande, no el prompt completo.
 *
 * La muestra existe por una segunda corrección. Enviar el prompt completo de la
 * estrategia sin versión base tardó más de cinco minutos con el modelo al cien
 * por ciento en GPU, y el motivo no es la lentitud sino el desbordamiento: un
 * prompt que excede la ventana no falla, obliga al motor a desplazar el contexto
 * y reevaluar en bucle, de modo que el tiempo explota. Medir el caso patológico
 * para averiguar si es patológico no sirve.
 *
 * El cuerpo de la evidencia es homogéneo —miles de tuplas de la misma forma—, de
 * modo que la razón entre caracteres y tokens de una rebanada representa la del
 * documento entero, y el tamaño total sale por aritmética. La muestra se corta
 * por la mitad de una tupla y produce un JSON inválido: no importa, porque lo
 * único que se le pide al servidor es cuántos tokens pesa el texto.
 */

ignoreBrokenPipe();

const config = await loadConfig();
const wanted = process.argv[2];
const model = wanted ? config.models.find((entry) => entry.id === wanted) : config.models[0];

if (!model) {
  console.error(
    `No hay modelo "${wanted}". Declarados: ${config.models.map((entry) => entry.id).join(', ')}`
  );
  process.exit(1);
}

const spec = config.providers[model.provider];
if (!spec || spec.kind !== 'ollama') {
  console.error(`La sonda solo sabe hablar con Ollama; ${model.id} declara ${spec?.kind}.`);
  process.exit(1);
}

/**
 * La sonda pide UN SOLO token de salida.
 *
 * La primera versión pedía los 2048 de la configuración y agotó el timeout sin
 * entregar el dato. Generar la respuesta no tiene nada que ver con lo que se
 * quiere medir: a unas decenas de tokens por segundo, 2048 son más de un minuto
 * dedicado a producir un texto que se descarta. Con un token, lo que se mide es
 * el costo de procesar el prompt, que es exactamente la pregunta.
 *
 * El timeout va en sesenta segundos: una muestra de cuatro mil caracteres que
 * tarda mas que eso no esta midiendo lo que se cree.
 */
const provider = new OllamaProvider({
  id: model.id,
  label: model.label,
  model: model.model,
  baseUrl: spec.baseUrl,
  requestTimeoutMs: 60_000,
  keepAlive: spec.keepAlive,
  // Sin restricción de formato: la gramática de JSON es incompatible con pedir
  // un solo token de salida, y la combinación deja la petición sin responder.
  format: null,
  // Un token de salida se corta por longitud por definición: es lo esperado.
  allowTruncation: true,
  options: { ...spec.options, num_predict: 1 },
});

const read = async (app: string, variant: string): Promise<Trace> =>
  JSON.parse(await readFile(tracePath(app, variant), 'utf8')) as Trace;

// El prompt más grande de cada estrategia, por caracteres.
const largest = new Map<Strategy, { app: string; variant: string; chars: number; system: string; user: string }>();

const dirs = (await readdir(APPS, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort();

for (const app of dirs) {
  const appSpec = await loadApp(app);
  const scenario: Scenario = { id: app, steps: appSpec.scenario.steps };
  for (const variant of mutantsOf(appSpec)) {
    const base = await read(app, leftOf(variant));
    const modified = await read(app, variant.id);
    diffTraces(normalize(base), normalize(modified));
    for (const strategy of STRATEGIES) {
      const evidence = buildEvidence(strategy, { base, modified, scenario }, config.evidenceFormat);
      if (evidence.gated) continue;
      const prompt = buildPrompt({ appTitle: appSpec.title, evidence });
      const chars = prompt.system.length + prompt.user.length;
      const current = largest.get(strategy);
      if (!current || chars > current.chars) {
        largest.set(strategy, { app, variant: variant.id, chars, ...prompt });
      }
    }
  }
}

console.log(`Modelo: ${provider.label} (${provider.id})`);
console.log(`Formato de evidencia: ${config.evidenceFormat}`);
console.log(`Ventana declarada: ${config.minContextTokens} tokens mínimos`);
console.log(`num_ctx actual: ${spec.options.num_ctx}`);
console.log('Pidiendo un solo token de salida: se mide el prompt, no la generación.');
console.log('');
console.log(`Muestra de ${4000} caracteres por estrategia; el total sale por aritmética.`);
console.log('');
console.log('  estrategia    par                                      caracteres   proyec.   car/tok');

/** Caracteres de la muestra. Suficientes para que la razón sea estable y
 *  pequeños para que la llamada tarde segundos. */
const SAMPLE_CHARS = 4_000;

let worst = 0;

for (const strategy of STRATEGIES) {
  const entry = largest.get(strategy);
  if (!entry) continue;

  const sampleUser = entry.user.slice(0, SAMPLE_CHARS);
  const sampleChars = entry.system.length + sampleUser.length;

  try {
    const result = await provider.complete({ system: entry.system, user: sampleUser });
    if (result.promptTokens === 0) {
      console.log(`  ${strategy.padEnd(13)} el servidor no reportó el conteo de tokens`);
      continue;
    }
    const ratio = sampleChars / result.promptTokens;
    const projected = Math.round(entry.chars / ratio);
    worst = Math.max(worst, projected);
    console.log(
      `  ${strategy.padEnd(13)} ${`${entry.app}/${entry.variant}`.padEnd(40)} ` +
        `${String(entry.chars).padStart(10)}   ${String(projected).padStart(7)}   ${ratio.toFixed(2).padStart(7)}`
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.log(`  ${strategy.padEnd(13)} ${`${entry.app}/${entry.variant}`.padEnd(40)} FALLÓ: ${detail}`);
  }
}

console.log('');
if (worst === 0) {
  console.log('Ninguna llamada devolvió un conteo de tokens. Revisá el servidor.');
} else {
  // Margen para la respuesta y para que el prompt más grande no quede al borde.
  const needed = Math.ceil((worst + 2048) / 1024) * 1024;
  console.log(`Prompt más grande, proyectado: ${worst} tokens.`);
  console.log(`num_ctx recomendado: ${needed} (el peor prompt más 2048 de respuesta, redondeado).`);
  const current = spec.options.num_ctx ?? 0;
  if (needed > current) {
    console.log('');
    console.log(`ATENCIÓN: supera el num_ctx actual de ${current}.`);
    console.log('Con la ventana actual, ese prompt se recortaría en silencio.');
  }
}
