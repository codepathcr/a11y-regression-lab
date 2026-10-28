import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DAYS, ReservationContext, SLOTS } from './reservation-context';
import type { ReservationState } from './reservation-context';

/** Estado de la reserva. En un contexto para que las partes intercambiables
 *  sigan siendo componentes sin props, igual que en las demás apps. */
export function ReservationProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState(DAYS[0].id);
  const [slot, setSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const value = useMemo<ReservationState>(
    () => ({
      day,
      setDay: (next: string) => {
        setDay(next);
        const label = DAYS.find((entry) => entry.id === next)?.label ?? next;
        setAnnouncement(`Día seleccionado: ${label}.`);
      },
      slot,
      setSlot: (next: string) => {
        setSlot(next);
        const label = SLOTS.find((entry) => entry.id === next)?.label ?? next;
        setAnnouncement(`Horario seleccionado: ${label}.`);
      },
      confirmed,
      confirm: () => {
        setConfirmed(true);
        setAnnouncement('Reserva confirmada.');
      },
      announcement,
    }),
    [day, slot, confirmed, announcement]
  );

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}
