import { useRef } from 'react';
import { Button, Menu } from '@a11y-lab/ui';
import type { Member } from '../store/team-context';
import { ROLES, useTeam } from '../store/team-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * La fila y sus acciones se extraen a componentes propios, y la tabla se
 * envuelve en un contenedor de maquetación para desplazamiento horizontal.
 *
 * Los roles, el `scope` de cada encabezado, los nombres accesibles, el orden de
 * tabulación y el movimiento de foco tras retirar quedan idénticos. El
 * contenedor desplaza la ruta en el DOM de la tabla entera.
 */
function MemberActions({ member, onRemoved }: { member: Member; onRemoved: () => void }) {
  const { setRole, remove } = useTeam();

  return (
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
        onClick={() => {
          remove(member.id);
          onRemoved();
        }}
      >
        Retirar
      </Button>
    </td>
  );
}

function MemberRow({ member, onRemoved }: { member: Member; onRemoved: () => void }) {
  return (
    <tr>
      <th scope="row">
        {member.name}
        {member.pending ? <span className="equipo__pendiente"> · invitación pendiente</span> : null}
      </th>
      <td>{member.email}</td>
      <td>{member.role}</td>
      <MemberActions member={member} onRemoved={onRemoved} />
    </tr>
  );
}

export function TeamTableRefactored() {
  const { members } = useTeam();
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section aria-labelledby="equipo-titulo">
      <h2 id="equipo-titulo" ref={headingRef} tabIndex={-1}>
        Integrantes
      </h2>
      <div className="equipo__tabla-envoltorio">
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
              <MemberRow
                key={member.id}
                member={member}
                onRemoved={() => headingRef.current?.focus()}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
