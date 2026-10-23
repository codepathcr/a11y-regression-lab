import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * criterio 4.1.3
 *
 * La confirmación de envío se inserta en un `<div>` sin `role` ni `aria-live`.
 * El texto aparece en pantalla igual que antes, de modo que quien ve la interfaz
 * no nota nada; quien usa lector de pantalla no recibe ningún anuncio y no sabe
 * que el formulario se envió.
 *
 * Ningún validador estático reporta esto: un `div` con texto es marcado válido.
 * La diferencia existe únicamente en la traza, como la ausencia de un evento de
 * anuncio que la versión base sí produce.
 */
export function ContactFormSilentStatus() {
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
        <div className="a11y-live">{status}</div>
      </form>
    </section>
  );
}
