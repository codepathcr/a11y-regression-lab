import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { REASONS, SupportContext } from './support-context';
import type { SupportState } from './support-context';

export function SupportProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [extra, setExtra] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const value = useMemo<SupportState>(
    () => ({
      reason,
      setReason: (next: string) => {
        setReason(next);
        const label = REASONS.find((entry) => entry.id === next)?.label ?? next;
        setAnnouncement(`Motivo seleccionado: ${label}. Se agregó un campo al formulario.`);
      },
      detail,
      setDetail,
      extra,
      setExtra,
      error,
      sent,
      send: () => {
        if (reason === null) {
          const message = 'Elegí un motivo antes de enviar.';
          setError(message);
          setAnnouncement(message);
          return;
        }
        if (detail.trim().length === 0) {
          const message = 'Contanos qué pasó.';
          setError(message);
          setAnnouncement(message);
          return;
        }
        setError(null);
        setSent(true);
        setAnnouncement('Mensaje enviado. Te respondemos dentro de un día hábil.');
      },
      announcement,
    }),
    [reason, detail, extra, error, sent, announcement]
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}
