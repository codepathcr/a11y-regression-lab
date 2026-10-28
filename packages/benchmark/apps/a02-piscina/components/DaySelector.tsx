import { DAYS, useReservation } from '../store/reservation-context';

/**
 * Selección de día con botones de opción nativos dentro de un `fieldset`.
 *
 * Nativos a propósito: el navegador aporta la navegación con flechas, el
 * agrupamiento y el anuncio de "1 de 3" sin una línea de código propia.
 */
export function DaySelector() {
  const { day, setDay } = useReservation();

  return (
    <fieldset className="piscina__dias">
      <legend>Día</legend>
      {DAYS.map((entry) => (
        <label key={entry.id}>
          <input
            type="radio"
            name="dia"
            value={entry.id}
            checked={day === entry.id}
            data-testid={`dia-${entry.id}`}
            onChange={() => setDay(entry.id)}
          />{' '}
          {entry.label}
        </label>
      ))}
    </fieldset>
  );
}
