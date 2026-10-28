/**
 * Script que corre DENTRO de la página, antes de cualquier código de la
 * aplicación. Registra únicamente eventos con significado para la
 * accesibilidad.
 *
 * Dos decisiones de diseño que afectan la medición y que por tanto van
 * documentadas en la sección 3.6:
 *
 *  1. Las mutaciones que llegan en un mismo lote del MutationObserver se
 *     COALESCEN en un solo anuncio por región live. Un render de React puede
 *     producir varias mutaciones para un mismo cambio perceptible, y contarlas
 *     por separado genera ruido que no corresponde a ninguna diferencia real.
 *
 *  2. Las altas y bajas de nodos se registran solo cuando el nodo es
 *     interactivo o contiene algo interactivo. Un carrusel que anima
 *     contenedores decorativos produciría cientos de eventos sin valor de
 *     accesibilidad y ahogaría la señal en una app grande.
 *
 * El observador se instala sobre `document` y NO sobre `document.documentElement`.
 * No es indiferente: este script corre antes de cualquier código de la página,
 * cuando `document.readyState` es "loading" y `document.documentElement` todavía
 * vale null. Observar null lanza una excepción que aborta el resto del script, y
 * como los escuchadores de foco y teclado ya quedaron registrados, la captura
 * sigue produciendo trazas creíbles a las que les falta TODO lo que depende de
 * mutaciones: anuncios, cambios ARIA y altas y bajas de nodos. El fallo es
 * silencioso y produce comparaciones con cero diferencias, que se interpretarían
 * como un punto ciego del método en lugar de como un defecto del instrumento.
 *
 * Por eso además el script publica `__A11Y_READY` y `__A11Y_ERROR`, y el
 * capturador verifica de forma activa que el observador reporta cambios antes de
 * ejecutar el escenario.
 *
 * Identidad de los elementos. Un elemento que no genera nodo propio en el árbol
 * de accesibilidad no tiene identidad propia: se identifica por el nodo que la
 * tecnología asistiva sí percibe. De ahí las dos reglas complementarias de
 * `refOf` y `refOfSubtree`, cada una en la dirección que corresponde a lo que el
 * evento afirma:
 *
 *  · Para el objeto de un evento y para el contenedor de un alta o una baja, se
 *    sube al ancestro más cercano que tenga rol. "Se insertó algo en el
 *    formulario" es el hecho; en cuál de los `div` de maquetación aterrizó, no.
 *    Sin esta regla, envolver unos campos en un `div` para colgarle una clase de
 *    CSS hacía divergir el par, y eso apareció medido como falso positivo en el
 *    control negativo m03 de a08-contacto.
 *
 *  · Para el nodo dado de alta o de baja se baja al primer descendiente que
 *    tenga rol, porque subir devolvería el contenedor y se perdería justamente
 *    la información del evento: qué apareció o desapareció.
 *
 * Nombre accesible. El respaldo por `textContent` se aplica solo a los roles que
 * toman el nombre de su contenido. Un `form`, una `region` o una `list` no lo
 * hacen: su nombre viene de `aria-label`, `aria-labelledby`, `caption`, `legend`
 * o `figcaption`. Tomarlo del contenido hacía que el nombre del contenedor
 * cambiara cada vez que cambiaba cualquier texto interior, de modo que toda alta
 * dentro de un formulario era sensible a cualquier cambio de texto en otra parte
 * del mismo formulario. Era un falso positivo latente en las diez apps que
 * ningún control negativo había provocado todavía.
 */
