import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { REASONS, useSupport } from '../store/support-context';

const EXTRA_LABEL: Record<string, string> = {
  factura: 'Número de factura',
  acceso: 'Correo con el que te registraste',
  producto: 'Nombre del producto',
};

/** Campos del mensaje, incluido el que depende del motivo elegido. */
export function SupportForm() {
  const { reason, detail, setDetail, extra, setExtra, error, sent, send } = useSupport();

  if (sent) {
    const label = REASONS.find((entry) => entry.id === reason)?.label ?? '';
    return (
      <div className="contacto__confirmacion">
        <h2>Mensaje enviado</h2>
        <p>Registramos tu consulta sobre {label.toLowerCase()}. Te respondemos dentro de un día hábil.</p>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <TextField
        label="Contanos qué pasó"
        hint="Unas pocas líneas alcanzan."
        value={detail}
        error={error}
        data-testid="detalle"
        onChange={(event) => setDetail(event.target.value)}
      />

      {reason ? (
        <TextField
          label={EXTRA_LABEL[reason] ?? 'Dato adicional'}
          value={extra}
          data-testid="extra"
          onChange={(event) => setExtra(event.target.value)}
        />
      ) : null}

      <Button type="submit" variant="primary" data-testid="enviar">
        Enviar mensaje
      </Button>
    </form>
  );
}
