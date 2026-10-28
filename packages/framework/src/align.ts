import type { NormalizedStep } from './normalize';

export interface LineDiff {
  added: string[];
  removed: string[];
  common: number;
}

/**
 * Alineamiento por subsecuencia común más larga.
 *
 * Preserva el orden, que es la dimensión que importa: un anuncio que llega
 * antes o después de un cambio de foco no es el mismo comportamiento, y un
 * conjunto no distinguiría los dos casos.
 */
export function diffLines(left: string[], right: string[]): LineDiff {
  const n = left.length;
  const m = right.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const added: string[] = [];
  const removed: string[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      removed.push(left[i]);
      i += 1;
    } else {
      added.push(right[j]);
      j += 1;
    }
  }
  while (i < n) {
    removed.push(left[i]);
    i += 1;
  }
  while (j < m) {
    added.push(right[j]);
    j += 1;
  }

  return { added, removed, common: table[0][0] };
}

export interface StepDiff {
  index: number;
  action: string;
  events: LineDiff;
  ax: LineDiff;
}

export interface TraceDiff {
  steps: StepDiff[];
  /** Eventos que difieren sobre el total observado en ambos lados. Cero
   *  significa trazas idénticas. Es la medida con la que se compara el ruido
   *  entre repeticiones de una misma versión contra la señal entre base y
   *  mutante. */
  eventDivergence: number;
  axDivergence: number;
  /** Pasos donde difiere el FLUJO DE EVENTOS, es decir el comportamiento
   *  observable de la interfaz. La localización de la transición afectada se
   *  busca acá. */
  changedSteps: number[];
  /**
   * Pasos donde difiere el ÁRBOL DE ACCESIBILIDAD, es decir el estado
   * resultante.
   *
   * No es redundante con `changedSteps`, y la distinción la obligó una
   * medición: una mutación puede dejar el flujo de eventos intacto y alterar el
   * contenido —por ejemplo, un ordenamiento que no ocurre deja la tabla en otro
   * orden sin que falte ningún evento—. Esa diferencia vive solo en el árbol.
   *
   * Importa porque la poda del árbol, que envía al modelo solo los pasos con
   * diferencias, se calcula sobre la UNIÓN de los dos conjuntos. Calculada solo
   * sobre los eventos, podaría la evidencia precisamente donde está.
   */
  axChangedSteps: number[];
  /** Verdadero si existe cualquier diferencia observable, de eventos o de
   *  árbol. Es la compuerta del mutation score y, en un flujo de Pull
   *  Requests, lo que decide si vale la pena invocar un modelo. */
  hasDifferences: boolean;
  /** Unión de `changedSteps` y `axChangedSteps`: los pasos cuya evidencia debe
   *  entregarse al modelo. */
  evidenceSteps: number[];
}

export function diffTraces(left: NormalizedStep[], right: NormalizedStep[]): TraceDiff {
  const count = Math.max(left.length, right.length);
  const empty: NormalizedStep = { index: -1, action: '(ausente)', events: [], ax: [] };
  const steps: StepDiff[] = [];

  for (let index = 0; index < count; index += 1) {
    const a = left[index] ?? empty;
    const b = right[index] ?? empty;
    steps.push({
      index: a.index >= 0 ? a.index : b.index,
      action: a.action === '(ausente)' ? b.action : a.action,
      events: diffLines(a.events, b.events),
      ax: diffLines(a.ax, b.ax),
    });
  }

  const total = (list: NormalizedStep[], field: 'events' | 'ax'): number =>
    list.reduce((sum, step) => sum + step[field].length, 0);

  const differing = (field: 'events' | 'ax'): number =>
    steps.reduce((sum, step) => sum + step[field].added.length + step[field].removed.length, 0);

  const eventTotal = total(left, 'events') + total(right, 'events');
  const axTotal = total(left, 'ax') + total(right, 'ax');

  const changedSteps = steps
    .filter((step) => step.events.added.length + step.events.removed.length > 0)
    .map((step) => step.index);

  const axChangedSteps = steps
    .filter((step) => step.ax.added.length + step.ax.removed.length > 0)
    .map((step) => step.index);

  const evidenceSteps = [...new Set([...changedSteps, ...axChangedSteps])].sort((a, b) => a - b);

  return {
    steps,
    eventDivergence: eventTotal === 0 ? 0 : differing('events') / eventTotal,
    axDivergence: axTotal === 0 ? 0 : differing('ax') / axTotal,
    changedSteps,
    axChangedSteps,
    hasDifferences: evidenceSteps.length > 0,
    evidenceSteps,
  };
}
