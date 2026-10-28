import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * Variante de mecanismo distinto al resto: no se retira una región live, se
 * retira **`aria-busy`** de la región de resultados. El texto "Consultando el
 * catálogo…" sigue apareciendo en pantalla, pero la región deja de declararse
 * ocupada mientras espera los datos.
 *
 * La consecuencia es que una tecnología asistiva puede leer la región en pleno
 * reemplazo y anunciar contenido a medio construir, o anunciar la lista vieja
 * como si fuera la respuesta a la consulta nueva. `aria-busy` existe
 * precisamente para que eso no pase.
 *
 * Interesa tener este caso porque las otras cinco instancias del operador
 * retiran `role` y `aria-live` de un contenedor, y un detector podría estar
 * reconociendo ese patrón concreto en lugar del fenómeno. Este mutante prueba
 * si detecta la pérdida de comunicación de estado cuando el mecanismo es otro.
 *
 * Séptimo anfitrión del operador.
 */
export function TramiteSearchNoBusy() {
  const { results, loading, search, select } = usePortal();
  const [draft, setDraft] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(draft);
  }

  return (
    <section aria-labelledby="buscar-titulo">
      <h2 id="buscar-titulo">Buscar un trámite</h2>
      <form onSubmit={onSubmit} role="search" aria-label="Buscar trámites">
        <TextField
          label="Nombre o área del trámite"
          type="text"
          value={draft}
          data-testid="buscar-campo"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="primary" data-testid="buscar">
          Buscar
        </Button>
      </form>

      <div className="portal__resultados">
        {loading ? (
          <p>Consultando el catálogo…</p>
        ) : (
          <ul className="portal__lista">
            {results.map((tramite) => (
              <li key={tramite.id}>
                <article>
                  <h3>{tramite.name}</h3>
                  <p className="portal__meta">
                    {tramite.area} · {tramite.days} · {tramite.cost}
                  </p>
                  <Button
                    aria-label={`Ver requisitos de ${tramite.name}`}
                    data-testid={`ver-${tramite.id}`}
                    onClick={() => select(tramite)}
                  >
                    Ver requisitos
                  </Button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
