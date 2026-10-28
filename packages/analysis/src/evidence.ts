import { axLine, diffTraces, eventLine, normalize, prepareAx } from '@a11y-lab/framework';
import type {
  AxNode,
  NormalizedStep,
  Scenario,
  StepRecord,
  Trace,
  TraceDiff,
  TraceEvent,
} from '@a11y-lab/framework';
import type { EvidenceFormat, Strategy } from './types';

export interface EvidenceInput {
  base: Trace;
  modified: Trace;
  scenario: Scenario;
}

export interface Evidence {
  strategy: Strategy;
  format: EvidenceFormat;
  text: string;
  /** Pasos incluidos. Para `static` son todos, porque sin base no hay forma de
   *  saber dónde mirar. */
  includedSteps: number[];
  /** Verdadero cuando la evidencia se recortó a los pasos con divergencia. */
  pruned: boolean;
  /**
   * Verdadero cuando la compuerta determinista resuelve el caso sin consultar al
   * modelo, porque la traza no presenta ninguna diferencia.
   *
   * Vive acá y no en el ejecutor por un defecto que apareció en la corrida en
   * seco: el ejecutor deducía la condición de que el texto de la evidencia
   * estuviera vacío, y eso solo era cierto con el formato de líneas. Con el
   * formato estructurado el texto de una evidencia sin pasos es un objeto con un
   * arreglo vacío, no una cadena vacía, de modo que la compuerta quedaba
   * desactivada en silencio y los dieciocho controles de divergencia nula —que
   * por diseño NO deben llegar al modelo— se le enviaban igual. El efecto no era
   * solo gastar inferencias: cambiaba la matriz de confusión de las dos
   * estrategias diferenciales justo donde el método afirma que la compuerta las
   * protege.
   *
   * La condición correcta es la ausencia de pasos con divergencia, que no depende
   * del formato.
   */
  gated: boolean;
  lineCount: number;
}

/**
 * Descripción de la acción de cada paso, tomada del escenario.
 *
 * La traza guarda el verbo de la acción pero no su objetivo. Sin el selector, el
 * modelo no puede nombrar qué se accionó y la evidencia de soporte queda vacía
 * de contenido. El paso 0 es el montaje y no corresponde a ninguna entrada del
 * escenario.
 */
function describeActions(scenario: Scenario): Map<number, string> {
  const map = new Map<number, string>([[0, 'montaje de la página']]);
  scenario.steps.forEach((step, position) => {
    const parts: string[] = [step.action];
    if (step.selector) parts.push(step.selector);
    if (step.key) parts.push(`tecla ${step.key}`);
    if (step.value !== undefined) parts.push(`valor ${JSON.stringify(step.value)}`);
    if (step.ms !== undefined) parts.push(`${step.ms} ms`);
    map.set(position + 1, parts.join(' '));
  });
  return map;
}

function stepHeading(index: number, actions: Map<number, string>): string {
  return `## paso ${index} — ${actions.get(index) ?? 'acción desconocida'}`;
}

// ---------------------------------------------------------------------------
// static — solo la versión modificada
// ---------------------------------------------------------------------------

