import { usePanel } from '../store/panel-context';
import type { SortColumn, Ticket } from '../store/panel-context';

const COLUMNS: Array<{ id: SortColumn; label: string }> = [
  { id: 'title', label: 'Incidencia' },
  { id: 'owner', label: 'Responsable' },
  { id: 'days', label: 'Días abierta' },
];

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Refactorización realista de las que se ven en cualquier revisión: la fila y
 * el encabezado ordenable se extraen a componentes propios, y la tabla se
 * envuelve en un contenedor de maquetación para permitir desplazamiento
 * horizontal.
 *
 * La semántica queda idéntica: mismos roles, mismo `scope`, mismo `aria-sort`,
 * mismo orden de tabulación, mismos nombres accesibles. Pero el contenedor
 * adicional **desplaza la ruta en el DOM** de la tabla entera, de modo que con
 * identidad estructural el caso produce divergencia masiva y con identidad
 * semántica, ninguna.
 */
function SortableHeader({ column }: { column: { id: SortColumn; label: string } }) {
  const { sort, direction, toggleSort } = usePanel();

  return (
    <th scope="col" aria-sort={sort === column.id ? direction : 'none'}>
      <button
        type="button"
        className="panel__orden"
        data-testid={`orden-${column.id}`}
        onClick={() => toggleSort(column.id)}
      >
        {column.label}
      </button>
    </th>
  );
}

function TicketRow({ row }: { row: Ticket }) {
  return (
    <tr>
      <th scope="row">{row.title}</th>
      <td>{row.owner}</td>
      <td>{row.days}</td>
      <td>{row.state}</td>
    </tr>
  );
}

export function DataTableRefactored() {
  const { rows } = usePanel();

  return (
    <section aria-labelledby="tabla-titulo">
      <h2 id="tabla-titulo">Incidencias</h2>
      <div className="panel__tabla-envoltorio">
        <table className="panel__tabla">
          <caption>Incidencias de accesibilidad abiertas por el equipo</caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <SortableHeader key={column.id} column={column} />
              ))}
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TicketRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p>Ninguna incidencia coincide con el filtro.</p> : null}
    </section>
  );
}
