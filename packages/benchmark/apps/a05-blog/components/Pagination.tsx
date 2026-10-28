import { useEffect, useRef } from 'react';
import { Button } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * Paginación.
 *
 * La página activa se comunica con `aria-current="page"`, y al cambiar de
 * página el foco se mueve al encabezado de los resultados. Sin ese movimiento,
 * quien navega por teclado pulsa "2" y se queda en la paginación, sin saber que
 * arriba se reemplazó la lista entera.
 */
export function Pagination() {
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
