import { Disclosure } from '@a11y-lab/ui';

/**
 * DIVERGENCIA BENIGNA · alta de un control plegable con marcado correcto
 *
 * Se agrega una tercera sección plegable al pie, con el mismo patrón de las dos
 * existentes. Suma un punto de tabulación y varios nodos al árbol de
 * accesibilidad.
 *
 * Sumar un punto de tabulación es lo que lo hace valioso: el orden de
 * tabulación CAMBIA, y la respuesta correcta sigue siendo que no hay regresión,
 * porque el control nuevo es alcanzable, tiene nombre accesible y está en una
 * posición coherente con su lugar en la página. Es el contraste del operador
 * CTO, que también cambia el orden de tabulación y sí es una regresión.
 */
export function StoreFooterExtraNote() {
  return (
    <footer className="tienda__footer">
      <h2>Información</h2>
      <Disclosure summary="¿Cuánto cuesta el envío?">
        <p>Gratuito a partir de 150 dólares. Por debajo de ese monto, 9 dólares.</p>
      </Disclosure>
      <Disclosure summary="¿Puedo devolver un producto?">
        <p>Sí, dentro de los 30 días posteriores a la entrega y sin abrir el empaque.</p>
      </Disclosure>
      <Disclosure summary="¿Qué garantía tienen los productos?">
        <p>Doce meses por defectos de fábrica, con la factura de compra.</p>
      </Disclosure>
    </footer>
  );
}
