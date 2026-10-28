import { readdir } from 'node:fs/promises';
import { captureTrace, diffTraces, normalize } from '@a11y-lab/framework';
import type { Scenario, Trace } from '@a11y-lab/framework';
import { launchChromium } from './browser';
import { reportEnvironment } from './environment';
import { ignoreBrokenPipe } from './io';
import { APPS, serveDist } from './static-server';
import { LABELS, leftOf, leftVariantsOf, loadApp, mutantsOf } from './spec';
import type { VariantLabel } from './spec';

/**
 * Verifica el benchmark completo contra su verdad de terreno.
 *
 * Por app:
 *
 *  1. **Piso de ruido cero.** Dos capturas de un mismo lado izquierdo deben
 *     producir trazas idénticas, en eventos y en árbol. Se comprueba para cada
 *     lado izquierdo que la app use, no solo para `base`: un par `preexisting`
 *     compara contra una variante defectuosa, y si esa variante no es
 *     determinista, su par tampoco lo es.
 *  2. **Divergencia según la clase.** `negative` exige divergencia cero;
 *     `positive`, `benign-divergent` y `preexisting` exigen divergencia. Un
 *     positivo sin evidencia es un caso que el método no puede detectar y debe
 *     tratarse como hallazgo; un benigno sin evidencia no sirve para medir
 *     falsos positivos, porque la compuerta lo resolvería antes de llegar al
 *     modelo.
 *  3. **Metadatos coherentes con la clase.** Solo los positivos llevan categoría
 *     y paso esperado, y la categoría debe ser una de las cuatro del alcance. El
 *     paso esperado debe estar entre los pasos con evidencia: si no, la métrica
 *     de localización no sería contestable para ese par.
 *
 * Es la comprobación que corre antes de cada entrega, y la que evita que un
 * cambio en la normalización rompa en silencio pares ya validados.
 */

ignoreBrokenPipe();

const PORT = 5395;

/**
 * Las cuatro categorías del alcance aprobado, como cadenas exactas.
 *
 * Se verifican acá y no solo en el analizador porque la exactitud de categoría
 * compara la respuesta del modelo contra este valor. Una categoría mal escrita
 * en la verdad de terreno hace que ese par cuente mal respondiera lo que
 * respondiera el modelo, y el fallo no se manifiesta como error sino como una
 * métrica unos puntos más baja. Ya ocurrió: catorce de los cuarenta y dos
 * positivos tenían las tildes distintas del resto.
 */
const CATEGORIES = new Set([
  'orden y continuidad del foco',
  'operación mediante teclado',
  'cambios inesperados de contexto',
  'comunicación accesible de actualizaciones dinámicas',
]);

const only = process.argv[2];

const server = await serveDist(PORT);
const browser = await launchChromium();

const problems: string[] = [];
const totals: Record<VariantLabel, number> = {
  positive: 0,
  negative: 0,
  'benign-divergent': 0,
  preexisting: 0,
};
let checked = 0;
let environmentReported = false;

