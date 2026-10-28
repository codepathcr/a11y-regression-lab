import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/** Se come Enter y Espacio: el navegador no sintetiza el clic de esas teclas. */
function swallowKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
}

/**
 * MUTACIÓN · eliminación de activación mediante teclado · operador propio ·
 * criterio 2.1.1
 *
 * Los botones de paginación siguen siendo tabulables y siguen anunciándose como
 * botones, pero Enter y Espacio dejan de cambiar de página: un manejador de
 * `keydown` llama a `preventDefault()` y el navegador no sintetiza el clic.
 *
 * Ver docs/protocolo-mutacion.md para la operacionalización descartada —sustituir
 * `onClick` por `onMouseDown`— y el motivo del descarte.
 *
 * Cuarto anfitrión del operador. La paginación es su caso más cruel: el único
 * camino al resto del contenido queda cerrado para quien navega por teclado,
 * mientras la interfaz se ve y se comporta como si todo estuviera bien.
 */
export function PaginationKeyboardSwallow() {
  const { page, pageCount, setPage } = useBlog();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = document.getElementById('resultados-titulo');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }, [page]);

  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Paginación de artículos">
      <ul className="blog__paginas">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <li key={number}>
            <Button
              aria-current={number === page ? 'page' : undefined}
              aria-label={`Página ${number}`}
              data-testid={`pagina-${number}`}
              onKeyDown={swallowKeyboard}
              onClick={() => setPage(number)}
            >
              {number}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
