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

  function roleOf(element) {
    if (!element) return '';
    const explicit = element.getAttribute('role');
    if (explicit) return explicit;
    const tag = element.tagName.toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'a') return element.hasAttribute('href') ? 'link' : 'generic';
    if (tag === 'select') return 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'summary') return 'button';
    if (tag === 'dialog') return 'dialog';
    if (tag === 'nav') return 'navigation';
    if (tag === 'main') return 'main';
    if (tag === 'form') return 'form';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
      return 'textbox';
    }
    return tag;
  }

  /** Aproximación al nombre accesible. El valor autoritativo viene del arbol
   *  de accesibilidad que el capturador pide por CDP; esto es para poder
   *  identificar el elemento en el instante del evento. */
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
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return clean(placeholder);
    return clean(element.textContent);
  }

  function refOf(node) {
    const element = elementOf(node);
    if (!element) return { path: '(none)', role: '', name: '' };
    return { path: pathOf(element), role: roleOf(element), name: nameOf(element) };
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
          node: refOf(node)
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
