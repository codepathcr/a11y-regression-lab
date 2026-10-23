import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from './Button';

export interface MenuItemSpec {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface MenuProps {
  label: string;
  items: MenuItemSpec[];
}

/**
 * Menú de acciones según el patrón de menu button de las prácticas ARIA.
 *
 * Usa foco itinerante: un solo elemento del menú es tabulable a la vez y las
 * flechas mueven el foco entre ellos. Esa es la propiedad que el operador de
 * orden del foco altera, y es invisible para un validador estático porque el
 * marcado sigue siendo correcto en cualquier instante aislado.
 *
 * Los elementos son `<button role="menuitem">` y no `<li role="menuitem">`
 * para conservar la activación nativa por teclado.
 */
export function Menu({ label, items }: MenuProps) {
  const id = useId();
  const menuId = `${id}-menu`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function openAt(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAt(0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(items.length - 1);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Tabular fuera de un menú abierto lo cierra, sin devolver el foco:
        // el foco debe continuar hacia donde la persona lo mandó.
        close(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className="a11y-menu">
      <Button
        ref={triggerRef}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={onTriggerKeyDown}
      >
        {label}
      </Button>
      {open ? (
        <ul id={menuId} role="menu" aria-label={label} className="a11y-menu__list" onKeyDown={onMenuKeyDown}>
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                className="a11y-menu__item"
                onClick={() => {
                  item.onSelect();
                  close(true);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
