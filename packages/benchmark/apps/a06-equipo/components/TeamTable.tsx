import { useRef } from 'react';
import { Button, Menu } from '@a11y-lab/ui';
import { ROLES, useTeam } from '../store/team-context';

/**
 * Tabla de integrantes con un menú de rol por fila.
 *
 * Los controles de cada fila llevan `aria-label` con el nombre de la persona:
 * "Cambiar rol" repetido tres veces no distingue nada para quien recorre los
 * controles de la página fuera del contexto de la tabla.
 *
 * Al retirar a una integrante, su fila desaparece y con ella el botón que tenía
 * el foco. Si no se hace nada, el foco cae al cuerpo del documento y quien
 * navega por teclado vuelve al principio de la página sin saber por qué. Por eso
 * el foco se mueve de forma explícita al encabezado de la sección, que es el
 * contexto más cercano que sigue existiendo.
 */
export function TeamTable() {
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
