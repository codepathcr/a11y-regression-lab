import type { Category } from './categories';

// ---------------------------------------------------------------------------
// Proveedores
// ---------------------------------------------------------------------------

/** Una consulta a un modelo. Es texto a texto: ningún proveedor recibe objetos
 *  propios del framework, de modo que agregar un proveedor no obliga a conocer
 *  la estructura de una traza. */
export interface Completion {
  system: string;
  user: string;
}

/** Lo que devuelve un proveedor, con lo necesario para medir costo y latencia. */
export interface CompletionResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  /** Tiempo de pared de la llamada, medido por el cliente y no por el servidor:
   *  es el que percibe un pipeline de integración continua. */
  latencyMs: number;
}

/**
 * Contrato que debe cumplir cualquier proveedor de modelos.
 *
 * Es la costura que permite agregar APIs de pago más adelante sin tocar nada de
 * lo construido: un archivo nuevo en `providers/` que implemente esta interfaz y
 * una entrada en la configuración. Deliberadamente no expone nada específico de
 * Ollama —ni `num_ctx`, ni `keep_alive`, ni streaming—, porque un contrato que
 * filtra detalles de su primera implementación deja de ser un contrato.
 */
export interface Provider {
  /** Identificador del modelo tal como se reporta en los resultados. */
  readonly id: string;
  /** Nombre para mostrar en tablas del documento. */
  readonly label: string;
  /** Familia del proveedor: 'ollama', 'anthropic', 'openai'. */
  readonly kind: string;
  /** Si la inferencia tiene costo monetario. Falso para los modelos locales. */
  readonly metered: boolean;
  complete(completion: Completion): Promise<CompletionResult>;
}

// ---------------------------------------------------------------------------
// Estrategias de análisis
// ---------------------------------------------------------------------------

/**
 * Las tres estrategias del objetivo específico 5.
 *
 * La descomposición aísla DOS variables por separado, y ese es el motivo de que
 * sean tres y no dos:
 *
 *  · `static` recibe solo la versión modificada, sin base y sin secuencia. Es el
 *    equivalente a lo que hace una herramienta actual: juzgar un estado.
 *  · `state-diff` recibe base y modificada, pero solo el estado final de cada
 *    una. Agrega la comparación y nada más.
 *  · `trace-diff` recibe las trazas alineadas completas, con la secuencia de
 *    interacción. Agrega el contexto temporal.
 *
 * Sin `state-diff` en el medio, una mejora de `static` a `trace-diff` no se
 * podría atribuir: quedaría la duda de si el modelo mejoró por tener contexto
 * temporal o por el simple hecho de tener con qué comparar. La pregunta de
 * investigación es exactamente si el contexto temporal mejora la detección, de
 * modo que la estrategia intermedia no es un adorno sino la condición para
 * poder responderla.
 */
export const STRATEGIES = ['static', 'state-diff', 'trace-diff'] as const;

export type Strategy = (typeof STRATEGIES)[number];

export const STRATEGY_LABELS: Record<Strategy, string> = {
  static: 'evidencia estática de la versión modificada',
  'state-diff': 'diferencial de estados finales',
  'trace-diff': 'diferencial de trazas con contexto temporal',
};

/** Cómo se serializa la evidencia dentro del prompt. Se decide por medición en
 *  el piloto de la fase 6, igual que se decidió la identidad semántica. */
export type EvidenceFormat = 'lines' | 'json';

// ---------------------------------------------------------------------------
// Contrato de salida
// ---------------------------------------------------------------------------

/**
 * Los cuatro campos de salida comprometidos en el alcance aprobado: regresión
 * sí/no, categoría, transición afectada y evidencia de soporte.
 *
 * `category` y `transitionStep` son nulos cuando `regression` es falso, y
 * también cuando el modelo afirma una regresión pero no entrega el campo. Los
 * dos casos se distinguen en `ParsedVerdict.issues`, porque no son lo mismo: el
 * primero es una respuesta coherente y el segundo es una respuesta incompleta,
 * y mezclarlos inflaría la exactitud de categoría.
 */
export interface Verdict {
  regression: boolean;
  category: Category | null;
  /** Índice del paso del escenario donde aparece la regresión. */
  transitionStep: number | null;
  evidence: string;
}

export interface ParsedVerdict {
  verdict: Verdict | null;
  /** Problemas de forma de la respuesta. Vacío significa respuesta bien
   *  formada; `verdict` nulo significa que no se pudo rescatar nada. */
  issues: string[];
  raw: string;
}
