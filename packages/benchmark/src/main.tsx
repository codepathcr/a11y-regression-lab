import { Suspense, lazy, useEffect } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import '@a11y-lab/ui/styles.css';

/**
 * Harness del benchmark. Monta cualquier variante de cualquier app según la URL:
 *
 *   /?app=a01-landing&variant=base
 *   /?app=a01-landing&variant=m01-kbd-activation
 *
 * Cada variante es un módulo de entrada propio que exporta por omisión un
 * componente sin props. La base compone la app con sus partes reales; un
 * mutante compone la misma app sustituyendo exactamente una parte. El diff
 * entre base y mutante es por tanto un solo módulo, igual que en un Pull
 * Request real.
 *
 * StrictMode queda deliberadamente **desactivado**: su doble montaje en
 * desarrollo duplica efectos y contamina la traza de interacción.
 */
const variantModules = import.meta.glob('../apps/*/variants/*.tsx') as Record<
  string,
  () => Promise<{ default: ComponentType }>
>;

function listVariants(): string[] {
  return Object.keys(variantModules)
    .map((key) => key.replace('../apps/', '').replace('/variants/', ' · ').replace('.tsx', ''))
    .sort();
}

/**
 * Marca el documento como estable. El capturador espera este atributo antes de
 * ejecutar el primer paso del escenario, de modo que el montaje inicial no se
 * mezcle con la interacción. Se esperan dos cuadros: el primero deja a React
 * terminar el commit, el segundo deja al navegador aplicar el diseño.
 */
function ReadyMarker() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-harness-ready', 'true');
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}

const params = new URLSearchParams(window.location.search);
const appId = params.get('app') ?? '';
const variantId = params.get('variant') ?? 'base';
const loader = variantModules[`../apps/${appId}/variants/${variantId}.tsx`];

const root = createRoot(document.getElementById('root')!);

if (!loader) {
  // Canal de error del harness, hermano de `data-harness-ready`.
  //
  // Se escribe de forma SINCRONA, antes de renderizar: el capturador lo detecta
  // y falla de inmediato con el motivo. Sin esto, una variante ausente del build
  // se manifestaba como un timeout de quince segundos esperando `ready`, con una
  // traza de pila de Playwright que no decia nada de la causa, y la pagina de
  // ayuda que esta misma rama renderiza quedaba invisible.
  document.documentElement.setAttribute(
    'data-harness-error',
    `variante no encontrada en el build: ${appId || '(sin app)'} · ${variantId}. ` +
      'Si el archivo existe en apps/, falta compilar: pnpm build'
  );
  root.render(
    <main>
      <h1>Variante no encontrada</h1>
      <p>
        Se solicitó <code>{appId || '(sin app)'}</code> · <code>{variantId}</code>.
      </p>
      <h2>Disponibles</h2>
      <ul>
        {listVariants().map((entry) => (
          <li key={entry}>
            <code>{entry}</code>
          </li>
        ))}
      </ul>
    </main>
  );
} else {
  const Variant = lazy(loader);
  root.render(
    <Suspense fallback={<div data-harness="loading" />}>
      <div data-harness="mounted" data-app={appId} data-variant={variantId}>
        <Variant />
      </div>
      <ReadyMarker />
    </Suspense>
  );
}
