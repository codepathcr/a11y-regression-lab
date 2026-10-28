import { Combobox } from '@a11y-lab/ui';
import { CATEGORIES } from '../data/catalog';
import { useStore } from '../store/store-context';
import { ProductCard } from './ProductCard';

/**
 * Vista de catálogo con filtro por categoría y lista de productos.
 *
 * El estado de carga se comunica con `aria-busy` en la región de resultados, y
 * el recuento resultante se anuncia desde la región live de la app. Sin eso,
 * quien no ve la pantalla no tiene forma de saber que la lista cambió: es el
 * criterio 4.1.3 en un caso realista.
 */
export function CatalogView() {
  const { products, loading, setCategory } = useStore();

  return (
    <section aria-labelledby="catalogo-titulo">
      <h2 id="catalogo-titulo">Catálogo</h2>

      <Combobox
        label="Filtrar por categoría"
        options={CATEGORIES.map((category) => ({ id: category.id, label: category.label }))}
        onSelect={(option) => setCategory(option.id)}
      />

      <div aria-busy={loading} className="tienda__resultados">
        {loading ? (
          <p>Cargando productos…</p>
        ) : (
          <ul className="tienda__grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
