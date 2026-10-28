import { CATEGORIES, CATEGORY_CRITERIA } from './categories';
import type { Category } from './categories';
import type { Completion, EvidenceFormat, Strategy } from './types';
import type { Evidence } from './evidence';

/**
 * Enunciado del sistema, idéntico para las tres estrategias y para todos los
 * modelos.
 *
 * El alcance aprobado exige "instrucciones y formatos de salida equivalentes"
 * entre modelos. Equivalentes acá significa idénticas: cualquier ajuste por
 * modelo convertiría la comparación entre modelos en una comparación entre
 * prompts.
 *
 * Tres decisiones del enunciado, cada una con su motivo:
 *
 *  1. Dice de forma explícita que "sin regresión" es una respuesta esperada y
 *     frecuente. Sin eso, un modelo al que se le entrega evidencia y se le
 *     pregunta si hay un defecto tiende a encontrar uno: es el sesgo de la
 *     tarea, y con dieciocho controles negativos en la muestra se traduciría
 *     directamente en falsos positivos.
 *  2. Lista las cuatro categorías con su texto literal y su criterio WCAG. El
 *     resolvedor de categorías no acepta sinónimos ni traducciones, de modo que
 *     sería injusto no darle al modelo las cadenas exactas que se le exigen.
 *  3. No menciona mutaciones, operadores ni benchmark. Decir que la versión
 *     modificada proviene de una mutación controlada revelaría que existe un
 *     defecto plantado y anularía los controles negativos.
 */
export const SYSTEM_PROMPT = [
  'Sos un revisor de accesibilidad web especializado en regresiones que dependen de la interacción.',
  '',
  'Tu tarea es determinar si el cambio que se te presenta introdujo una regresión de accesibilidad',
  'de alguna de las cuatro categorías listadas abajo, y nada más. No audites la accesibilidad',
  'general de la página ni señales problemas preexistentes: solo interesa lo que el cambio introdujo.',
  '',
  'La mayoría de los cambios en un proyecto real NO introducen ninguna regresión de accesibilidad.',
  'Responder que no hay regresión es una respuesta correcta, esperada y frecuente. No busques un',
  'defecto por el hecho de que se te haya pedido revisar: si la evidencia no sostiene una regresión,',
  'respondé que no hay.',
  '',
  'Las cuatro categorías, con su criterio de las WCAG 2.2:',
  ...CATEGORIES.map(
    (category: Category) =>
      `  · "${category}" — criterio${CATEGORY_CRITERIA[category].length > 1 ? 's' : ''} ${CATEGORY_CRITERIA[category].join(' y ')}`
  ),
  '',
  'Si observás un problema que no encaja en ninguna de las cuatro, no es parte de esta tarea:',
  'respondé que no hay regresión.',
  '',
  'Respondé ÚNICAMENTE con un objeto JSON, sin texto antes ni después, con estos cuatro campos:',
  '',
  '  {',
  '    "regression": true | false,',
  '    "category": una de las cuatro cadenas literales de arriba, o null si regression es false,',
  '    "transitionStep": el número de paso donde aparece la regresión, o null si regression es false,',
  '    "evidence": una o dos frases citando lo concreto de la evidencia que sostiene tu respuesta',
  '  }',
  '',
  'El número de paso es el que encabeza cada bloque de la evidencia. Si la regresión se manifiesta',
  'en varios pasos, nombrá el primero. Copiá la categoría exactamente como está escrita arriba.',
].join('\n');

const INTRO: Record<Strategy, string[]> = {
  static: [
    'Se te entrega el árbol de accesibilidad de UNA versión de una aplicación web, capturado en cada',
    'paso de un recorrido de interacción. Cada bloque indica el paso, la acción que se ejecutó y el',
    'árbol de accesibilidad resultante.',
    '',
    'Determiná si esta versión presenta una regresión de accesibilidad de las cuatro categorías.',
  ],
  'state-diff': [
    'Se te entregan las DIFERENCIAS entre el árbol de accesibilidad de una versión base y el de una',
    'versión modificada por un cambio, en cada paso de un mismo recorrido de interacción ejecutado',
    'sobre las dos. Las líneas con "- base" existen solo en la versión base; las líneas con',
    '"+ modificada" existen solo en la versión modificada. Solo se incluyen los pasos donde algo',
    'difiere.',
    '',
    'Determiná si el cambio introdujo una regresión de accesibilidad de las cuatro categorías.',
  ],
  'trace-diff': [
    'Se te entregan las DIFERENCIAS entre una versión base y una versión modificada por un cambio, en',
    'cada paso de un mismo recorrido de interacción ejecutado sobre las dos. Por cada paso hay dos',
    'bloques: los eventos observados durante la transición —teclas, movimientos de foco, anuncios de',
    'regiones live, cambios de atributos ARIA, altas y bajas de nodos— y el árbol de accesibilidad',
    'resultante. Las líneas con "- base" existen solo en la versión base; las líneas con',
    '"+ modificada" existen solo en la versión modificada. Solo se incluyen los pasos donde algo',
    'difiere.',
    '',
    'Determiná si el cambio introdujo una regresión de accesibilidad de las cuatro categorías.',
  ],
};

/**
 * Descripción del formato de la evidencia.
 *
 * Es lo único que cambia entre los dos formatos además de la evidencia misma. Un
 * formato sin explicar obligaría al modelo a inferir la convención, y el piloto
 * mediría esa inferencia en lugar del formato.
 */
const FORMAT_NOTE: Record<EvidenceFormat, string[]> = {
  lines: [],
  json: [
    'La evidencia viene como un objeto JSON. Cada entrada de "pasos" tiene el número de paso, la',
    'acción que se ejecutó y las diferencias en dos conjuntos: "eventos" y "arbol". Dentro de cada',
    'uno, "soloEnBase" son los elementos que existen solo en la versión base y "soloEnModificada"',
    'los que existen solo en la modificada.',
    'Los nodos del árbol de accesibilidad vienen como tuplas, y el campo "formato" del documento',
    'declara el orden de sus componentes.',
  ],
};

export interface PromptInput {
  appTitle: string;
  evidence: Evidence;
}

/** Arma la consulta de una estrategia. El enunciado del sistema es común; lo
 *  único que cambia entre estrategias es la descripción de la evidencia y la
 *  evidencia misma. */
export function buildPrompt({ appTitle, evidence }: PromptInput): Completion {
  const formatNote = FORMAT_NOTE[evidence.format];
  const user = [
    `Aplicación: ${appTitle}`,
    '',
    ...INTRO[evidence.strategy],
    ...(formatNote.length > 0 ? ['', ...formatNote] : []),
    '',
    '---',
    '',
    evidence.text === '' ? '(no hay diferencias en ningún paso)' : evidence.text,
  ].join('\n');

  return { system: SYSTEM_PROMPT, user };
}
