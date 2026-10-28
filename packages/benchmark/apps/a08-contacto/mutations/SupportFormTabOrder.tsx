import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { REASONS, useSupport } from '../store/support-context';

const EXTRA_LABEL: Record<string, string> = {
  factura: 'Número de factura',
  acceso: 'Correo con el que te registraste',
  producto: 'Nombre del producto',
};

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * El paper define el operador por nombre y categoría —Operable / Navigable,
 * falla F44— pero no detalla la transformación. La operacionalización es propia
 * de este estudio.
 *
 * Transformación: el campo que aparece al elegir un motivo recibe
 * `tabindex="-1"`, de modo que queda fuera del orden de tabulación.
 *
 * Este anfitrión es el más interesante de los siete del operador porque el
 * control inalcanzable **no existía** en el primer render: apareció como
 * respuesta a una interacción. Un análisis estático de la versión modificada
 * tendría que haber provocado antes esa interacción para encontrarlo siquiera,
 * y por eso es el caso que mejor separa el enfoque dinámico del estático dentro
 * de un criterio que suele considerarse verificable de forma estática.
 *
 * La etiqueta, el valor y el rol no cambian: el campo sigue en el árbol de
 * accesibilidad y sigue editable con el ratón.
 */
export function SupportFormTabOrder() {
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
          tabIndex={-1}
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
