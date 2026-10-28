import { createContext, useContext } from 'react';

export interface Slot {
  id: string;
  label: string;
  taken: boolean;
}

export const DAYS = [
  { id: 'lun', label: 'Lunes 27' },
  { id: 'mar', label: 'Martes 28' },
  { id: 'mie', label: 'Miércoles 29' },
];

export const SLOTS: Slot[] = [
  { id: 's07', label: '07:00 a 08:00', taken: false },
  { id: 's08', label: '08:00 a 09:00', taken: true },
  { id: 's09', label: '09:00 a 10:00', taken: false },
  { id: 's10', label: '10:00 a 11:00', taken: false },
];

export interface ReservationState {
  day: string;
  setDay: (day: string) => void;
  slot: string | null;
  setSlot: (slot: string) => void;
  confirmed: boolean;
  confirm: () => void;
  announcement: string;
}

export const ReservationContext = createContext<ReservationState | null>(null);

export function useReservation(): ReservationState {
  const value = useContext(ReservationContext);
  if (!value) {
    throw new Error('useReservation debe usarse dentro de ReservationProvider');
  }
  return value;
}
