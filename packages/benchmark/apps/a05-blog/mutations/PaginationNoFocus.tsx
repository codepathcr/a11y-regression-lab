import { Button } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el efecto que mueve el foco al encabezado de los resultados
 * cuando cambia la página. La lista entera se reemplaza y el foco se queda en
 * el botón de paginación.
 *
 * El anuncio del cambio de página **se conserva**, para aislar este defecto del
 * de falta de anuncio.
 *
 * El efecto práctico es el de una cinta sin fin: la persona pulsa "2", escucha
 * que está en la página 2, y para llegar al contenido tiene que recorrer hacia
 * atrás toda la paginación. Es el defecto que convierte una lista paginada en
 * algo inutilizable por teclado sin que nada parezca roto.
 *
 * Quinto anfitrión del operador.
 */
export function PaginationNoFocus() {
  const { page, pageCount, setPage } = useBlog();

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
