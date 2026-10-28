import { resolveCategory } from './categories';
import type { Category } from './categories';
import type { Verdict } from './types';

/**
 * Verdad de terreno de un par, reducida a lo que se puntúa.
 *
 * `regression` es falso para las tres clases que no son `positive`, y en esas la
 * categoría y el paso son nulos: no hay nada que acertar más allá de la
 * respuesta binaria.
 */
export interface GroundTruth {
  regression: boolean;
  category: Category | null;
  expectedStep: number | null;
  /** Pasos donde la evidencia entregada al modelo presenta diferencias. */
  evidenceSteps: number[];
}

export interface Score {
  /** Acierto de la respuesta binaria. */
  detection: boolean;
  /** Celda de la matriz de confusión, para precisión, recall y tasa de falsos
   *  positivos. */
  outcome: 'true-positive' | 'false-positive' | 'true-negative' | 'false-negative';
  /** Nulo cuando no aplica: solo se evalúa en positivos acertados, porque
   *  puntuar la categoría de un par sin regresión mediría ruido. */
  category: boolean | null;
  /** Localización exacta de la transición. Nulo cuando no aplica. */
  transition: boolean | null;
  /** Localización tolerante: el paso nombrado está entre los que presentan
   *  diferencias. Un defecto puede manifestarse en varias transiciones, y la
   *  rúbrica del Instrumento 4 decide cuál de las dos lecturas se reporta. */
  transitionWithinEvidence: boolean | null;
}

/**
 * Puntúa un veredicto contra la verdad de terreno.
 *
 * Dos decisiones que afectan las métricas y van documentadas:
 *
 *  1. La categoría y la transición se evalúan **solo en los positivos que el
 *     modelo acertó**. Puntuarlas en un falso negativo no tiene sentido —no
 *     nombró ninguna— y puntuarlas en un falso positivo premiaría o castigaría
 *     por acertar la categoría de una regresión que no existe.
 *  2. Un veredicto que no se pudo interpretar NO se cuenta como "sin regresión".
 *     Contarlo así regalaría aciertos en las treinta y cuatro clases sin
 *     regresión del benchmark. Se devuelve null y se reporta aparte como
 *     respuesta inválida, que es una propiedad del modelo digna de su propia
 *     cifra.
 */
export function scoreVerdict(verdict: Verdict | null, truth: GroundTruth): Score | null {
  if (verdict === null) return null;

  const detection = verdict.regression === truth.regression;
  const outcome = verdict.regression
    ? truth.regression
      ? 'true-positive'
      : 'false-positive'
    : truth.regression
      ? 'false-negative'
      : 'true-negative';

  if (outcome !== 'true-positive') {
    return { detection, outcome, category: null, transition: null, transitionWithinEvidence: null };
  }

  const category = resolveCategory(verdict.category) === truth.category;
  const transition = verdict.transitionStep !== null && verdict.transitionStep === truth.expectedStep;
  const transitionWithinEvidence =
    verdict.transitionStep !== null && truth.evidenceSteps.includes(verdict.transitionStep);

  return { detection, outcome, category, transition, transitionWithinEvidence };
}
