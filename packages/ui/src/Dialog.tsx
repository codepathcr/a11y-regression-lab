import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Diálogo modal construido sobre el elemento nativo `<dialog>` con
 * `showModal()`. El navegador aporta la retención del foco, el cierre con
 * Escape y la inercia del contenido de fondo, de modo que no se reimplementa
 * nada de eso.
 *
 * Lo que sí se maneja de forma explícita es el foco: al abrir se mueve al
 * elemento marcado con `data-autofocus`, y al cerrar se devuelve al elemento
 * que invocó el diálogo. El navegador hace algo parecido por su cuenta, pero
 * hacerlo explícito le da al operador de pérdida de foco tras una actualización
 * dinámica un objetivo realista: en código real esta es la línea que alguien
 * borra sin notar la consecuencia.
 */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const id = useId();
  const titleId = `${id}-title`;

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    if (open && !element.open) {
      invokerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
      element.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      return;
    }

    if (!open && element.open) {
      element.close();
      invokerRef.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="a11y-dialog"
      onCancel={(event) => {
        // El estado de React es la única fuente de verdad: se impide el cierre
        // nativo y se notifica hacia arriba.
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
