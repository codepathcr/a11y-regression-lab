import { Button } from '@a11y-lab/ui';
import { SLOTS, useReservation } from '../store/reservation-context';

/**
 * Rejilla de horarios. Cada horario es un botón conmutable con `aria-pressed`,
 * de modo que el estado de selección se comunica sin depender del color.
 *
 * Los horarios ocupados usan `disabled`, que los retira del orden de tabulación
 * por la vía correcta: no hay nada que una persona pueda hacer con ellos.
 */
export function SlotGrid() {
  const { slot, setSlot } = useReservation();

  return (
    <div role="group" aria-labelledby="horarios-titulo" className="piscina__horarios">
      <h2 id="horarios-titulo">Horarios disponibles</h2>
      <ul className="piscina__rejilla">
        {SLOTS.map((entry) => (
          <li key={entry.id}>
            <Button
              aria-pressed={slot === entry.id}
              disabled={entry.taken}
              aria-label={
                entry.taken ? `${entry.label}, ocupado` : `Reservar de ${entry.label}`
              }
              data-testid={`horario-${entry.id}`}
              onClick={() => setSlot(entry.id)}
            >
              {entry.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
