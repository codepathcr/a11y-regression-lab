import type { Browser, CDPSession, Page } from 'playwright';
import { INSTRUMENT } from './instrument';
import type { AxNode, CaptureOptions, Step, StepRecord, Trace, TraceEvent } from './types';

/** Período de quietud por omisión tras cada acción. Es el parámetro que más
 *  influye en el ruido: demasiado corto pierde eventos tardíos, demasiado
 *  largo encarece la captura sin ganar nada. Parametrizable y volcado en la
 *  traza para que ninguna cifra dependa de leer el código. */
export const DEFAULT_SETTLE_MS = 150;

/**
 * Espera máxima a que el harness señale que está listo.
 *
 * Es configurable por `CaptureOptions.readyTimeoutMs` porque depende de la app:
 * una con cargas asíncronas simuladas necesita más que una estática, y en una
 * máquina cargada el montaje tarda más. Quince segundos es holgado para las diez
 * apps del benchmark.
 */
export const DEFAULT_READY_TIMEOUT_MS = 15_000;

/** Ver la nota de `actionTimeoutMs` en types.ts. */
export const DEFAULT_ACTION_TIMEOUT_MS = 2_000;

declare global {
  interface Window {
    __A11Y_DRAIN: () => TraceEvent[];
    __A11Y_READY?: boolean;
    __A11Y_ERROR?: string;
  }
}

function drain(page: Page): Promise<TraceEvent[]> {
  return page.evaluate(() => window.__A11Y_DRAIN());
}

interface RawAxNode {
  nodeId: string;
  ignored?: boolean;
  role?: { value?: unknown };
  name?: { value?: unknown };
  value?: { value?: unknown };
  childIds?: string[];
  properties?: Array<{ name: string; value?: { value?: unknown } }>;
}

/**
 * Árbol de accesibilidad según el propio navegador. No se reimplementa el
 * algoritmo de cómputo del nombre accesible: se lee el resultado de Chromium,
 * que es la fuente autoritativa y la que usan las tecnologías asistivas.
 */
async function axSnapshot(cdp: CDPSession): Promise<AxNode[]> {
  const response = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: RawAxNode[] };
  const byId = new Map(response.nodes.map((node) => [node.nodeId, node]));
  const out: AxNode[] = [];
  const root = response.nodes[0];
  if (!root) return out;

  const visit = (id: string, depth: number): void => {
    const node = byId.get(id);
    if (!node) return;

    if (!node.ignored) {
      const property = (name: string): unknown =>
        node.properties?.find((entry) => entry.name === name)?.value?.value;
      out.push({
        role: String(node.role?.value ?? ''),
        name: String(node.name?.value ?? ''),
        value: String(node.value?.value ?? ''),
        live: String(property('live') ?? ''),
        focused: Boolean(property('focused')),
        depth,
      });
    }

    for (const child of node.childIds ?? []) {
      visit(child, node.ignored ? depth : depth + 1);
    }
  };

  visit(root.nodeId, 0);
  return out;
}

/**
 * Verifica que el instrumento esté vivo ANTES de ejecutar el escenario.
 *
 * No es una comprobación defensiva de rutina: el observador de mutaciones es la
 * parte que puede fallar en silencio, y cuando falla la captura sigue
 * produciendo trazas verosímiles —con foco y teclado— a las que les faltan los
 * anuncios y los cambios ARIA. La comparación entre versiones da entonces cero
 * diferencias, y ese cero se interpretaría como un límite del método en lugar de
 * como un defecto del instrumento.
 *
 * La prueba es activa: se provoca un cambio de atributo observable y se exige
 * verlo en la cola de eventos. El atributo se retira y la cola se vacía, de modo
 * que la verificación no deja rastro en la traza.
 */
async function verifyInstrument(page: Page): Promise<void> {
  const state = await page.evaluate(() => ({
    ready: window.__A11Y_READY === true,
    error: window.__A11Y_ERROR ?? null,
  }));

  if (state.error) {
    throw new Error(`La instrumentación falló dentro de la página: ${state.error}`);
  }
  if (!state.ready) {
    throw new Error('La instrumentación no se instaló en la página.');
  }

  await page.evaluate(() => document.documentElement.setAttribute('aria-busy', 'true'));
  await page.waitForTimeout(30);
  const probe = await drain(page);
  await page.evaluate(() => document.documentElement.removeAttribute('aria-busy'));
  await page.waitForTimeout(30);
  await drain(page);

  const observed = probe.some(
    (event) => event.kind === 'aria-change' && event.attribute === 'aria-busy'
  );

  if (!observed) {
    throw new Error(
      'El observador de mutaciones no reporta cambios. Sin él la traza pierde anuncios, ' +
        'cambios ARIA y altas y bajas de nodos, y toda comparación entre versiones daría ' +
        'cero diferencias de forma silenciosa.'
    );
  }
}

/**
 * Clasificación determinista del fallo de un paso.
 *
 * El mensaje crudo del navegador incluye el plazo agotado y fragmentos de la
 * página, de modo que no puede entrar en la comparación sin introducir ruido.
 * Esta clasificación sí, y distingue los dos casos que importan: el elemento no
 * está, o la acción no pudo completarse por otra razón.
 */
function classifyFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Timeout|waiting for|not found|no element/i.test(message)) {
    return 'elemento no disponible';
  }
  return 'accion no ejecutable';
}

