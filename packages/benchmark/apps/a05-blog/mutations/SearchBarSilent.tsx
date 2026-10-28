import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor del recuento de resultados pierde `role="status"` y
 * `aria-live`. El número sigue en pantalla.
 *
 * Es el caso canónico de este criterio: la persona busca, el número de
 * resultados cambia, y quien no ve la pantalla no tiene forma de saber si la
 * búsqueda encontró veinte artículos o ninguno. Tiene que irse a explorar la
 * lista para averiguarlo.
 *
 * Cuarto anfitrión del operador, y el único donde la región live afectada
 * pertenece a un componente y no al anuncio general de la app: aquí se pierde el
 * recuento de la búsqueda, mientras el anuncio del cambio de página sigue
 * funcionando. Un mutante que rompa una de dos regiones live permite comprobar
 * que el detector localiza cuál.
 */
export function SearchBarSilent() {
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
      <p className="a11y-live">{searched ? `${matches.length} artículos encontrados.` : ''}</p>
    </search>
  );
}