function buildStatic(steps: NormalizedStep[], actions: Map<number, string>): string {
  const blocks = steps.map((step) => {
    const lines = [stepHeading(step.index, actions), '', 'árbol de accesibilidad:'];
    lines.push(...step.ax.map((line) => `  ${line}`));
    return lines.join('\n');
  });
  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// state-diff — ambas versiones, solo estados
// ---------------------------------------------------------------------------

function renderLineDiff(diff: { removed: string[]; added: string[] }): string[] {
  if (diff.removed.length === 0 && diff.added.length === 0) return ['  (sin diferencias)'];
  return [
    ...diff.removed.map((line) => `  - base      ${line}`),
    ...diff.added.map((line) => `  + modificada ${line}`),
  ];
}

function buildStateDiff(
  diff: TraceDiff,
  steps: number[],
  actions: Map<number, string>
): string {
  const byIndex = new Map(diff.steps.map((step) => [step.index, step]));
  const blocks = steps.map((index) => {
    const step = byIndex.get(index);
    const lines = [stepHeading(index, actions), '', 'diferencias del árbol de accesibilidad:'];
    lines.push(...renderLineDiff(step ? step.ax : { removed: [], added: [] }));
    return lines.join('\n');
  });
  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// trace-diff — ambas versiones, estados y transiciones
// ---------------------------------------------------------------------------

function buildTraceDiff(diff: TraceDiff, steps: number[], actions: Map<number, string>): string {
  const byIndex = new Map(diff.steps.map((step) => [step.index, step]));
  const blocks = steps.map((index) => {
    const step = byIndex.get(index);
    const lines = [stepHeading(index, actions), '', 'diferencias de eventos observados:'];
    lines.push(...renderLineDiff(step ? step.events : { removed: [], added: [] }));
    lines.push('', 'diferencias del árbol de accesibilidad:');
    lines.push(...renderLineDiff(step ? step.ax : { removed: [], added: [] }));
    return lines.join('\n');
  });
  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// Formato JSON — los mismos hechos, con estructura explícita
// ---------------------------------------------------------------------------

/**
 * Índice de línea normalizada a objeto estructurado.
 *
 * La comparación diferencial del framework opera sobre líneas de texto, y esa
 * decisión es la que hace medible el piso de ruido. Para el formato JSON hace
 * falta el objeto detrás de cada línea que difiere, y se recupera reaplicando el
 * mismo serializador que produjo la línea: `eventLine` y `axLine` son parte de
 * la superficie pública del framework justamente para esto.
 *
 * Reconstruir el índice en lugar de cambiar el comparador es deliberado. Diffear
 * objetos en lugar de líneas obligaría a definir igualdad estructural sobre cada
 * tipo de evento, y cualquier diferencia entre esa definición y el serializador
 * produciría divergencias distintas según el formato: el piso de ruido dejaría
 * de ser una propiedad del instrumento y pasaría a depender del formato elegido.
 */
function indexEvents(step: StepRecord | undefined): Map<string, TraceEvent> {
  const index = new Map<string, TraceEvent>();
  for (const event of step?.events ?? []) {
    const line = eventLine(event, 'semantic');
    if (!index.has(line)) index.set(line, event);
  }
  return index;
}

function indexAx(step: StepRecord | undefined): Map<string, AxNode> {
  const index = new Map<string, AxNode>();
  for (const node of prepareAx(step?.ax ?? [])) {
    const line = axLine(node);
    if (!index.has(line)) index.set(line, node);
  }
  return index;
}

function lookup<T>(lines: string[], index: Map<string, T>, line: (value: string) => unknown): unknown[] {
  return lines.map((value) => index.get(value) ?? line(value));
}

/**
 * Serialización compacta de un nodo del árbol de accesibilidad.
 *
 * Tupla y no objeto, con el encabezado declarado una sola vez en la cabecera del
 * documento. El motivo es de capacidad y está medido: la primera corrida real
 * reportó 36.698 tokens de prompt para la aplicación MÁS PEQUEÑA del benchmark,
 * cuando el dimensionamiento previo —hecho con el formato de líneas, antes de que
 * el piloto fijara el estructurado— estimaba 11.995. Con un objeto por nodo,
 * claves repetidas, campos vacíos e indentación, la aplicación grande pedía unos
 * 97.000 tokens: no corre en ninguna GPU de consumo.
 *
 * Los nodos del árbol son lo que domina el tamaño: a09-tienda acumula 3.214
 * nodos contra 112 eventos. De ahí que se compacten los nodos y los eventos
 * sigan como objetos, donde la legibilidad vale más que los bytes.
 *
 * Los tres campos opcionales se omiten cuando están vacíos, que es el caso de la
 * gran mayoría de los nodos.
 */
function axTuple(node: AxNode): unknown[] {
  const head: unknown[] = [node.role, node.name, node.depth];
  if (node.value || node.live || node.focused) {
    head.push(node.value || null, node.live || null, node.focused || null);
  }
  return head;
}

const AX_HEADER = {
  nodo: ['rol', 'nombre', 'profundidad', 'valor?', 'live?', 'enfocado?'],
  nota: 'Los nodos del arbol de accesibilidad vienen como tuplas en ese orden. Los tres ultimos campos se omiten cuando no aplican.',
};

interface JsonStep {
  paso: number;
  accion: string;
  eventos?: { soloEnBase: unknown[]; soloEnModificada: unknown[] };
  arbol: { soloEnBase: unknown[]; soloEnModificada: unknown[] };
}

function buildJson(
  diff: TraceDiff,
  steps: number[],
  actions: Map<number, string>,
  base: Trace,
  modified: Trace,
  withEvents: boolean
): string {
  const byIndex = new Map(diff.steps.map((step) => [step.index, step]));
  const baseSteps = new Map(base.steps.map((step) => [step.index, step]));
  const modifiedSteps = new Map(modified.steps.map((step) => [step.index, step]));
  const unresolved = (value: string): unknown => ({ sinInterpretar: value });

  const pasos: JsonStep[] = steps.map((index) => {
    const step = byIndex.get(index);
    const baseEvents = indexEvents(baseSteps.get(index));
    const modifiedEvents = indexEvents(modifiedSteps.get(index));
    const baseAx = indexAx(baseSteps.get(index));
    const modifiedAx = indexAx(modifiedSteps.get(index));

    const entry: JsonStep = {
      paso: index,
      accion: actions.get(index) ?? 'accion desconocida',
      arbol: {
        soloEnBase: lookup(step?.ax.removed ?? [], baseAx, unresolved).map((node) =>
          typeof node === 'object' && node !== null && 'role' in node ? axTuple(node as AxNode) : node
        ),
        soloEnModificada: lookup(step?.ax.added ?? [], modifiedAx, unresolved).map((node) =>
          typeof node === 'object' && node !== null && 'role' in node ? axTuple(node as AxNode) : node
        ),
      },
    };

    if (withEvents) {
      entry.eventos = {
        soloEnBase: lookup(step?.events.removed ?? [], baseEvents, unresolved),
        soloEnModificada: lookup(step?.events.added ?? [], modifiedEvents, unresolved),
      };
    }

    return entry;
  });

  return JSON.stringify({ formato: AX_HEADER, pasos });
}

function buildStaticJson(steps: NormalizedStep[], actions: Map<number, string>, trace: Trace): string {
  const traceSteps = new Map(trace.steps.map((step) => [step.index, step]));
  const pasos = steps.map((step) => ({
    paso: step.index,
    accion: actions.get(step.index) ?? 'accion desconocida',
    arbol: prepareAx(traceSteps.get(step.index)?.ax ?? []).map(axTuple),
  }));
  return JSON.stringify({ formato: AX_HEADER, pasos });
}

// ---------------------------------------------------------------------------

/**
 * Arma la evidencia de una estrategia.
 *
 * Las tres están anidadas en información y cada incremento es exactamente una
 * variable:
 *
 *  · `static` → `state-diff` agrega **tener una versión base con qué comparar**.
 *  · `state-diff` → `trace-diff` agrega **los eventos de transición**: teclas,
 *    movimientos de foco, anuncios, altas y bajas de nodos.
 *
 * Las tres conservan el orden de los pasos y la acción que los produjo, de modo
 * que las tres pueden nombrar la transición afectada y la métrica de
 * localización está definida en las tres. Con esta operacionalización, el
 * "contexto temporal" de la pregunta de investigación son los eventos de
 * transición, y la diferencia entre la segunda y la tercera estrategia es
 * exactamente la medida de su aporte.
 *
 * Sobre la poda: las dos estrategias diferenciales reciben solo los pasos con
 * divergencia, que es la compuerta determinista del método. `static` recibe
 * todos los pasos porque sin base no tiene forma de saber dónde mirar. La
 * asimetría no es un sesgo encubierto: es la propiedad que distingue a los dos
 * enfoques, y queda a la vista en el conteo de tokens de cada estrategia.
 */
export function buildEvidence(
  strategy: Strategy,
  input: EvidenceInput,
  format: EvidenceFormat = 'lines'
): Evidence {
  const actions = describeActions(input.scenario);
  const modified = normalize(input.modified);

  if (strategy === 'static') {
    const includedSteps = modified.map((step) => step.index);
    const text =
      format === 'json'
        ? buildStaticJson(modified, actions, input.modified)
        : buildStatic(modified, actions);
    return {
      strategy,
      format,
      text,
      includedSteps,
      pruned: false,
      // La estrategia sin versión base nunca pasa por la compuerta: no tiene con
      // qué comparar, de modo que siempre consulta al modelo.
      gated: false,
      lineCount: text.split('\n').length,
    };
  }

  const diff = diffTraces(normalize(input.base), modified);
  const includedSteps = diff.evidenceSteps;

  // Un par sin divergencia no llega al modelo: lo resuelve la compuerta
  // determinista sin gastar una inferencia. Que esta función pueda devolver
  // evidencia vacía es deliberado, para que el ejecutor decida y quede
  // registrado por qué no hubo llamada.
  const text =
    format === 'json'
      ? buildJson(diff, includedSteps, actions, input.base, input.modified, strategy === 'trace-diff')
      : strategy === 'state-diff'
        ? buildStateDiff(diff, includedSteps, actions)
        : buildTraceDiff(diff, includedSteps, actions);

  return {
    strategy,
    format,
    text,
    includedSteps,
    pruned: true,
    gated: includedSteps.length === 0,
    lineCount: text === '' ? 0 : text.split('\n').length,
  };
}
