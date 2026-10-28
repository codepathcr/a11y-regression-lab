import { useStore } from '../store/store-context';

const TITLES = {
  catalogo: 'Periféricos para trabajar mejor',
  producto: 'Detalle del producto',
  carrito: 'Tu carrito',
} as const;

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el efecto que mueve el foco al encabezado cuando cambia la vista.
 * El contenido de la página se reemplaza por completo y el foco se queda en el
 * botón de navegación que lo provocó.
 *
 * Quien ve la pantalla no nota nada: el contenido nuevo está ahí. Quien navega
 * por teclado o usa lector de pantalla continúa su recorrido desde un punto que
 * ya no corresponde al contenido mostrado, y no recibe ninguna indicación de
 * que la vista cambió.
 *
 * Ningún validador estático lo reporta: en cualquier instante aislado el marcado
 * es correcto. La diferencia existe solo en la secuencia de foco de la traza.
 */
export function ViewHeadingNoFocus() {
  const { view } = useStore();
  return <h1 tabIndex={-1}>{TITLES[view]}</h1>;
}
