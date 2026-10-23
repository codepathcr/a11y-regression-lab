import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export interface DisclosureProps {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Sección plegable. El disparador comunica su estado con `aria-expanded` y la
 * relación con el panel mediante `aria-controls`; el panel se oculta con el
 * atributo `hidden`, que lo retira del árbol de accesibilidad y del orden de
 * tabulación a la vez.
 *
 * Ocultar con CSS en lugar de `hidden` deja el contenido alcanzable por teclado
 * aunque sea invisible, y es uno de los defectos que el operador de orden del
 * foco puede introducir acá.
 */
export function Disclosure({ summary, children, defaultOpen = false }: DisclosureProps) {
  const id = useId();
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="a11y-disclosure">
      <Button
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((previous) => !previous)}
      >
        {summary}
      </Button>
      <div id={panelId} hidden={!open} className="a11y-disclosure__panel">
        {children}
      </div>
    </div>
  );
}
