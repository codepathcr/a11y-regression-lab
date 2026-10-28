import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Dialog, TextField } from '@a11y-lab/ui';
import { useTeam } from '../store/team-context';

/**
 * MUTACIÓN · CCB, Change Context on Blur · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.1
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F9— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: abandonar el campo de correo **envía la invitación** si los
 * dos campos están completos. El diálogo se cierra, el foco vuelve al botón que
 * lo abrió y la tabla gana una fila. Todo porque alguien tabuló hacia el botón
 * para leerlo antes de pulsarlo.
 *
 * Es la operacionalización más grave de CCB en el benchmark: el cambio de
 * contexto no solo desorienta, **ejecuta una acción irreversible** que la
 * persona no confirmó. En un formulario de invitación eso significa dar acceso a
 * alguien sin querer.
 *
 * Cuarto anfitrión del operador, y el único donde el cambio de contexto tiene
 * consecuencias fuera de la interfaz.
 */
export function InviteDialogSendOnBlur() {
  const { inviteOpen, setInviteOpen, invite } = useTeam();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function trySend() {
    if (name.trim().length === 0 || !email.includes('@')) return;
    setError(null);
    invite(name, email);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length === 0) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!email.includes('@')) {
      setError('El correo electrónico debe incluir una arroba.');
      return;
    }

    setError(null);
    invite(name, email);
  }

  return (
    <Dialog open={inviteOpen} title="Invitar a alguien" onClose={() => setInviteOpen(false)}>
      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Nombre completo"
          value={name}
          error={error && name.trim().length === 0 ? error : null}
          data-autofocus
          data-testid="invitar-nombre"
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Correo electrónico"
          value={email}
          error={error && name.trim().length > 0 ? error : null}
          data-testid="invitar-correo"
          onChange={(event) => setEmail(event.target.value)}
          onBlur={trySend}
        />
        <div className="equipo__acciones">
          <Button type="submit" variant="primary" data-testid="invitar-enviar">
            Enviar invitación
          </Button>
          <Button onClick={() => setInviteOpen(false)} data-testid="invitar-cancelar">
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