export const INSTRUMENT = String.raw`
(() => {
  const events = [];
  // Los enlaces se publican ANTES de cualquier trabajo que pueda fallar, para
  // que el capturador siempre pueda consultar el estado del instrumento.
  window.__A11Y_TRACE = events;
  window.__A11Y_DRAIN = function () { return events.splice(0, events.length); };
  window.__A11Y_READY = false;

  try {

  const LIVE_ROLES = new Set(['status', 'alert', 'log', 'marquee', 'timer']);
  const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [tabindex], [role], [contenteditable]';
  const WATCHED_ATTRS = [
    'role', 'aria-live', 'aria-atomic', 'aria-relevant', 'aria-label',
    'aria-labelledby', 'aria-describedby', 'aria-expanded', 'aria-hidden',
    'aria-current', 'aria-selected', 'aria-checked', 'aria-disabled',
    'aria-invalid', 'aria-busy', 'aria-activedescendant', 'aria-controls',
    'aria-haspopup', 'tabindex', 'hidden', 'disabled', 'open'
  ];

  function clean(value) {
    return (value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  function elementOf(node) {
    if (!node) return null;
    if (node.nodeType === 3) return node.parentElement;
    return node.nodeType === 1 ? node : null;
  }

  function pathOf(element) {
    if (!element) return '(none)';
    const parts = [];
    let current = element;
    while (current && current.nodeType === 1 && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      let segment = tag;
      if (parent) {
        const siblings = Array.prototype.filter.call(
          parent.children,
          function (child) { return child.tagName === current.tagName; }
        );
        if (siblings.length > 1) {
          segment = tag + '[' + (siblings.indexOf(current) + 1) + ']';
        }
      }
      parts.unshift(segment);
      current = parent;
    }
    return parts.join('/') || '(root)';
  }

  /**
   * Mapa de roles implícitos por etiqueta. Un tag AUSENTE de este mapa no aporta
   * identidad: no genera nodo propio en el árbol de accesibilidad. Es
   * deliberadamente una lista explícita y no un respaldo al nombre de la
   * etiqueta: ese respaldo le daba rol "div" a un contenedor de maquetación.
   *
   * Es una aproximación: el valor autoritativo del rol y del nombre viene del
   * árbol que el capturador pide por CDP. Esto sirve para identificar el
   * elemento en el instante del evento, cuando el árbol todavía no se consultó.
   */
  const TAG_ROLES = {
    a: 'link', button: 'button', select: 'combobox', textarea: 'textbox',
    summary: 'button', dialog: 'dialog', nav: 'navigation', main: 'main',
    form: 'form', search: 'search', article: 'article', aside: 'complementary',
    ul: 'list', ol: 'list', menu: 'list', dl: 'list', li: 'listitem',
    table: 'table', thead: 'rowgroup', tbody: 'rowgroup', tfoot: 'rowgroup',
    tr: 'row', td: 'cell', caption: 'caption', figure: 'figure',
    fieldset: 'group', details: 'group', optgroup: 'group', option: 'option',
    output: 'status', progress: 'progressbar', meter: 'meter',
    hr: 'separator', img: 'img', p: 'paragraph', blockquote: 'blockquote',
    body: 'document'
  };

  const INPUT_ROLES = {
    checkbox: 'checkbox', radio: 'radio', range: 'slider',
    number: 'spinbutton', search: 'searchbox', button: 'button',
    submit: 'button', reset: 'button', image: 'button', hidden: ''
  };

  /** Roles cuyo nombre accesible se computa a partir del contenido. */
  const NAME_FROM_CONTENT = new Set([
    'button', 'link', 'heading', 'option', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'tab', 'cell', 'gridcell', 'columnheader', 'rowheader',
    'row', 'checkbox', 'radio', 'switch', 'tooltip', 'treeitem', 'caption',
    'figure', 'paragraph', 'blockquote'
  ]);

  /** Contenido de seccionamiento: dentro de él, header y footer no son puntos
   *  de referencia de la página. */
  const SECTIONING = 'article, aside, main, nav, section';

  function roleOf(element) {
    if (!element || element.nodeType !== 1) return '';
    const explicit = element.getAttribute('role');
    if (explicit) return explicit.split(/\s+/)[0];
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'a') return element.hasAttribute('href') ? 'link' : '';
    if (tag === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase();
      const mapped = INPUT_ROLES[type];
      return mapped === undefined ? 'textbox' : mapped;
    }
    if (tag === 'th') {
      return (element.getAttribute('scope') || '') === 'row' ? 'rowheader' : 'columnheader';
    }
    // section solo es region si tiene nombre accesible.
    if (tag === 'section') {
      return element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')
        ? 'region' : '';
    }
    // header y footer solo son banner y contentinfo en el nivel de la pagina.
    if (tag === 'header' || tag === 'footer') {
      if (element.parentElement && element.parentElement.closest(SECTIONING)) return '';
      return tag === 'header' ? 'banner' : 'contentinfo';
    }
    const mapped = TAG_ROLES[tag];
    return mapped === undefined ? '' : mapped;
  }

  /** Nombre del elemento por los mecanismos de etiquetado, y solo por
   *  contenido cuando el rol lo admite. */
  function nameOf(element) {
    if (!element) return '';
    const label = element.getAttribute('aria-label');
    if (label) return clean(label);
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map(function (id) {
        const target = document.getElementById(id);
        return target ? target.textContent : '';
      }).join(' ');
      if (clean(text)) return clean(text);
    }
    if (element.labels && element.labels.length) return clean(element.labels[0].textContent);
    const child = element.querySelector(':scope > caption, :scope > legend, :scope > figcaption');
    if (child) return clean(child.textContent);
    const title = element.getAttribute('title');
    if (title) return clean(title);
    if (NAME_FROM_CONTENT.has(roleOf(element))) return clean(element.textContent);
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return clean(placeholder);
    return '';
  }

  function describe(element) {
    return { path: pathOf(element), role: roleOf(element), name: nameOf(element) };
  }

  const NO_REF = { path: '(none)', role: '', name: '' };

  /** Objeto de un evento, o contenedor de un alta o una baja: se sube. */
  function refOf(node) {
    let current = elementOf(node);
    while (current && current.nodeType === 1) {
      if (roleOf(current)) return describe(current);
      current = current.parentElement;
    }
    return NO_REF;
  }

  /** Nodo dado de alta o de baja: se baja, para no perder que fue lo que
   *  aparecio o desaparecio. */
  function refOfSubtree(node) {
    const element = node && node.nodeType === 1 ? node : null;
    if (!element) return refOf(node);
    if (roleOf(element)) return describe(element);
    const inner = element.querySelectorAll('*');
    for (let i = 0; i < inner.length; i += 1) {
      if (roleOf(inner[i])) return describe(inner[i]);
    }
    return refOf(element);
  }

  function isInteresting(node) {
    const element = node && node.nodeType === 1 ? node : null;
    if (!element) return false;
    if (element.matches(INTERACTIVE)) return true;
    return element.querySelector(INTERACTIVE) !== null;
  }

  function liveAncestor(node) {
    let current = elementOf(node);
    while (current && current.nodeType === 1) {
      const live = current.getAttribute('aria-live');
      const role = current.getAttribute('role');
      if ((live && live !== 'off') || (role && LIVE_ROLES.has(role))) return current;
      current = current.parentElement;
    }
    return null;
  }

  function politenessOf(element) {
    const live = element.getAttribute('aria-live');
    if (live) return live;
    return element.getAttribute('role') === 'alert' ? 'assertive' : 'polite';
  }

  document.addEventListener('focusin', function (event) {
    events.push({ kind: 'focus', target: refOf(event.target) });
  }, true);

  document.addEventListener('focusout', function (event) {
    events.push({ kind: 'blur', target: refOf(event.target) });
  }, true);

  document.addEventListener('keydown', function (event) {
    events.push({ kind: 'key', phase: 'down', key: event.key, target: refOf(event.target) });
  }, true);

  document.addEventListener('keyup', function (event) {
    events.push({ kind: 'key', phase: 'up', key: event.key, target: refOf(event.target) });
  }, true);

  const observer = new MutationObserver(function (records) {
    const announced = new Map();

    for (const record of records) {
      if (record.type === 'attributes') {
        const element = record.target;
        const attribute = record.attributeName;
        events.push({
          kind: 'aria-change',
          target: refOf(element),
          attribute: attribute,
          from: record.oldValue === null ? null : clean(record.oldValue),
          to: element.getAttribute(attribute) === null ? null : clean(element.getAttribute(attribute))
        });
        continue;
      }

      const touched = [];
      if (record.type === 'characterData') touched.push(record.target);
      for (const node of record.addedNodes) touched.push(node);
      for (const node of record.removedNodes) touched.push(node);

      for (const node of touched) {
        const live = liveAncestor(node) || liveAncestor(record.target);
        if (live) { announced.set(live, true); continue; }
        if (record.type === 'characterData') continue;
        if (!isInteresting(node)) continue;
        const added = Array.prototype.indexOf.call(record.addedNodes, node) !== -1;
        events.push({
          kind: added ? 'dom-add' : 'dom-remove',
          parent: refOf(record.target),
          node: refOfSubtree(node)
        });
      }
    }

    for (const live of announced.keys()) {
      events.push({
        kind: 'announcement',
        target: refOf(live),
        politeness: politenessOf(live),
        text: clean(live.textContent)
      });
    }
  });

  // Se observa document y no document.documentElement: ver la nota del encabezado.
  observer.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    characterDataOldValue: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: WATCHED_ATTRS
  });

    window.__A11Y_READY = true;
  } catch (error) {
    window.__A11Y_ERROR = error && error.message ? error.message : String(error);
  }
})();
`;
