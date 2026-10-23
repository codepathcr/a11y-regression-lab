/**
 * Modelo de la traza de interacción.
 *
 * Las categorías registradas corresponden una a una con la evidencia
 * comprometida en el alcance aprobado: acción ejecutada, eventos de teclado,
 * secuencia de foco, información relevante del DOM, árbol de accesibilidad,
 * cambios de contexto y actualizaciones dinámicas.
 *
 * La traza **no lleva marcas de tiempo**. El tiempo absoluto es la mayor fuente
 * de variación entre ejecuciones y no aporta nada a la comparación diferencial;
 * el orden de los eventos dentro de cada paso es la única dimensión temporal
 * que se conserva. La latencia se mide aparte, como métrica de eficiencia.
 */

/**
 * Identidad de un elemento, registrada por **dos vías a la vez**.
 *
 * `path` es la ruta estructural y es frágil: un contenedor de maquetación
 * añadido por una refactorización neutral desplaza la ruta de todo lo que
 * envuelve, y una identidad basada solo en ella convierte ese cambio inocuo en
 * una diferencia. `role` y `name` sobreviven a ese desplazamiento.
 *
 * Se capturan las dos porque decidir cuál usar es una decisión de normalización
 * que debe tomarse con datos de la fase 4 y no por anticipado. Capturar de más
 * ahora evita tener que volver a medir después.
 */
export interface ElementRef {
  path: string;
  role: string;
  name: string;
}

export type TraceEvent =
  | { kind: 'focus'; target: ElementRef }
  | { kind: 'blur'; target: ElementRef }
  | { kind: 'key'; phase: 'down' | 'up'; key: string; target: ElementRef }
  | { kind: 'announcement'; target: ElementRef; politeness: string; text: string }
  | {
      kind: 'aria-change';
      target: ElementRef;
      attribute: string;
      from: string | null;
      to: string | null;
    }
  | { kind: 'dom-add'; parent: ElementRef; node: ElementRef }
  | { kind: 'dom-remove'; parent: ElementRef; node: ElementRef };

/** Nodo del árbol de accesibilidad según el propio navegador. */
export interface AxNode {
  role: string;
  name: string;
  value: string;
  live: string;
  focused: boolean;
  depth: number;
}

export interface StepRecord {
  index: number;
  /** Descripción legible de la acción ejecutada en este paso. */
  action: string;
  events: TraceEvent[];
  ax: AxNode[];
  /** Milisegundos que tomó el paso. Fuera del modelo comparable: solo métrica. */
  elapsedMs: number;
}

/** Contexto de ejecución, para que una traza sea interpretable sin el código. */
export interface TraceEnvironment {
  browser: string;
  browserVersion: string;
  settleMs: number;
  viewport: { width: number; height: number };
}

export interface Trace {
  url: string;
  scenarioId: string;
  /** Número de repetición. Varias repeticiones de la misma URL miden el ruido. */
  repetition: number;
  environment: TraceEnvironment;
  steps: StepRecord[];
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

export type StepAction = 'focus' | 'fill' | 'click' | 'press' | 'settle';

export interface Step {
  action: StepAction;
  selector?: string;
  value?: string;
  key?: string;
  ms?: number;
}

export interface Scenario {
  id: string;
  steps: Step[];
  /** Marca los escenarios cuyo diseño definitivo está pendiente. */
  provisional?: boolean;
}

export interface CaptureOptions {
  url: string;
  scenario: Scenario;
  repetition?: number;
  /** Período de quietud tras cada acción. Parametrizable: influye directamente
   *  en el ruido y su valor se vuelca en la traza. */
  settleMs?: number;
  viewport?: { width: number; height: number };
}
