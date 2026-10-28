import type { KeyboardEvent } from 'react';
import { usePanel } from '../store/panel-context';
import type { SortColumn } from '../store/panel-context';


/** Se come Enter y Espacio: el navegador no sintetiza el clic de esas teclas. */
function swallowKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
}

const COLUMNS: Array<{ id: SortColumn; label: string }> = [
  { id: 'title', label: 'Incidencia' },
  { id: 'owner', label: 'Responsable' },
  { id: 'days', label: 'Días abierta' },
];

/**
 * MUTACIÓN · eliminación de activación mediante teclado · operador propio ·
 * criterio 2.1.1
 *
 * El control de ordenamiento sigue siendo un `<button>` y sigue recibiendo el
 * foco, pero **ordenar deja de ser posible con el teclado** mientras el ratón
 * funciona igual. *
 * OPERACIONALIZACIÓN. Se conserva `onClick` y se agrega un manejador de
 * `keydown` que llama a `preventDefault()` para Enter y Espacio, con lo que el
 * navegador no sintetiza el clic que esas teclas producen. El botón sigue
 * recibiendo el foco y sigue anunciándose como botón; simplemente no responde
 * al teclado.
 *
 * Es el patrón real: alguien agrega un manejador de teclado para un atajo
 * propio y se come Enter sin notarlo.
 *
 * Una operacionalización anterior usaba `onMouseDown` en lugar de `onClick`, y
 * se descartó. Funcionaba, pero `mousedown` se dispara ANTES que `click`, de
 * modo que con el ratón el cambio de estado ocurría en otro punto de la
 * secuencia de eventos: el mutante divergía también en pasos donde el
 * comportamiento de accesibilidad era idéntico. Era una diferencia real pero
 * ajena al defecto, y habría contaminado la métrica de localización. Con
 * `preventDefault` sobre `keydown`, el camino del ratón queda idéntico y la
 * divergencia aparece únicamente donde el escenario usa el teclado.
 *
 * Es una operacionalización distinta de la que usa a01-landing, donde el
 * disparador deja de ser un botón. Acá la secuencia de foco es IDÉNTICA a la de
 * la base —el botón sigue ahí y sigue siendo tabulable— y lo que falta son las
 * consecuencias: el cambio de `aria-sort`, el reordenamiento de las filas y el
 * anuncio. Dos huellas bien distintas para un mismo operador, que es lo que
 * permite comprobar que el detector no está aprendiendo un truco.
 *
 * Para que el defecto se manifieste, el escenario debe activar el ordenamiento
 * **por teclado** al menos una vez: con clics del ratón las dos versiones se
 * comportan igual.
 */
export function DataTableMouseOnly() {
  const { rows, sort, direction, toggleSort } = usePanel();

  return (
    <section aria-labelledby="tabla-titulo">
      <h2 id="tabla-titulo">Incidencias</h2>
      <table className="panel__tabla">
        <caption>Incidencias de accesibilidad abiertas por el equipo</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.id} scope="col" aria-sort={sort === column.id ? direction : 'none'}>
                <button
                  type="button"
                  className="panel__orden"
                  data-testid={`orden-${column.id}`}
                  onKeyDown={swallowKeyboard}
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