try {
  const dirs = (await readdir(APPS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .filter((name) => !only || name === only)
    .sort();

  for (const app of dirs) {
    const spec = await loadApp(app);
    const scenario: Scenario = { id: app, steps: spec.scenario.steps };
    const run = (variant: string): Promise<Trace> =>
      captureTrace(browser, {
        url: `${server.origin}/?app=${app}&variant=${variant}`,
        scenario,
      });

    // --- 1. Piso de ruido de cada lado izquierdo --------------------------
    const left = new Map<string, Trace>();
    let noiseOk = true;

    for (const variant of leftVariantsOf(spec)) {
      const first = await run(variant);
      if (!environmentReported) {
        await reportEnvironment(first);
        console.log('');
        environmentReported = true;
      }
      const second = await run(variant);
      const noise = diffTraces(normalize(first), normalize(second));
      if (noise.hasDifferences) {
        noiseOk = false;
        problems.push(
          `${app}: piso de ruido distinto de cero en el lado izquierdo "${variant}" ` +
            `(eventos ${noise.changedSteps.join(',')} | árbol ${noise.axChangedSteps.join(',')})`
        );
      }
      left.set(variant, first);
    }

    // --- 2 y 3. Cada par -------------------------------------------------
    const counts: Record<VariantLabel, number> = {
      positive: 0,
      negative: 0,
      'benign-divergent': 0,
      preexisting: 0,
    };

    for (const variant of mutantsOf(spec)) {
      const label = variant.label;
      if (!label || !LABELS.includes(label)) {
        problems.push(`${app}/${variant.id}: clase ausente o desconocida: ${JSON.stringify(label)}`);
        continue;
      }

      const reference = left.get(leftOf(variant));
      if (!reference) {
        problems.push(`${app}/${variant.id}: lado izquierdo "${leftOf(variant)}" no se pudo capturar`);
        continue;
      }

      const diff = diffTraces(normalize(reference), normalize(await run(variant.id)));
      checked += 1;
      counts[label] += 1;
      totals[label] += 1;

      const declared = variant.groundTruth?.regression;
      if (declared !== (label === 'positive')) {
        problems.push(
          `${app}/${variant.id}: clase ${label} declara regression=${String(declared)}`
        );
      }

      if (label === 'negative') {
        if (diff.hasDifferences) {
          problems.push(
            `${app}/${variant.id}: NEGATIVO con evidencia ` +
              `(eventos ${diff.changedSteps.join(',')} | árbol ${diff.axChangedSteps.join(',')})`
          );
        }
      } else if (!diff.hasDifferences) {
        const why =
          label === 'positive'
            ? 'POSITIVO sin evidencia observable'
            : `${label} sin divergencia: la compuerta lo resolvería sin llegar al modelo, ` +
              'de modo que no sirve para medir falsos positivos';
        problems.push(`${app}/${variant.id}: ${why}`);
      }

      if (label === 'positive') {
        const category = variant.groundTruth?.category ?? null;
        if (category === null || !CATEGORIES.has(category)) {
          problems.push(
            `${app}/${variant.id}: categoría fuera de las cuatro del alcance: ${JSON.stringify(category)}`
          );
        }
        const step = variant.groundTruth?.expectedStep ?? null;
        if (step === null) {
          problems.push(`${app}/${variant.id}: POSITIVO sin expectedStep declarado`);
        } else if (!diff.evidenceSteps.includes(step)) {
          problems.push(
            `${app}/${variant.id}: expectedStep ${step} no está entre los pasos con evidencia ` +
              `(${diff.evidenceSteps.join(',')})`
          );
        }
      } else {
        if ((variant.groundTruth?.category ?? null) !== null) {
          problems.push(`${app}/${variant.id}: clase ${label} no debe declarar categoría`);
        }
        if ((variant.groundTruth?.expectedStep ?? null) !== null) {
          problems.push(`${app}/${variant.id}: clase ${label} no debe declarar expectedStep`);
        }
      }

      if (label === 'preexisting' && leftOf(variant) === 'base') {
        problems.push(
          `${app}/${variant.id}: clase preexisting debe declarar baseVariant con el defecto previo`
        );
      }
    }

    console.log(
      `  ${noiseOk ? 'OK' : '!!'}  ${app.padEnd(14)} ${spec.stratum.padEnd(7)} ` +
        `${String(mutantsOf(spec).length).padStart(2)} pares  ` +
        `(pos ${counts.positive}, neg ${counts.negative}, ` +
        `ben ${counts['benign-divergent']}, pre ${counts.preexisting})`
    );
  }
} finally {
  await browser.close();
  server.close();
}

console.log('');
console.log(
  `Clases: ${totals.positive} positivos · ${totals.negative} negativos de divergencia nula · ` +
    `${totals['benign-divergent']} divergencias benignas · ${totals.preexisting} defectos preexistentes`
);
console.log('');
if (problems.length === 0) {
  console.log(`Verdad de terreno consistente en ${checked} pares.`);
} else {
  console.log(`${problems.length} problema(s):`);
  for (const problem of problems) console.log(`  - ${problem}`);
}
process.exit(problems.length === 0 ? 0 : 1);
