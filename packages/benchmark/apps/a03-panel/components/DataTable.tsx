import { usePanel } from '../store/panel-context';
import type { SortColumn } from '../store/panel-context';

const COLUMNS: Array<{ id: SortColumn; label: string }> = [
  { id: 'title', label: 'Incidencia' },
  { id: 'owner', label: 'Responsable' },
  { id: 'days', label: 'Días abierta' },
];

/**
 * Tabla ordenable.
 *
 * El estado de ordenamiento vive en `aria-sort` sobre la celda de encabezado,
 * que es donde la especificación lo pide, y el control que lo cambia es un
 * `<button>` dentro de esa celda. El nuevo orden se anuncia por la región live:
 * reordenar una tabla sin avisar deja a quien no la ve sin saber que el
 * contenido cambió de lugar.
 */
export function DataTable() {
  const { rows, sort, direction, toggleSort } = usePanel();

  return (
    <section aria-labelledby="tabla-titulo">
      <h2 id="tabla-titulo">Incidencias</h2>
      <table className="panel__tabla">
        <caption>Incidencias de accesibilidad abiertas por el equipo</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={sort === column.id ? direction : 'none'}
              >
                <button
                  type="button"
                  className="panel__orden"
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
