import type { AxNode, ElementRef, Trace, TraceEvent } from './types';

/**
 * Reglas de normalización.
 *
 * Cada regla elimina variación que no corresponde a ninguna diferencia
 * perceptible. Toda regla agregada acá es una decisión metodológica que debe
 * quedar declarada en el capítulo 3: normalizar de más esconde regresiones
 * reales, normalizar de menos ahoga la señal en ruido.
 */

/** Patrones de valores que cambian entre ejecuciones sin cambiar el
 *  comportamiento. */
const VOLATILE: RegExp[] = [
  /:r[0-9a-z]+:/g, // identificadores generados por useId de React
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // uuid
  /\b\d{13,}\b/g, // marcas de tiempo en milisegundos
];

function scrub(value: string): string {
  let out = value;
  for (const pattern of VOLATILE) out = out.replace(pattern, '<volatil>');
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Cómo se identifica un elemento al comparar.
 *
 * `structural` usa la ruta en el DOM. Es precisa pero frágil: un contenedor de
 * maquetación añadido por una refactorización neutral desplaza la ruta de todo
 * lo que envuelve y produce diferencias falsas.
 *
 * `semantic` usa rol y nombre accesible, que es lo que percibe una persona que
 * usa tecnología asistiva. Sobrevive a cambios estructurales, pero no distingue
 * dos elementos con el mismo rol y el mismo nombre.
 *
 * `both` exige coincidencia en ambas. Es la más estricta y la que más falsos
 * positivos produce.
 *
 * Cuál usar es una decisión que se toma con los datos de la fase de ruido, no
 * por anticipado. Por eso la captura registra las dos vías y la elección vive
 * acá, en la normalización.
 */
export type IdentityMode = 'structural' | 'semantic' | 'both';

export interface NormalizeOptions {
  identity?: IdentityMode;
  /** Omitir los eventos de teclado de la comparación. Son necesarios para el
   *  criterio 2.1.1 pero duplican el volumen (una pulsación produce down y up). */
  includeKeyEvents?: boolean;
}

function refLine(ref: ElementRef, identity: IdentityMode): string {
  const semantic = `${ref.role}"${scrub(ref.name)}"`;
  if (identity === 'semantic') return semantic;
  if (identity === 'structural') return scrub(ref.path);
  return `${scrub(ref.path)} ${semantic}`;
}

/** Serializa un evento a una línea comparable. La comparación se hace sobre
 *  texto y no sobre objetos para que el diff sea legible por una persona y
 *  presentable a un modelo de lenguaje sin transformación adicional. */
export function eventLine(event: TraceEvent, identity: IdentityMode = 'both'): string {
  switch (event.kind) {
    case 'focus':
      return `focus ${refLine(event.target, identity)}`;
    case 'blur':
      return `blur ${refLine(event.target, identity)}`;
    case 'key':
      return `key ${event.phase} ${event.key} on ${refLine(event.target, identity)}`;
    case 'announcement':
      return `announcement ${refLine(event.target, identity)} politeness=${event.politeness} text="${scrub(event.text)}"`;
    case 'aria-change': {
      // Los valores se limpian igual que los nombres: un atributo como
      // aria-describedby contiene identificadores generados por useId, y el
      // contador de React se desplaza si una versión monta un componente más.
      // Sin limpiarlos, un cambio estructural inocuo produce diferencias falsas.
      const from = event.from === null ? '-' : scrub(event.from);
      const to = event.to === null ? '-' : scrub(event.to);
      return `aria-change ${refLine(event.target, identity)} ${event.attribute}: ${from} -> ${to}`;
    }
    case 'dom-add':
      return `dom-add into ${refLine(event.parent, identity)} << ${refLine(event.node, identity)}`;
    case 'dom-remove':
      return `dom-remove from ${refLine(event.parent, identity)} >> ${refLine(event.node, identity)}`;
  }
}

export function axLine(node: AxNode): string {
  const live = node.live ? ` live=${node.live}` : '';
  const value = node.value ? ` value="${scrub(node.value)}"` : '';
  const focused = node.focused ? ' focused' : '';
  return `${'  '.repeat(node.depth)}${node.role} "${scrub(node.name)}"${value}${live}${focused}`;
}

export interface NormalizedStep {
  index: number;
  action: string;
  events: string[];
  ax: string[];
}

export function normalize(trace: Trace, options: NormalizeOptions = {}): NormalizedStep[] {
  // `semantic` por omisión, y la decisión la tomó el dato: en el control
  // negativo de a01-landing —una refactorización que no altera la
  // accesibilidad— la identidad estructural produjo 41,2% de divergencia falsa
  // y la semántica 0,0%. Rol y nombre accesible es además lo que percibe una
  // persona usando tecnología asistiva.
  //
  // El script de medición sigue reportando las tres identidades, de modo que la
  // decisión quede a la vista y pueda revisarse al incorporar más apps.
  const identity = options.identity ?? 'semantic';
  const includeKeyEvents = options.includeKeyEvents ?? true;

  return trace.steps.map((step) => ({
    index: step.index,
    action: step.action,
    events: step.events
      .filter((event) => includeKeyEvents || event.kind !== 'key')
      .map((event) => eventLine(event, identity)),
    ax: step.ax.map(axLine),
  }));
}
