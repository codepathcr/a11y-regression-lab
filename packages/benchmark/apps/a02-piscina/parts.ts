import type { PoolParts } from './App';
import { DaySelector } from './components/DaySelector';
import { SlotGrid } from './components/SlotGrid';
import { ReservationForm } from './components/ReservationForm';
import { PoolRules } from './components/PoolRules';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: PoolParts = {
  DaySelector,
  SlotGrid,
  ReservationForm,
  PoolRules,
};
