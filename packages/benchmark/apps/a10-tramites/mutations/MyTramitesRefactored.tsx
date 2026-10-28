import { MINE } from '../data/tramites';
import { usePortal } from '../store/portal-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * La fila se extrae a un componente propio y la tabla se envuelve en un
 * contenedor de maquetación para desplazamiento horizontal. Roles, `scope`,
 * encabezados y nombres accesibles quedan idénticos.
 *
 * El contenedor desplaza la ruta en el DOM de la tabla entera: con identidad
 * estructural produce divergencia, con identidad semántica ninguna.
 */
function ExpedienteRow({
  name,
  filed,
  state,
  reference,
}: {
  name: string;
  filed: string;
  state: string;
  reference: string;
}) {
  return (
    <tr>
      <th scope="row">{name}</th>
      <td>{filed}</td>
      <td>{state}</td>
      <td>{reference}</td>
    </tr>
  );
}

export function MyTramitesRefactored() {
  const { reference, selected } = usePortal();

  return (
    <section aria-labelledby="mis-titulo">
      <h2 id="mis-titulo">Expedientes</h2>
      <div className="portal__tabla-envoltorio">
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
              <ExpedienteRow
                name={selected?.name ?? 'Trámite'}
                filed="hoy"
                state="recibido"
                reference={reference}
              />
            ) : null}
            {MINE.map((entry) => (
              <ExpedienteRow
                key={entry.id}
                name={entry.name}
                filed={entry.filed}
                state={entry.state}
                reference={`MUN-2026-0${entry.id.slice(-1)}12`}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
