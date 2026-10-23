import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface TabSpec {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  label: string;
  tabs: TabSpec[];
}

/**
 * Pestañas con **activación manual**: las flechas mueven el foco y Enter o
 * Espacio cambian el panel. Las prácticas ARIA admiten también la activación
 * automática, donde el panel cambia al recibir el foco, pero ese
 * comportamiento es el que puede incumplir el criterio 3.2.1 cuando el cambio
 * de panel arrastra un cambio de contexto mayor.
 *
 * La base accesible es por tanto la activación manual, y pasar a automática con
 * efectos colaterales es una de las mutaciones previstas.
 */
export function Tabs({ label, tabs }: TabsProps) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const movedByKeyboard = useRef(false);

  useEffect(() => {
    if (movedByKeyboard.current) {
      tabRefs.current[focused]?.focus();
      movedByKeyboard.current = false;
    }
  }, [focused]);

  function move(index: number) {
    movedByKeyboard.current = true;
    setFocused(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        move((focused + 1) % tabs.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        move((focused - 1 + tabs.length) % tabs.length);
        break;
      case 'Home':
        event.preventDefault();
        move(0);
        break;
      case 'End':
        event.preventDefault();
        move(tabs.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setSelected(focused);
        break;
      default:
        break;
    }
  }

  return (
    <div className="a11y-tabs">
      <div role="tablist" aria-label={label} className="a11y-tabs__list" onKeyDown={onKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.id}`}
            aria-selected={index === selected}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={index === focused ? 0 : -1}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            className="a11y-tabs__tab"
            onClick={() => {
              setFocused(index);
              setSelected(index);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${id}-panel-${tab.id}`}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={index !== selected}
          tabIndex={0}
          className="a11y-tabs__panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
