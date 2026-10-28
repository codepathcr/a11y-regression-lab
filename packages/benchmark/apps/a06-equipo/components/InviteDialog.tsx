import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Dialog, TextField } from '@a11y-lab/ui';
import { useTeam } from '../store/team-context';

/**
 * Invitación en un diálogo modal. Concentra la retención del foco, su
 * devolución al cerrar y el anuncio del resultado.
 */
export function InviteDialog() {
  const { inviteOpen, setInviteOpen, invite } = useTeam();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

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