async function perform(page: Page, step: Step, settleMs: number, timeout: number): Promise<void> {
  switch (step.action) {
    case 'focus':
      await page.focus(step.selector!, { timeout });
      break;
    case 'fill':
      await page.fill(step.selector!, step.value ?? '', { timeout });
      break;
    case 'click':
      await page.click(step.selector!, { timeout });
      break;
    case 'press':
      await page.keyboard.press(step.key ?? 'Tab');
      break;
    case 'settle':
      break;
  }
  await page.waitForTimeout(step.ms ?? settleMs);
}

function describe(step: Step): string {
  const target = step.selector ? ` ${step.selector}` : '';
  const key = step.key ? ` ${step.key}` : '';
  const value = step.value === undefined ? '' : ` = "${step.value}"`;
  return `${step.action}${target}${key}${value}`;
}

/**
 * Ejecuta un escenario sobre una URL y devuelve su traza.
 *
 * La función no sabe nada de versiones, mutaciones ni benchmark: recibe una URL
 * y un escenario. Es lo que permite usar el mismo framework sobre dos commits
 * de un Pull Request real, donde base y modificada son dos despliegues
 * distintos y no dos variantes del mismo build.
 */
/**
 * Espera que el harness señale que está listo, o que informe por qué no.
 *
 * El contrato con cualquier harness son dos atributos en `documentElement`:
 * `data-harness-ready="true"` cuando la página está estable, y
 * `data-harness-error` con el motivo cuando no va a estarlo. El segundo existe
 * porque sin él todo fallo de montaje se manifestaba igual —un timeout de quince
 * segundos— y el motivo quedaba sin reportar: una variante ausente del build, un
 * módulo que lanza al importarse y una app genuinamente lenta producían el mismo
 * mensaje inútil.
 */
async function waitForHarness(page: Page, url: string, timeout: number): Promise<void> {
  const ready = page
    .waitForSelector('html[data-harness-ready="true"]', { timeout })
    .then(() => 'ready' as const)
    .catch(() => 'timeout' as const);
  const failed = page
    .waitForSelector('html[data-harness-error]', { timeout })
    .then(() => 'error' as const)
    .catch(() => 'timeout' as const);

  const outcome = await Promise.race([ready, failed]);

  if (outcome === 'error') {
    const detail = await page
      .evaluate(() => document.documentElement.getAttribute('data-harness-error'))
      .catch(() => null);
    throw new Error(`El harness reportó un error en ${url}: ${detail ?? 'sin detalle'}`);
  }

  if (outcome === 'timeout') {
    // Puede haber resuelto entre el vencimiento y esta comprobación.
    const state = await page
      .evaluate(() => ({
        ready: document.documentElement.getAttribute('data-harness-ready'),
        error: document.documentElement.getAttribute('data-harness-error'),
      }))
      .catch(() => ({ ready: null, error: null }));

    if (state.error) {
      throw new Error(`El harness reportó un error en ${url}: ${state.error}`);
    }
    if (state.ready === 'true') return;

    throw new Error(
      `La página no señaló estar lista en ${timeout} ms: ${url}. ` +
        'No llegó ni data-harness-ready ni data-harness-error, de modo que el harness no montó: ' +
        'revisá la consola de la página y que el build esté al día.'
    );
  }
}

export async function captureTrace(browser: Browser, options: CaptureOptions): Promise<Trace> {
  const settleMs = options.settleMs ?? DEFAULT_SETTLE_MS;
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  const actionTimeoutMs = options.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS;
  const viewport = options.viewport ?? { width: 1280, height: 900 };

  const context = await browser.newContext({ viewport });
  await context.addInitScript({ content: INSTRUMENT });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Accessibility.enable');

  try {
    await page.goto(options.url, { waitUntil: 'load' });
    await waitForHarness(page, options.url, readyTimeoutMs);
    await page.waitForTimeout(settleMs);
    await verifyInstrument(page);

    const steps: StepRecord[] = [];

    // Paso 0: el montaje. Su lista de eventos se descarta porque la
    // construcción inicial del árbol produce decenas de mutaciones sin valor
    // diferencial; lo que se conserva es el árbol de accesibilidad resultante,
    // que sí es comparable entre versiones.
    await drain(page);
    steps.push({
      index: 0,
      action: 'mount',
      events: [],
      ax: await axSnapshot(cdp),
      elapsedMs: 0,
    });

    for (let index = 0; index < options.scenario.steps.length; index += 1) {
      const step = options.scenario.steps[index];
      const startedAt = Date.now();

      // Un paso que falla NO aborta la captura. Una regresión puede volver el
      // escenario inejecutable, y seguir recorriéndolo documenta hasta dónde
      // llega la divergencia en lugar de perder el caso entero.
      let failure: string | undefined;
      let failureDetail: string | undefined;
      try {
        await perform(page, step, settleMs, actionTimeoutMs);
      } catch (error) {
        failure = classifyFailure(error);
        failureDetail = error instanceof Error ? error.message.split('\n')[0] : String(error);
      }

      const elapsedMs = Date.now() - startedAt;
      steps.push({
        index: index + 1,
        action: describe(step),
        events: await drain(page),
        ax: await axSnapshot(cdp),
        elapsedMs,
        ...(failure ? { failure, failureDetail } : {}),
      });
    }

    return {
      url: options.url,
      scenarioId: options.scenario.id,
      repetition: options.repetition ?? 1,
      environment: {
        browser: browser.browserType().name(),
        browserVersion: browser.version(),
        settleMs,
        viewport,
      },
      steps,
    };
  } finally {
    await context.close();
  }
}
