import { useState } from 'react';
import { Button, Combobox, Dialog, Disclosure, LiveRegion, Menu, Tabs, TextField } from '@a11y-lab/ui';

/**
 * Galería de primitivas. **No forma parte del benchmark**: las apps cuyo
 * identificador empieza con `_` existen para desarrollo y verificación.
 *
 * Su propósito es ejercitar las ocho primitivas en una sola página para que el
 * chequeo de axe-core las cubra todas, incluidas las que ninguna app usa
 * todavía.
 */
export default function Gallery() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  return (
    <main className="landing">
      <h1>Galería de primitivas</h1>

      <section aria-labelledby="g-button">
        <h2 id="g-button">Button</h2>
        <Button variant="primary" onClick={() => setMessage('Botón primario activado.')}>
          Primario
        </Button>{' '}
        <Button onClick={() => setMessage('Botón secundario activado.')}>Secundario</Button>{' '}
        <Button disabled>Deshabilitado</Button>
      </section>

      <section aria-labelledby="g-field">
        <h2 id="g-field">TextField</h2>
        <TextField
          label="Correo electrónico"
          hint="Con pista y validación."
          value={email}
          error={email && !email.includes('@') ? 'Falta la arroba.' : null}
          onChange={(event) => setEmail(event.target.value)}
        />
      </section>

      <section aria-labelledby="g-disclosure">
        <h2 id="g-disclosure">Disclosure</h2>
        <Disclosure summary="¿Qué contiene esta sección?">
          <p>Contenido plegable, oculto con el atributo hidden.</p>
        </Disclosure>
      </section>

      <section aria-labelledby="g-menu">
        <h2 id="g-menu">Menu</h2>
        <Menu
          label="Acciones"
          items={[
            { id: 'editar', label: 'Editar', onSelect: () => setMessage('Editar seleccionado.') },
            { id: 'duplicar', label: 'Duplicar', onSelect: () => setMessage('Duplicar seleccionado.') },
            { id: 'archivar', label: 'Archivar', onSelect: () => setMessage('Archivar seleccionado.') },
          ]}
        />
      </section>

      <section aria-labelledby="g-tabs">
        <h2 id="g-tabs">Tabs</h2>
        <Tabs
          label="Secciones de ejemplo"
          tabs={[
            { id: 'uno', label: 'Resumen', content: <p>Panel de resumen.</p> },
            { id: 'dos', label: 'Detalle', content: <p>Panel de detalle.</p> },
            { id: 'tres', label: 'Historial', content: <p>Panel de historial.</p> },
          ]}
        />
      </section>

      <section aria-labelledby="g-combobox">
        <h2 id="g-combobox">Combobox</h2>
        <Combobox
          label="País"
          options={[
            { id: 'cr', label: 'Costa Rica' },
            { id: 'gt', label: 'Guatemala' },
            { id: 'mx', label: 'México' },
            { id: 'pa', label: 'Panamá' },
          ]}
          onSelect={(option) => setMessage(`Seleccionado: ${option.label}.`)}
        />
      </section>

      <section aria-labelledby="g-dialog">
        <h2 id="g-dialog">Dialog</h2>
        <Button onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>
        <Dialog open={dialogOpen} title="Diálogo de ejemplo" onClose={() => setDialogOpen(false)}>
          <p>El foco queda retenido y se devuelve al cerrar.</p>
          <Button data-autofocus variant="primary" onClick={() => setDialogOpen(false)}>
            Cerrar
          </Button>
        </Dialog>
      </section>

      <section aria-labelledby="g-live">
        <h2 id="g-live">LiveRegion</h2>
        <LiveRegion message={message} />
      </section>
    </main>
  );
}
