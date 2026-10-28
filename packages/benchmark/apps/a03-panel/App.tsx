import type { ComponentType } from 'react';
import './app.css';

export interface PanelParts {
  PanelSummary: ComponentType;
  PanelFilters: ComponentType;
  DataTable: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: PanelParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { PanelSummary, PanelFilters, DataTable, Announcer } = parts;

  return (
    <div className="panel">
      <main id="contenido">
        <h1>Panel de accesibilidad</h1>
        <PanelSummary />
        <PanelFilters />
        <DataTable />
        <Announcer />
      </main>
    </div>
  );
}
