import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-invalid' | 'aria-describedby'> {
  label: string;
  error?: string | null;
  hint?: string;
}

/**
 * Campo de texto con etiqueta asociada por `htmlFor`, no por proximidad visual.
 *
 * El contenedor del mensaje de error está presente en el DOM desde el primer
 * render, aunque esté vacío. Es deliberado: una región live insertada al mismo
 * tiempo que su contenido no se anuncia de forma fiable, porque la tecnología
 * asistiva no tuvo oportunidad de observarla antes del cambio. Preservar ese
 * detalle es lo que hace que el par base-mutante del criterio 4.1.3 sea honesto.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, ...rest },
  ref,
) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="a11y-field">
      <label htmlFor={inputId}>{label}</label>
      {hint ? (
        <p id={hintId} className="a11y-field__hint">
          {hint}
        </p>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      />
      <div id={errorId} role="alert" className="a11y-field__error">
        {error ?? ''}
      </div>
    </div>
  );
});
