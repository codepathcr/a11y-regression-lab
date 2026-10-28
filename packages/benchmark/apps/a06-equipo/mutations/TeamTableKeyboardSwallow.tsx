import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Menu } from '@a11y-lab/ui';
import { ROLES, useTeam } from '../store/team-context';

/** Se come Enter y Espacio: el navegador no sintetiza el clic de esas teclas. */
function swallowKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
}

/**
 * MUTACIÓN · eliminación de activación mediante teclado · operador propio ·
 * criterio 2.1.1
 *
 * Los botones de retiro siguen tabulables y siguen anunciándose como botones,
 * pero Enter y Espacio dejan de retirar a nadie.
 *
 * Ver docs/protocolo-mutacion.md para la operacionalización descartada
 * —sustituir `onClick` por `onMouseDown`— y el motivo del descarte.
 *
 * Quinto anfitrión del operador, y el único donde el defecto afecta una
 * operación **destructiva**. Eso lo vuelve más defendible como caso de estudio:
 * en una interfaz real, un control de borrado que no responde al teclado se
 * reporta como error funcional y se corrige; aquí interesa medir si la traza lo
 * distingue de un control que simplemente no se usó.
 */
export function TeamTableKeyboardSwallow() {
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
                  onKeyDown={swallowKeyboard}
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
