import { useEffect, useRef } from 'react';
import { Button } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * Se asigna `tabindex="-1"` al botón de la segunda página, retirándolo del orden
 * de tabulación. Las demás páginas siguen alcanzables; esa no.
 *
 * El defecto es de los que nadie nota en una revisión: la paginación se ve
 * completa, funciona con el ratón, y solo quien recorre por teclado descubre
 * que de la página 1 salta a la 3.
 *
 * Cuarto anfitrión del operador.
 */
export function PaginationTabOrder() {
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
              tabIndex={number === 2 ? -1 : undefined}
              data-testid={`pagina-${number}`}
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
