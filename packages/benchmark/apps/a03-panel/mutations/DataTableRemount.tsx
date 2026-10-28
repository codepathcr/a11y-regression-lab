import { usePanel } from '../store/panel-context';
import type { SortColumn } from '../store/panel-context';

const COLUMNS: Array<{ id: SortColumn; label: string }> = [
  { id: 'title', label: 'Incidencia' },
  { id: 'owner', label: 'Responsable' },
  { id: 'days', label: 'Días abierta' },
];

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * La fila de encabezados recibe una `key` que depende del ordenamiento activo.
 * React no la actualiza: la **desmonta y la vuelve a montar**. El botón que la
 * persona acababa de pulsar deja de existir y el foco cae al cuerpo del
 * documento.
 *
 * Es el defecto de React más común de esta familia y uno de los más difíciles
 * de ver leyendo el diff: la `key` cambia en una línea y la consecuencia aparece
 * tres interacciones después. Con el ratón casi no se nota, porque el puntero
 * sigue donde estaba; con teclado la persona queda al principio del documento
 * sin ninguna indicación.
 *
 * Ningún validador estático lo reporta: el marcado resultante es correcto en
 * todo instante. La diferencia existe solo en la secuencia de foco.
 */
export function DataTableRemount() {
  const { rows, sort, direction, toggleSort } = usePanel();

  return (
    <section aria-labelledby="tabla-titulo">
      <h2 id="tabla-titulo">Incidencias</h2>
      <table className="panel__tabla">
        <caption>Incidencias de accesibilidad abiertas por el equipo</caption>
        <thead>
          <tr key={`${sort}-${direction}`}>
            {COLUMNS.map((column) => (
              <th key={column.id} scope="col" aria-sort={sort === column.id ? direction : 'none'}>
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
