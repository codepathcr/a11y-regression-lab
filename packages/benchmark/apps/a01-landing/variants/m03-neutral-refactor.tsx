import App from '../App';
import { baseParts } from '../parts';
import { ContactFormRefactored } from '../mutations/ContactFormRefactored';

/** Control negativo. Ver la cabecera del módulo refactorizado. */
export default function Variant() {
  return <App parts={{ ...baseParts, ContactForm: ContactFormRefactored }} />;
}
