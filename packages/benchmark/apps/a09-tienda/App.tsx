import type { ComponentType } from 'react';
import { useStore } from './store/store-context';
import './app.css';

export interface StoreParts {
  StoreHeader: ComponentType;
  ViewHeading: ComponentType;
  CatalogView: ComponentType;
  ProductDetailView: ComponentType;
  CartView: ComponentType;
  CheckoutDialog: ComponentType;
  StoreFooter: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: StoreParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { view } = useStore();
  const {
    StoreHeader,
    ViewHeading,
    CatalogView,
    ProductDetailView,
    CartView,
    CheckoutDialog,
    StoreFooter,
    Announcer,
  } = parts;

  return (
    <div className="tienda">
      <StoreHeader />
      <main id="contenido">
        <ViewHeading />
        {view === 'catalogo' ? <CatalogView /> : null}
        {view === 'producto' ? <ProductDetailView /> : null}
        {view === 'carrito' ? <CartView /> : null}
        <Announcer />
      </main>
      <CheckoutDialog />
      <StoreFooter />
    </div>
  );
}
