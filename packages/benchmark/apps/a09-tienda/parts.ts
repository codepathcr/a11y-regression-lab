import type { StoreParts } from './App';
import { StoreHeader } from './components/StoreHeader';
import { ViewHeading } from './components/ViewHeading';
import { CatalogView } from './components/CatalogView';
import { ProductDetailView } from './components/ProductDetailView';
import { CartView } from './components/CartView';
import { CheckoutDialog } from './components/CheckoutDialog';
import { StoreFooter } from './components/StoreFooter';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: StoreParts = {
  StoreHeader,
  ViewHeading,
  CatalogView,
  ProductDetailView,
  CartView,
  CheckoutDialog,
  StoreFooter,
  Announcer,
};
