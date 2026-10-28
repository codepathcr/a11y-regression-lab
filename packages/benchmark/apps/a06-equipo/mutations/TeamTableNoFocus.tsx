import { Button, Menu } from '@a11y-lab/ui';
import { ROLES, useTeam } from '../store/team-context';

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el movimiento de foco al encabezado tras retirar a una integrante.
 * La fila desaparece y con ella el botón que tenía el foco, de modo que el foco
 * cae al cuerpo del documento.
 *
 * El anuncio **se conserva**, para aislar este defecto del de falta de anuncio.
 *
 * Es el caso más corriente de esta familia en interfaces reales: nadie piensa
 * en el foco al borrar una fila, porque con el ratón no se nota. Quien navega
 * por teclado vuelve al principio de la página y tiene que recorrer la tabla
 * entera para retirar a la siguiente persona.
 *
 * Sexto anfitrión del operador.
 */
export function TeamTableNoFocus() {
  const { members, setRole, remove } = useTeam();

  return (
    <section aria-labelledby="equipo-titulo">
      <h2 id="equipo-titulo" tabIndex={-1}>
        Integrantes
      </h2>
      <table className="equipo__tabla">
        <caption>Integrantes del equipo y su rol</caption>
        <thead>
          <tr>
            <th scope="col">Persona</th>
            <th scope="col">Correo</th>
            <th scope="col">Rol</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <th scope="row">
                {member.name}
                {member.pending ? (
                  <span className="equipo__pendiente"> · invitación pendiente</span>
                ) : null}
              </th>
              <td>{member.email}</td>
              <td>{member.role}</td>
              <td className="equipo__acciones">
                <Menu
                  label={`Cambiar rol de ${member.name}`}
                  items={ROLES.map((role) => ({
                    id: `${member.id}-${role}`,
                    label: role,
                    onSelect: () => setRole(member.id, role),
                  }))}
                />
                <Button
                  aria-label={`Retirar a ${member.name} del equipo`}
                  data-testid={`retirar-${member.id}`}
                  onClick={() => remove(member.id)}
                >
                  Retirar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
