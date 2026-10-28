import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { searchTramites } from '../data/tramites';
import type { Tramite } from '../data/tramites';
import { PortalContext } from './portal-context';
import type { PortalState, View } from './portal-context';

export function PortalProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('lista');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Tramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Tramite | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // Única fuente de asincronía de la app, y por tanto la que pone a prueba el
  // piso de ruido. La búsqueda se dispara al enviar, no en cada tecla.
  useEffect(() => {
    let active = true;
    setLoading(true);
    searchTramites(query).then((list) => {
      if (!active) return;
      setResults(list);
      setLoading(false);
      setAnnouncement(`${list.length} trámites encontrados.`);
    });
    return () => {
      active = false;
    };
  }, [query]);

  const value = useMemo<PortalState>(
    () => ({
      view,
      goTo: setView,
      query,
      search: setQuery,
      results,
      loading,
      selected,
      select: (tramite: Tramite) => {
        setSelected(tramite);
        setView('detalle');
      },
      confirmOpen,
      setConfirmOpen,
      reference,
      submit: () => {
        const code = 'MUN-2026-0418';
        setReference(code);
        setConfirmOpen(false);
        setAnnouncement(`Solicitud presentada. Número de referencia ${code}.`);
        setView('mis');
      },
      announcement,
    }),
    [view, query, results, loading, selected, confirmOpen, reference, announcement]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
