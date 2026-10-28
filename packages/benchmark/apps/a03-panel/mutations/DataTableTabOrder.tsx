import { usePanel } from '../store/panel-context';
import type { SortColumn } from '../store/panel-context';

const COLUMNS: Array<{ id: SortColumn; label: string }> = [
  { id: 'title', label: 'Incidencia' },
  { id: 'owner', label: 'Responsable' },
  { id: 'days', label: 'Días abierta' },
];

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * Se asigna `tabindex="-1"` al control de ordenamiento de la columna central,
 * retirándolo del orden de tabulación. La columna sigue ordenable con el ratón;
 * quien navega por teclado no puede ordenar por responsable y no tiene forma de
 * saber por qué.
 *
 * Segundo anfitrión del operador, junto con la rejilla de horarios de
 * a02-piscina. Ver docs/protocolo-mutacion.md para las operacionalizaciones
 * descartadas.
 */
export function DataTableTabOrder() {
  const { rows, sort, direction, toggleSort } = usePanel();

  return (
    <section aria-labelledby="tabla-titulo">
      <h2 id="tabla-titulo">Incidencias</h2>
      <table className="panel__tabla">
        <caption>Incidencias de accesibilidad abiertas por el equipo</caption>
        <thead>
          <tr>
            {COLUMNS.map((column, index) => (
              <th key={column.id} scope="col" aria-sort={sort === column.id ? direction : 'none'}>
                <button
                  type="button"
                  className="panel__orden"
                  tabIndex={index === 1 ? -1 : undefined}
                  data-testid={`orden-${column.id}`}
                  onClick={() => toggleSort(column.id)}
                >
                  {column.label}
                </button>
              </th>
            ))}
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.title}</th>
              <td>{row.owner}</td>
              <td>{row.days}</td>
              <td>{row.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p>Ninguna incidencia coincide con el filtro.</p> : null}
    </section>
  );
}
