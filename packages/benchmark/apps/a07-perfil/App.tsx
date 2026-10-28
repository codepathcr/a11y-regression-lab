import type { ComponentType } from 'react';
import './app.css';

export interface ProfileParts {
  ProfileTabs: ComponentType;
  SaveBar: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: ProfileParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { ProfileTabs, SaveBar, Announcer } = parts;

  return (
    <div className="perfil">
      <main id="contenido">
        <h1>Ajustes de la cuenta</h1>
        <ProfileTabs />
        <SaveBar />
        <Announcer />
      </main>
    </div>
  );
}
