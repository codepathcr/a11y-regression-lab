import { useEffect, useRef } from 'react';
import { useStore } from '../store/store-context';

const TITLES = {
  catalogo: 'Periféricos para trabajar mejor',
  producto: 'Detalle del producto',
  carrito: 'Tu carrito',
} as const;

/**
 * Encabezado de la vista activa, con el manejo del foco al cambiar de vista.
 *
 * Cuando la vista cambia sin que la URL cambie, el foco se queda donde estaba y
 * quien usa lector de pantalla no se entera de que el contenido se reemplazó.
 * Moverlo al encabezado de la vista nueva es el comportamiento accesible.
 *
 * Esta lógica vive en una parte intercambiable y no en la composición de la app
 * justamente para que sea mutable: en código real, el efecto de abajo es la
 * línea que alguien elimina por considerarla innecesaria.
 *
 * No se mueve el foco en el primer render: al cargar la página el foco ya está
 * donde corresponde y moverlo sería intrusivo.
 */
export function ViewHeading() {
  const { view } = useStore();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view]);

  return (
    <h1 ref={headingRef} tabIndex={-1}>
      {TITLES[view]}
    </h1>
  );
}
