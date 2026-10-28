import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * Buscador.
 *
 * La búsqueda se dispara al enviar el formulario y no en cada tecla. Es una
 * decisión de accesibilidad: filtrar mientras se escribe cambia el contenido
 * bajo el cursor sin que la persona lo haya pedido, y obliga a anunciar en cada
 * pulsación o a no anunciar nada.
 */
export function SearchBar() {
  const { setQuery, matches } = useBlog();
  const [draft, setDraft] = useState('');
  const [searched, setSearched] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft);
    setSearched(true);
  }

  return (
    <search>
      <form onSubmit={onSubmit} role="search" aria-label="Buscar artículos">
        <TextField
          label="Buscar en el blog"
          type="text"
          value={draft}
          data-testid="busqueda"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="primary" data-testid="buscar">
          Buscar
        </Button>
      </form>
      <p role="status" aria-live="polite" className="a11y-live">
        {searched ? `${matches.length} artículos encontrados.` : ''}
      </p>
    </search>
  );
}
