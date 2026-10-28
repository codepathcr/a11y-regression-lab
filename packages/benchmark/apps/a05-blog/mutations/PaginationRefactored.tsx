import { useEffect, useRef } from 'react';
import { Button } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Segundo control de esta app y de otro tipo que el primero: **no toca el DOM**.
 * La lista de números pasa de construirse con `Array.from` a una función
 * auxiliar con nombre, el movimiento de foco se extrae a su propia función, y el
 * cálculo de la página activa a un predicado.
 *
 * El marcado resultante es idéntico. Sirve para verificar que la divergencia que
 * producen los controles negativos estructurales viene de reestructurar el DOM
 * y no de refactorizar en general.
 */
function pageNumbers(count: number): number[] {
  const numbers: number[] = [];
  for (let number = 1; number <= count; number += 1) numbers.push(number);
  return numbers;
}

function focusResults(): void {
  const heading = document.getElementById('resultados-titulo');
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus();
}

export function PaginationRefactored() {
  const { page, pageCount, setPage } = useBlog();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    focusResults();
  }, [page]);

  if (pageCount <= 1) return null;

  const isActive = (number: number): boolean => number === page;

  return (
    <nav aria-label="Paginación de artículos">
      <ul className="blog__paginas">
        {pageNumbers(pageCount).map((number) => (
          <li key={number}>
            <Button
              aria-current={isActive(number) ? 'page' : undefined}
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
