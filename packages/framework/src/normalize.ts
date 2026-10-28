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
  /**
   * Colocar los eventos de teclado al inicio de su paso, antes de las
   * respuestas de la página. Verdadero por omisión.
   *
   * Es una regla de normalización, no una comodidad, y la midió la fase 4: en
   * la app del estrato grande la ÚNICA fuente de ruido entre corridas idénticas
   * era la posición de un `keyup` respecto de los eventos derivados de
   * mutaciones. El `keyup` llega como macrotask y las mutaciones se vacían en
   * microtasks, de modo que cuál se registra primero depende de milisegundos.
   *
   * La justificación para estabilizarlo: los eventos de teclado son el
   * **estímulo que inyecta el escenario**, no una respuesta de la aplicación.
   * Su posición relativa a las respuestas no describe ningún comportamiento de
   * la interfaz —el guion decide el estímulo y su orden es conocido—, mientras
   * que el orden en que la página reacciona sí es comportamiento y se conserva
   * intacto.
   *
   * Ponerlo en falso devuelve el orden observado y permite volver a medir el
   * ruido que esta regla elimina.
   */
  stableKeyOrder?: boolean;
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

/**
 * Nodos del árbol que se descartan antes de comparar.
 *
 * `InlineTextBox` es la representación de caja de línea del motor de
 * maquetación, no semántica: duplica el contenido del `StaticText` que lo
 * contiene y depende del ancho de la ventana y de la fuente. Un viewport
 * distinto cambiaría el árbol sin que cambie nada de la accesibilidad, de modo
 * que conservarlo introduce ruido ajeno al fenómeno y además duplica el tamaño
 * de la evidencia que se entrega al modelo.
 */
const LAYOUT_ROLES = new Set(['InlineTextBox']);

const TEXT_ROLE = 'StaticText';

/**
 * Prepara el árbol para comparar: descarta los nodos de maquetación y **une los
 * nodos de texto contiguos** del mismo nivel.
 *
 * La unión no es cosmética. React produce un nodo de texto por cada expresión
 * interpolada, de modo que `{n} integrantes` genera dos nodos de texto y
 * `describeCount(n)` genera uno solo, con idéntico resultado para quien lee la
 * pantalla o la escucha. Sin unirlos, una refactorización que solo cambia cómo
 * se arma una cadena aparece como diferencia en el árbol.
 *
 * Lo detectó un control negativo de a06-equipo, que daba 3,0% de divergencia de
 * árbol sin ningún cambio semántico. Lo que una tecnología asistiva anuncia es
 * la concatenación, así que la concatenación es lo que debe compararse.
 *
 * Dos nodos de texto contiguos en el recorrido en orden de documento y con la
 * misma profundidad son necesariamente hermanos: un cambio de padre obligaría a
 * emitir antes un nodo de profundidad menor.
 *
 * La unión concatena en crudo y deja la normalización del espacio en blanco para
 * la serialización de la línea. Una versión anterior insertaba un espacio entre
 * fragmentos y corrompía los textos que no lo llevaban: un número de referencia
 * armado como `MUN-2026-0{x}12` quedaba como "MUN-2026-0 1 12". Lo detectó un
 * control negativo de a10-tramites.
 */
export function prepareAx(nodes: AxNode[]): AxNode[] {
  const kept = nodes.filter((node) => !LAYOUT_ROLES.has(node.role));
  const out: AxNode[] = [];

  for (const node of kept) {
    const previous = out.at(-1);
    const mergeable =
      previous !== undefined &&
      previous.role === TEXT_ROLE &&
      node.role === TEXT_ROLE &&
      previous.depth === node.depth &&
      !previous.focused &&
      !node.focused;

    if (mergeable) {
      // Concatenación EN CRUDO, sin separador. El espaciado viene dentro de los
      // propios fragmentos —`{n} integrantes` produce "3" y " integrantes"— y la
      // normalización del espacio en blanco ocurre despues, al serializar la
      // linea. Insertar un separador aqui corrompe el texto cuando los
      // fragmentos no llevaban espacio: `MUN-2026-0{x}12` se convertiria en
      // "MUN-2026-0 1 12".
      out[out.length - 1] = { ...previous, name: previous.name + node.name };
      continue;
    }
    out.push(node);
  }

  return out;
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
  const stableKeyOrder = options.stableKeyOrder ?? true;

  return trace.steps.map((step) => {
    const kept = step.events.filter((event) => includeKeyEvents || event.kind !== 'key');

    // El estímulo primero, las respuestas después, cada grupo en su orden
    // observado. Ver la nota de `stableKeyOrder`.
    const ordered = stableKeyOrder
      ? [
          ...kept.filter((event) => event.kind === 'key'),
          ...kept.filter((event) => event.kind !== 'key'),
        ]
      : kept;

    const lines = ordered.map((event) => eventLine(event, identity));

    // El fallo de un paso entra en la comparación como una línea más: que una
    // versión pueda ejecutar el escenario y la otra no es una diferencia de
    // comportamiento, y de las más fuertes.
    if (step.failure) {
      lines.push(`step-failed ${step.failure}`);
    }

    return {
      index: step.index,
      action: step.action,
      events: lines,
      ax: prepareAx(step.ax).map(axLine),
    };
  });
}
