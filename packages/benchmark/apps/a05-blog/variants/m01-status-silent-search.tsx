import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';
import { SearchBarSilent } from '../mutations/SearchBarSilent';

/** Sustituye unicamente SearchBar. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <BlogProvider>
      <App parts={{ ...baseParts, SearchBar: SearchBarSilent }} />
    </BlogProvider>
  );
}
