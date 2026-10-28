import { Button, Tabs } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/** Detalle de un producto, con la información repartida en pestañas. */
export function ProductDetailView() {
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
        <Button variant="primary" onClick={() => addToCart(selected)} data-testid="detalle-agregar">
          Agregar al carrito
        </Button>
        <Button onClick={() => goTo('catalogo')} data-testid="detalle-volver">
          Volver al catálogo
        </Button>
      </div>
    </section>
  );
}
