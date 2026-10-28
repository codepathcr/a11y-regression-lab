import type { ComponentType } from 'react';
import './app.css';

export interface TeamParts {
  TeamToolbar: ComponentType;
  TeamTable: ComponentType;
  InviteDialog: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: TeamParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { TeamToolbar, TeamTable, InviteDialog, Announcer } = parts;

  return (
    <div className="equipo">
      <main id="contenido">
        <h1>Equipo del proyecto</h1>
        <TeamToolbar />
        <TeamTable />
        <Announcer />
      </main>
      <InviteDialog />
    </div>
  );
}
