import { useStore } from '../store/store-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor pierde `role="status"` y `aria-live`. Se pierden el recuento de
 * productos tras filtrar, la confirmación de cada producto agregado al carrito
 * con su total acumulado, el aviso de retiro, y la confirmación del pedido.
 *
 * El caso más grave es el del carrito: el anuncio incluye el total de artículos
 * acumulados, que es la única forma de verificar que el producto se agregó una
 * vez y no tres. Sin él, agregar al carrito es una acción sin confirmación.
 *
 * Octavo anfitrión del operador.
 */
export function AnnouncerSilent() {
  const { announcement } = useStore();
  return <div className="a11y-live">{announcement}</div>;
}
