import { useRef } from 'react';
import { Button, Menu } from '@a11y-lab/ui';
import { ROLES, useTeam } from '../store/team-context';

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * El paper define el operador por nombre y categoría —Operable / Navigable,
 * falla F44— pero no detalla la transformación. La operacionalización es propia
 * de este estudio.
 *
 * Transformación: se asigna `tabindex="-1"` al botón de retiro de la **primera
 * fila**, retirándolo del orden de tabulación. Las demás filas conservan el
 * suyo.
 *
 * Lo que vuelve este caso interesante es que la tabla es homogénea: tres filas
 * con los mismos dos controles. Un recorrido por teclado que de pronto salta un
 * control en una sola fila es casi imposible de advertir leyendo el diff, y en
 * la traza aparece como un desplazamiento de toda la secuencia posterior.
 *
 * Quinto anfitrión del operador.
 */
export function TeamTableTabOrder() {
  const { members, setRole, remove } = useTeam();
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section aria-labelledby="equipo-titulo">
      <h2 id="equipo-titulo" ref={headingRef} tabIndex={-1}>
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
          {members.map((member, index) => (
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
                  tabIndex={index === 0 ? -1 : undefined}
                  data-testid={`retirar-${member.id}`}
                  onClick={() => {
                    remove(member.id);
                    headingRef.current?.focus();
                  }}
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
