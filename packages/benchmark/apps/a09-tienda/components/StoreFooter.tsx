import { Disclosure } from '@a11y-lab/ui';

/** Pie con información plegable de envíos y devoluciones. */
export function StoreFooter() {
  return (
    <footer className="tienda__footer">
      <h2>Información</h2>
      <Disclosure summary="¿Cuánto cuesta el envío?">
        <p>Gratuito a partir de 150 dólares. Por debajo de ese monto, 9 dólares.</p>
      </Disclosure>
      <Disclosure summary="¿Puedo devolver un producto?">
        <p>Sí, dentro de los 30 días posteriores a la entrega y sin abrir el empaque.</p>
      </Disclosure>
    </footer>
  );
}
