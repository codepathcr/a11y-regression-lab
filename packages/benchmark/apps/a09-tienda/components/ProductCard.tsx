import { Button } from '@a11y-lab/ui';
import type { Product } from '../data/catalog';
import { useStore } from '../store/store-context';

export interface ProductCardProps {
  product: Product;
}

/**
 * Tarjeta de producto. El nombre va en un encabezado dentro de un `<article>`,
 * de modo que la lista sea navegable por encabezados.
 *
 * Los dos botones llevan `aria-label` porque "Ver detalle" repetido seis veces
 * no distingue nada para quien recorre los controles de la página fuera de
 * contexto.
 */
export function ProductCard({ product }: ProductCardProps) {
  const { select, addToCart } = useStore();

  return (
    <li>
      <article className="tienda__card">
        <h3>{product.name}</h3>
        <p className="tienda__precio">{product.price} dólares</p>
        <p>{product.description}</p>
        <div className="tienda__card-acciones">
          <Button
            aria-label={`Ver detalle de ${product.name}`}
            onClick={() => select(product)}
            data-testid={`detalle-${product.id}`}
          >
            Ver detalle
          </Button>
          <Button
            variant="primary"
            aria-label={`Agregar ${product.name} al carrito`}
            onClick={() => addToCart(product)}
            data-testid={`agregar-${product.id}`}
          >
            Agregar
          </Button>
        </div>
      </article>
    </li>
  );
}
