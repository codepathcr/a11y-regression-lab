import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Scenario } from '@a11y-lab/framework';
import { APPS } from './static-server';

/**
 * Las cuatro clases de par del benchmark.
 *
 * Las dos primeras son del diseño original. Las dos últimas se agregaron al
 * descubrir que, sin ellas, el estudio no podía responder su propio
 * planteamiento del problema, que exige separar las regresiones "de problemas
 * preexistentes y de diferencias que no afectan la accesibilidad".
 *
 *  · `positive` — el cambio introduce una regresión. Debe divergir.
 *  · `negative` — el cambio preserva la accesibilidad y NO altera la traza.
 *    Divergencia esperada: cero. Es el control que valida la normalización, y el
 *    que encontró los cuatro defectos de normalización del estudio.
 *  · `benign-divergent` — el cambio altera la traza y preserva la
 *    accesibilidad. Debe divergir. Es el único caso donde la tasa de falsos
 *    positivos del modelo existe: los `negative` no llegan al modelo porque la
 *    compuerta determinista los resuelve antes, de modo que sin esta clase la
 *    tasa de falsos positivos de las estrategias diferenciales sería cero por
 *    construcción.
 *  · `preexisting` — el lado izquierdo del par YA tiene un defecto de
 *    accesibilidad, y el derecho tiene el mismo defecto más un cambio benigno.
 *    Debe divergir, y solo por el cambio benigno. Es la prueba de la distinción
 *    entre accessibility testing y accessibility regression testing: un enfoque
 *    que audita la versión modificada encuentra el defecto y lo reporta como
 *    regresión, que es un falso positivo; uno que compara ve que el defecto está
 *    en los dos lados y responde que este cambio no introdujo nada.
 */
export type VariantLabel = 'positive' | 'negative' | 'benign-divergent' | 'preexisting';

export const LABELS: VariantLabel[] = ['positive', 'negative', 'benign-divergent', 'preexisting'];

export interface VariantSpec {
  id: string;
  kind: 'base' | 'mutant';
  label?: VariantLabel;
  note?: string;
  /**
   * Variante contra la que se compara este par. Por omisión `base`.
   *
   * Existe para la clase `preexisting`, cuyo lado izquierdo es una variante
   * defectuosa y no la referencia limpia. Reformula el invariante de la
   * arquitectura de una forma más precisa que la original: lo que debe ser
   * exactamente una parte no es el cambio respecto de `base`, sino **el delta
   * entre los dos lados del par**. Un par `preexisting` cambia dos partes
   * respecto de `base` y una sola respecto de su propio lado izquierdo.
   */
  baseVariant?: string;
  operator?: Record<string, unknown>;
  wcag?: string[];
  groundTruth?: {
    regression: boolean;
    category?: string | null;
    expectedStep?: number | null;
  };
}

export interface AppFile {
  id: string;
  title: string;
  stratum: string;
  scenario: Scenario & { note?: string; provisional?: boolean };
  variants: VariantSpec[];
}

export async function loadApp(appId: string): Promise<AppFile> {
  return JSON.parse(await readFile(join(APPS, appId, 'app.json'), 'utf8')) as AppFile;
}

/** Lado izquierdo del par. */
export function leftOf(variant: VariantSpec): string {
  return variant.baseVariant ?? 'base';
}

/** Si la clase exige que la traza difiera. Solo `negative` exige lo contrario. */
export function expectsDivergence(label: VariantLabel | undefined): boolean {
  return label !== undefined && label !== 'negative';
}

/** Si la respuesta esperada del modelo es "hay regresión". */
export function expectsRegression(label: VariantLabel | undefined): boolean {
  return label === 'positive';
}

export function mutantsOf(app: AppFile): VariantSpec[] {
  return app.variants.filter((variant) => variant.kind === 'mutant');
}

/** Conjunto de variantes que hacen de lado izquierdo en esta app. */
export function leftVariantsOf(app: AppFile): string[] {
  return [...new Set(mutantsOf(app).map(leftOf))].sort();
}

export function countByLabel(app: AppFile): Record<VariantLabel, number> {
  const counts = { positive: 0, negative: 0, 'benign-divergent': 0, preexisting: 0 };
  for (const variant of mutantsOf(app)) {
    if (variant.label) counts[variant.label] += 1;
  }
  return counts;
}
