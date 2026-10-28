import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { SLOTS, useReservation } from '../store/reservation-context';

/**
 * Formulario de la reserva, y la confirmación que lo reemplaza.
 *
 * Al confirmar, el formulario desaparece y en su lugar aparece un panel de
 * confirmación que **recibe el foco**. Sin ese movimiento, quien navega por
 * teclado se queda apuntando a un botón que ya no existe y no recibe ninguna
 * indicación de que la operación terminó. Es el comportamiento que el operador
 * de pérdida de foco tras una actualización dinámica destruye.
 */
export function ReservationForm() {
  const { slot, confirmed, confirm } = useReservation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (confirmed) panelRef.current?.focus();
  }, [confirmed]);

  if (confirmed) {
    const label = SLOTS.find((entry) => entry.id === slot)?.label ?? '';
    return (
      <div ref={panelRef} tabIndex={-1} className="piscina__confirmacion">
        <h2>Reserva confirmada</h2>
        <p>
          Te esperamos de {label}. Presentá tu documento en recepción quince minutos antes.
        </p>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (slot === null) {
      setError('Elegí un horario antes de confirmar.');
      return;
    }
    if (name.trim().length === 0) {
      setError('El nombre es obligatorio.');
      return;
    }

    setError(null);
    confirm();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2>Tus datos</h2>
      <TextField
        label="Nombre completo"
        value={name}
        error={error}
        data-testid="nombre"
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" variant="primary" data-testid="confirmar">
        Confirmar reserva
      </Button>
    </form>
  );
}
