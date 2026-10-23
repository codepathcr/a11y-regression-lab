import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, LiveRegion, TextField } from '@a11y-lab/ui';

/**
 * Formulario de contacto.
 *
 * Tanto el error de validación como la confirmación de envío se comunican por
 * regiones live presentes desde el primer render. Esa es la propiedad que mide
 * el criterio 4.1.3 y la que destruye el operador de eliminación del anuncio
 * accesible de un mensaje de estado.
 */
export function ContactForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.includes('@')) {
      setError('El correo electrónico debe incluir una arroba.');
      setStatus('');
      return;
    }

    setError(null);
    setStatus('Mensaje enviado. Respondemos en un plazo de dos días hábiles.');
  }

  return (
    <section id="contacto" aria-labelledby="contacto-titulo">
      <h2 id="contacto-titulo">Contacto</h2>
      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Correo electrónico"
          hint="Lo usamos únicamente para responder tu consulta."
          type="text"
          value={email}
          error={error}
          data-testid="email"
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" variant="primary" data-testid="enviar">
          Enviar consulta
        </Button>
        <LiveRegion message={status} />
      </form>
    </section>
  );
}
