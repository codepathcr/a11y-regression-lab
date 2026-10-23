import App from '../App';
import { baseParts } from '../parts';
import { ContactFormSilentStatus } from '../mutations/ContactFormSilentStatus';

/** Sustituye únicamente ContactForm. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return <App parts={{ ...baseParts, ContactForm: ContactFormSilentStatus }} />;
}
