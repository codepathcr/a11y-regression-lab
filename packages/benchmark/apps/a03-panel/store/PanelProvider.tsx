import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PanelContext, STATES, TICKETS } from './panel-context';
import type { PanelState, SortColumn, SortDirection, Ticket } from './panel-context';

function compare(a: Ticket, b: Ticket, column: SortColumn): number {
  if (column === 'days') return a.days - b.days;
  return a[column].localeCompare(b[column], 'es');
}

export function PanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState('todos');
  const [sort, setSort] = useState<SortColumn>('days');
  const [direction, setDirection] = useState<SortDirection>('descending');
  const [announcement, setAnnouncement] = useState('');

  const rows = useMemo(() => {
    const filtered = state === 'todos' ? TICKETS : TICKETS.filter((t) => t.state === state);
    const sorted = [...filtered].sort((a, b) => compare(a, b, sort));
    return direction === 'ascending' ? sorted : sorted.reverse();
  }, [state, sort, direction]);

  const value = useMemo<PanelState>(
    () => ({
      state,
      setState: (next: string) => {
        setState(next);
        const label = STATES.find((s) => s.id === next)?.label ?? next;
        const count = next === 'todos' ? TICKETS.length : TICKETS.filter((t) => t.state === next).length;
        setAnnouncement(`Filtro ${label}. ${count} incidencias.`);
      },
      sort,
      direction,
      toggleSort: (column: SortColumn) => {
        const nextDirection: SortDirection =
          column === sort && direction === 'ascending' ? 'descending' : 'ascending';
        setSort(column);
        setDirection(nextDirection);
        setAnnouncement(
          `Ordenado por ${column === 'days' ? 'antigüedad' : column === 'title' ? 'título' : 'responsable'}, ${
            nextDirection === 'ascending' ? 'ascendente' : 'descendente'
          }.`
        );
      },
      rows,
      announcement,
    }),
    [state, sort, direction, rows, announcement]
  );

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}
