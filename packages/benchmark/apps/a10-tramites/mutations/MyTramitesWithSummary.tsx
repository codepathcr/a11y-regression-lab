import { MINE } from '../data/tramites';
import { usePortal } from '../store/portal-context';

/**
 * DIVERGENCIA BENIGNA · alta de un recuento y reescritura del pie de tabla
 *
 * Se agrega una línea con el recuento de expedientes antes de la tabla y se
 * reescribe su `caption`. El `caption` es el nombre accesible de la tabla, de
 * modo que el cambio alcanza a un nombre accesible y no solo a texto suelto.
 *
 * El recuento se deriva de los datos y del expediente recién presentado, así que
 * su valor cambia a lo largo de la traza igual que el resto de la tabla. Eso es
 * deseado: un caso benigno cuyo contenido sea estático no ejercita la
 * comparación paso por paso.
 */
export function MyTramitesWithSummary() {
  const { reference, selected } = usePortal();
  const total = MINE.length + (reference ? 1 : 0);

  return (
    <section aria-labelledby="mis-titulo">
      <h2 id="mis-titulo">Expedientes</h2>
      <p className="portal__recuento">
        {total} expediente{total === 1 ? '' : 's'} a tu nombre
      </p>
      <table className="portal__tabla">
        <caption>Estado de tus trámites presentados</caption>
        <thead>
          <tr>
            <th scope="col">Trámite</th>
            <th scope="col">Presentado</th>
            <th scope="col">Estado</th>
            <th scope="col">Referencia</th>
          </tr>
        </thead>
        <tbody>
          {reference ? (
            <tr>
              <th scope="row">{selected?.name ?? 'Trámite'}</th>
              <td>hoy</td>
              <td>recibido</td>
              <td>{reference}</td>
            </tr>
          ) : null}
          {MINE.map((entry) => (
            <tr key={entry.id}>
              <th scope="row">{entry.name}</th>
              <td>{entry.filed}</td>
              <td>{entry.state}</td>
              <td>MUN-2026-0{entry.id.slice(-1)}12</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
