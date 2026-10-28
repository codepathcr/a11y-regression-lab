import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ProfileContext } from './profile-context';
import type { ProfileState, ProfileValues } from './profile-context';

const INITIAL: ProfileValues = {
  nombre: 'Ana Pérez',
  correo: 'ana@ejemplo.com',
  avisosCorreo: true,
  avisosResumen: false,
  perfilPublico: false,
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<ProfileValues>(INITIAL);
  const [dirty, setDirty] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const value = useMemo<ProfileState>(
    () => ({
      values,
      setValue: (field, next) => {
        setValues((current) => ({ ...current, [field]: next }));
        setDirty(true);
      },
      dirty,
      save: () => {
        setDirty(false);
        setAnnouncement('Cambios guardados.');
      },
      announcement,
    }),
    [values, dirty, announcement]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
