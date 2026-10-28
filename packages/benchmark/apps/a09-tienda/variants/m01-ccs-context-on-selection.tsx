import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { CatalogViewContextOnSelection } from '../mutations/CatalogViewContextOnSelection';

/** Sustituye únicamente CatalogView. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, CatalogView: CatalogViewContextOnSelection }} />
    </StoreProvider>
  );
}
