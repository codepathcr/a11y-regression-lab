import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { CheckoutDialogContextOnBlur } from '../mutations/CheckoutDialogContextOnBlur';

/** Sustituye únicamente CheckoutDialog. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, CheckoutDialog: CheckoutDialogContextOnBlur }} />
    </StoreProvider>
  );
}
