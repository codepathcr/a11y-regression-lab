import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { REASONS, useSupport } from '../store/support-context';

const EXTRA_LABEL: Record<string, string> = {
  factura: 'Número de factura',
  acceso: 'Correo con el que te registraste',
  producto: 'Nombre del producto',
};

/**
 * CONTROL NEGATIVO · reestructuración del DOM sin cambio semántico
 *
 * El campo dependiente se extrae a un componente interno, la rama de
 * confirmación a una función, y los campos se envuelven en un contenedor sin rol
 * ni nombre accesible para colgarle una clase de CSS.
 *
 * Es el control negativo del estrato pequeño que vigila el caso de inserción
 * condicional: el envoltorio aparece y desaparece junto con el campo, de modo
 * que si el normalizador contara nodos sin rol, el par divergiría exactamente
 * en el paso donde el mutante CCS y el CTO de esta misma app sí divergen. Un
 * control negativo que diverge en el mismo paso que un positivo es el que de
 * verdad pone a prueba la normalización.
 */
interface ExtraFieldProps {
  reason: string;
  value: string;
  onChange: (value: string) => void;
}

function ExtraField({ reason, value, onChange }: ExtraFieldProps) {
  return (
    <TextField
      label={EXTRA_LABEL[reason] ?? 'Dato adicional'}
      value={value}
      data-testid="extra"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function SupportFormRefactored() {
  const { reason, detail, setDetail, extra, setExtra, error, sent, send } = useSupport();

  function renderSent() {
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

  if (sent) {
    return renderSent();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="contacto__campos">
        <TextField
          label="Contanos qué pasó"
          hint="Unas pocas líneas alcanzan."
          value={detail}
          error={error}
          data-testid="detalle"
          onChange={(event) => setDetail(event.target.value)}
        />

        {reason ? <ExtraField reason={reason} value={extra} onChange={setExtra} /> : null}
      </div>

      <Button type="submit" variant="primary" data-testid="enviar">
        Enviar mensaje
      </Button>
    </form>
  );
}
