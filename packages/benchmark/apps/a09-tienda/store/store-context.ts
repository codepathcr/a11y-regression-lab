import { createContext, useContext } from 'react';
import type { Product } from '../data/catalog';

export interface CartLine {
  product: Product;
  quantity: number;
}

export type View = 'catalogo' | 'producto' | 'carrito';

export interface StoreState {
  view: View;
  goTo: (view: View) => void;
  products: Product[];
  loading: boolean;
  category: string;
  setCategory: (category: string) => void;
  selected: Product | null;
  select: (product: Product) => void;
  cart: CartLine[];
  cartCount: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  announcement: string;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  placeOrder: () => void;
}

export const StoreContext = createContext<StoreState | null>(null);

export function useStore(): StoreState {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error('useStore debe usarse dentro de StoreProvider');
  }
  return value;
}
