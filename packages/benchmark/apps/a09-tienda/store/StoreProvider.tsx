import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchProducts } from '../data/catalog';
import type { Product } from '../data/catalog';
import { StoreContext } from './store-context';
import type { CartLine, StoreState, View } from './store-context';

/**
 * Estado de la tienda. Vive en un contexto para que las partes intercambiables
 * de la app sigan siendo componentes sin props, igual que en a01-landing: una
 * mutación sustituye un componente y nada más.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('catalogo');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('todas');
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Carga asíncrona del catálogo. Es la única fuente de asincronía de la app y
  // por tanto la que pone a prueba el piso de ruido.
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProducts(category).then((list) => {
      if (!active) return;
      setProducts(list);
      setLoading(false);
      setAnnouncement(`${list.length} productos en la lista.`);
    });
    return () => {
      active = false;
    };
  }, [category]);

  const addToCart = useCallback((product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      const next = existing
        ? current.map((line) =>
            line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
          )
        : [...current, { product, quantity: 1 }];
      const total = next.reduce((sum, line) => sum + line.quantity, 0);
      setAnnouncement(`${product.name} agregado. ${total} artículos en el carrito.`);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) => {
      const next = current.filter((line) => line.product.id !== productId);
      const total = next.reduce((sum, line) => sum + line.quantity, 0);
      setAnnouncement(`Producto retirado. ${total} artículos en el carrito.`);
      return next;
    });
  }, []);

  const value = useMemo<StoreState>(
    () => ({
      view,
      goTo: setView,
      products,
      loading,
      category,
      setCategory,
      selected,
      select: (product: Product) => {
        setSelected(product);
        setView('producto');
      },
      cart,
      cartCount: cart.reduce((sum, line) => sum + line.quantity, 0),
      addToCart,
      removeFromCart,
      announcement,
      checkoutOpen,
      setCheckoutOpen,
      placeOrder: () => {
        setCart([]);
        setCheckoutOpen(false);
        setAnnouncement('Pedido confirmado. Recibirás un correo con el detalle.');
        setView('catalogo');
      },
    }),
    [view, products, loading, category, selected, cart, announcement, checkoutOpen, addToCart, removeFromCart]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
