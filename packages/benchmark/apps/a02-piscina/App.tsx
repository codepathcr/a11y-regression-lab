import type { ComponentType } from 'react';
import { LiveRegion } from '@a11y-lab/ui';
import { useReservation } from './store/reservation-context';
import './app.css';

export interface PoolParts {
  DaySelector: ComponentType;
  SlotGrid: ComponentType;
  ReservationForm: ComponentType;
  PoolRules: ComponentType;
}

export interface AppProps {
  parts: PoolParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { announcement } = useReservation();
  const { DaySelector, SlotGrid, ReservationForm, PoolRules } = parts;

  return (
    <div className="piscina">
      <main id="contenido">
        <h1>Reservar un carril</h1>
        <p className="piscina__lead">Piscina municipal · 25 metros · seis carriles</p>
        <DaySelector />
        <SlotGrid />
        <ReservationForm />
        <LiveRegion message={announcement} />
      </main>
      <PoolRules />
    </div>
  );
}
