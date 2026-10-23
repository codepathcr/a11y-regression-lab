import App from '../App';
import { baseParts } from '../parts';
import { FaqSectionNoKeyboard } from '../mutations/FaqSectionNoKeyboard';

/** Sustituye únicamente FaqSection. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return <App parts={{ ...baseParts, FaqSection: FaqSectionNoKeyboard }} />;
}
