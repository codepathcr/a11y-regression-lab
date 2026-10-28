import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { CatalogViewRefactored } from '../mutations/CatalogViewRefactored';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, CatalogView: CatalogViewRefactored }} />
    </StoreProvider>
  );
}
