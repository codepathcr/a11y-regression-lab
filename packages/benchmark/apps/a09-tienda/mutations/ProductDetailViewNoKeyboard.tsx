import { Button, Tabs } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * MUTACIÓN · eliminación de activación mediante teclado · operador propio ·
 * criterio 2.1.1
 *
 * El botón de agregar al carrito deja de responder a Enter y Espacio: se
 * interceptan en `onKeyDown` y se cancela el comportamiento por defecto, que es
 * el que convierte la tecla en un `click`. El manejador del ratón se conserva
 * intacto, de modo que la ruta del ratón es idéntica byte a byte y la única
 * diferencia observable está en la ruta del teclado.
 *
 * El botón sigue siendo un `<button>` con nombre accesible, sigue recibiendo el
 * foco y sigue funcionando con el ratón. Ningún validador estático tiene por
 * dónde verlo.
 *
 * Séptimo anfitrión del operador, y el primero en el que el control inoperable
 * es el que consuma la compra del producto.
 */
export function ProductDetailViewNoKeyboard() {
  const { selected, addToCart, goTo } = useStore();

  if (!selected) {
    return (
      <section aria-labelledby="detalle-vacio">
        <h2 id="detalle-vacio">Sin producto seleccionado</h2>
        <Button onClick={() => goTo('catalogo')}>Volver al catálogo</Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="detalle-titulo">
      <h2 id="detalle-titulo">{selected.name}</h2>
      <p className="tienda__precio">{selected.price} dólares</p>

      <Tabs
        label={`Información de ${selected.name}`}
        tabs={[
          {
            id: 'descripcion',
            label: 'Descripción',
            content: <p>{selected.description}</p>,
          },
          {
            id: 'especificaciones',
            label: 'Especificaciones',
            content: (
              <ul>
                {selected.specs.map((spec) => (
                  <li key={spec}>{spec}</li>
                ))}
              </ul>
            ),
          },
          {
            id: 'envio',
            label: 'Envío',
            content: <p>{selected.shipping}</p>,
          },
        ]}
      />

      <div className="tienda__card-acciones">
        <Button
          variant="primary"
          onClick={() => addToCart(selected)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
            }
          }}
          data-testid="detalle-agregar"
        >
          Agregar al carrito
        </Button>
        <Button onClick={() => goTo('catalogo')} data-testid="detalle-volver">
          Volver al catálogo
        </Button>
      </div>
    </section>
  );
}
