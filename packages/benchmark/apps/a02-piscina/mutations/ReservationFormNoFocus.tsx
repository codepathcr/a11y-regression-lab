import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { SLOTS, useReservation } from '../store/reservation-context';

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el efecto que mueve el foco al panel de confirmación. El
 * formulario desaparece y el panel aparece en su lugar, pero el foco se queda
 * apuntando a un botón que ya no existe en el documento.
 *
 * El anuncio por la región live **se conserva**, y eso es deliberado: aísla la
 * pérdida de foco de la falta de anuncio, que son dos defectos distintos con
 * dos operadores distintos. Si el mutante rompiera los dos a la vez, no se
 * podría atribuir la detección a ninguno.
 *
 * Segundo anfitrión de este operador: el primero es el cambio de vista en
 * a09-tienda. Con un solo anfitrión no se puede distinguir el resultado del
 * operador del comportamiento de ese componente en particular.
 */
export function ReservationFormNoFocus() {
  const { slot, confirmed, confirm } = useReservation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (confirmed) {
    const label = SLOTS.find((entry) => entry.id === slot)?.label ?? '';
    return (
      <div className="piscina__confirmacion">
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
