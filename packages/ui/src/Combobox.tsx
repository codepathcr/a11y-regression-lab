import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface ComboboxOption {
  id: string;
  label: string;
}

export interface ComboboxProps {
  label: string;
  options: ComboboxOption[];
  onSelect?: (option: ComboboxOption) => void;
}

/**
 * Combo editable con lista de sugerencias, según el patrón de combobox de
 * ARIA 1.2.
 *
 * El foco **nunca sale del campo de texto**: la opción activa se comunica con
 * `aria-activedescendant`. Es la diferencia central respecto de un menú, y la
 * razón por la que este componente es un anfitrión natural para el operador de
 * cambio inesperado de contexto al ingresar datos (criterio 3.2.2): basta con
 * que escribir dispare un efecto mayor que filtrar la lista.
 *
 * El recuento de resultados se muestra **sin región live**, y la decisión es
 * deliberada. Una región live que refleje el recuento mientras la persona
 * escribe produce un anuncio por cada pulsación: es insoportable de escuchar y
 * además interrumpe la propia escritura. Un retardo lo evitaría, pero
 * introduciría un temporizador justo en el camino que la traza mide, y con él
 * indeterminismo que no pertenece al fenómeno estudiado.
 *
 * El recuento queda entonces como texto visible para quien ve la pantalla,
 * mientras que la navegación por la lista la comunica `aria-activedescendant`
 * opción por opción, que es lo que el patrón de ARIA prevé. El anuncio del
 * resultado corresponde al momento de **seleccionar**, y lo hace la aplicación
 * que consume el componente, no la primitiva.
 */
export function Combobox({ label, options, onSelect }: ComboboxProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const inputId = `${id}-input`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const activeOption = activeIndex >= 0 ? matches[activeIndex] : undefined;

  function commit(option: ComboboxOption | undefined) {
    if (!option) return;
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(option);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) => (matches.length === 0 ? -1 : (index + 1) % matches.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) =>
          matches.length === 0 ? -1 : (index - 1 + matches.length) % matches.length,
        );
        break;
      case 'Enter':
        if (open && activeOption) {
          event.preventDefault();
          commit(activeOption);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  return (
    <div className="a11y-combobox">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        role="combobox"
        type="text"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption ? `${id}-option-${activeOption.id}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <ul id={listboxId} role="listbox" aria-label={label} hidden={!open} className="a11y-combobox__list">
        {matches.map((option, index) => (
          <li
            key={option.id}
            id={`${id}-option-${option.id}`}
            role="option"
            aria-selected={index === activeIndex}
            className="a11y-combobox__option"
            onMouseDown={(event) => {
              // mousedown y no click: evita que el campo pierda el foco antes
              // de registrar la selección.
              event.preventDefault();
              commit(option);
            }}
          >
            {option.label}
          </li>
        ))}
      </ul>
      <p className="a11y-combobox__recuento" aria-hidden="true">
        {open ? `${matches.length} resultados` : ''}
      </p>
    </div>
  );
}
