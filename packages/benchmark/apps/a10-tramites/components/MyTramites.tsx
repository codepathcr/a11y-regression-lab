import { MINE } from '../data/tramites';
import { usePortal } from '../store/portal-context';

/** Expedientes de la persona usuaria, con el recién presentado si existe. */
export function MyTramites() {
  const { reference, selected } = usePortal();

  return (
    <section aria-labelledby="mis-titulo">
      <h2 id="mis-titulo">Expedientes</h2>
      <table className="portal__tabla">
        <caption>Trámites presentados y su estado</caption>
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
