import { Button } from '@a11y-lab/ui';
import type { Slot } from '../store/reservation-context';
import { SLOTS, useReservation } from '../store/reservation-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Refactorización realista: el botón de cada horario se extrae a un componente
 * propio y la rejilla se envuelve en un contenedor de maquetación adicional. La
 * semántica, los roles, los nombres accesibles, el estado de selección y el
 * orden de tabulación quedan idénticos a los de la base.
 *
 * Como en el control negativo de a01-landing, el contenedor adicional desplaza
 * la ruta en el DOM de todo lo que envuelve. Con identidad estructural eso
 * produce divergencia falsa; con identidad semántica, ninguna. Un control
 * negativo que no tocara la estructura no pondría a prueba nada.
 */
function SlotButton({ entry }: { entry: Slot }) {
  const { slot, setSlot } = useReservation();

  return (
    <Button
      aria-pressed={slot === entry.id}
      disabled={entry.taken}
      aria-label={entry.taken ? `${entry.label}, ocupado` : `Reservar de ${entry.label}`}
      data-testid={`horario-${entry.id}`}
      onClick={() => setSlot(entry.id)}
    >
      {entry.label}
    </Button>
  );
}

export function SlotGridRefactored() {
  return (
    <div role="group" aria-labelledby="horarios-titulo" className="piscina__horarios">
      <h2 id="horarios-titulo">Horarios disponibles</h2>
      <div className="piscina__rejilla-envoltorio">
        <ul className="piscina__rejilla">
          {SLOTS.map((entry) => (
            <li key={entry.id}>
              <SlotButton entry={entry} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
