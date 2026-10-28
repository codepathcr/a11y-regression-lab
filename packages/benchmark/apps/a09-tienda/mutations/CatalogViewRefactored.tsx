import { Combobox } from '@a11y-lab/ui';
import { CATEGORIES } from '../data/catalog';
import { useStore } from '../store/store-context';
import { ProductCard } from './../components/ProductCard';

/**
 * CONTROL NEGATIVO · reestructuración del DOM sin cambio semántico
 *
 * Se envuelve la cuadrícula de resultados en un contenedor adicional sin rol ni
 * nombre accesible, y se extrae el cuerpo de la región a una función auxiliar.
 * Es la forma típica de un cambio de maquetación en un Pull Request: aparece un
 * `<div>` nuevo para colgarle una clase de CSS.
 *
 * El árbol de accesibilidad no debe cambiar —un `div` sin rol no genera nodo— y
 * tampoco debe cambiar ningún evento. Con identidad semántica el par no
 * divergirá; con identidad estructural divergiría en cada nodo descendiente,
 * que es justamente la medición que descartó esa alternativa.
 */
export function CatalogViewRefactored() {
  const { products, loading, setCategory } = useStore();

  function renderResults() {
    if (loading) {
      return <p>Cargando productos…</p>;
    }
    return (
      <ul className="tienda__grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="catalogo-titulo">
      <h2 id="catalogo-titulo">Catálogo</h2>

      <Combobox
        label="Filtrar por categoría"
        options={CATEGORIES.map((category) => ({ id: category.id, label: category.label }))}
        onSelect={(option) => setCategory(option.id)}
      />

      <div className="tienda__resultados-envoltura">
        <div aria-busy={loading} className="tienda__resultados">
          {renderResults()}
        </div>
      </div>
    </section>
  );
}
