import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

/**
 * Botón. Es un `<button>` real y nada más: la activación con Enter y Espacio la
 * aporta el navegador, no código nuestro. Esa es justamente la propiedad que el
 * operador de eliminación de activación mediante teclado destruye al sustituir
 * el elemento por un contenedor con manejador de clic.
 *
 * `type` vale "button" por omisión y no "submit", que es el valor por omisión
 * del HTML y la causa habitual de envíos involuntarios cuando el botón vive
 * dentro de un formulario.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = 'secondary', type = 'button', className, ...rest },
  ref,
) {
  const classes = ['a11y-button', `a11y-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {children}
    </button>
  );
});
