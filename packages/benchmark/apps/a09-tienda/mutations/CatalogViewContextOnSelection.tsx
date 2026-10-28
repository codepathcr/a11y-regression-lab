import { Combobox } from '@a11y-lab/ui';
import { CATEGORIES } from '../data/catalog';
import { useStore } from '../store/store-context';
import { ProductCard } from '../components/ProductCard';

/**
 * MUTACIÓN · CCS, Change Context on Selection · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.2
 *
 * El paper de Ma11y define el operador por su nombre y su categoría
 * —Understandable / Predictable, falla F37— pero no detalla la transformación.
 * La operacionalización que sigue es propia de este estudio y se declara como
 * tal.
 *
 * Transformación: seleccionar una categoría en el combo deja de filtrar la lista
 * y pasa a navegar a la vista de detalle del primer producto de esa categoría.
 * La selección de un valor provoca un cambio de contexto que nadie pidió.
 *
 * Es el caso que el criterio 3.2.2 describe literalmente: cambiar el ajuste de
 * un control no debe cambiar el contexto sin advertencia previa. El marcado
 * sigue siendo válido en todo momento.
 */
export function CatalogViewContextOnSelection() {
  const { products, loading, setCategory, select } = useStore();

  return (
    <section aria-labelledby="catalogo-titulo">
      <h2 id="catalogo-titulo">Catálogo</h2>

      <Combobox
        label="Filtrar por categoría"
        options={CATEGORIES.map((category) => ({ id: category.id, label: category.label }))}
        onSelect={(option) => {
          setCategory(option.id);
          const first = products.find((product) => product.category === option.id);
          if (first) select(first);
        }}
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
