import { Button } from '@a11y-lab/ui';
import { SLOTS, useReservation } from '../store/reservation-context';

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * El paper define el operador por su nombre y su categoría —Operable /
 * Navigable, falla F44— pero no detalla la transformación. La operacionalización
 * es propia de este estudio; ver docs/protocolo-mutacion.md, donde constan
 * también las dos operacionalizaciones descartadas.
 *
 * Transformación: se asigna `tabindex="-1"` al tercer horario de la rejilla,
 * retirándolo del orden de tabulación. Sigue visible, sigue mostrando su estado
 * y sigue funcionando con el ratón; una persona que navega por teclado no puede
 * reservar ese horario y no tiene forma de saber por qué.
 *
 * Es el anfitrión natural de este operador: una rejilla de controles
 * equivalentes donde la continuidad del recorrido es justamente lo que la hace
 * usable.
 */
export function SlotGridTabOrder() {
  const { slot, setSlot } = useReservation();

  return (
    <div role="group" aria-labelledby="horarios-titulo" className="piscina__horarios">
      <h2 id="horarios-titulo">Horarios disponibles</h2>
      <ul className="piscina__rejilla">
        {SLOTS.map((entry, index) => (
          <li key={entry.id}>
            <Button
              aria-pressed={slot === entry.id}
              disabled={entry.taken}
              tabIndex={index === 2 ? -1 : undefined}
              aria-label={entry.taken ? `${entry.label}, ocupado` : `Reservar de ${entry.label}`}
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
