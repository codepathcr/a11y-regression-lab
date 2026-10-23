import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button, LiveRegion, TextField } from '@a11y-lab/ui';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Refactorización realista: la validación se extrae a una función pura y los
 * campos se envuelven en un contenedor de maquetación. La semántica, los roles,
 * los nombres accesibles, el orden de foco y los anuncios son idénticos a los
 * de la versión base.
 *
 * Importa saber por qué este caso es valioso y no trivial: el contenedor
 * adicional **desplaza la ruta en el DOM** de todos los elementos que envuelve.
 * Si la identidad de un elemento en la traza se construye a partir de su ruta,
 * este cambio neutral va a producir diferencias y el detector va a reportar un
 * falso positivo. Es exactamente el fenómeno que la fase de normalización debe
 * resolver, y la razón por la que conviene identificar elementos por rol y
 * nombre accesible antes que por posición estructural.
 */
function validate(email: string): string | null {
  return email.includes('@') ? null : 'El correo electrónico debe incluir una arroba.';
}

function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="landing__field-group">{children}</div>;
}

export function ContactFormRefactored() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate(email);
    setError(validationError);
    setStatus(
      validationError ? '' : 'Mensaje enviado. Respondemos en un plazo de dos días hábiles.'
    );
  }

  return (
    <section id="contacto" aria-labelledby="contacto-titulo">
      <h2 id="contacto-titulo">Contacto</h2>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
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
        </FieldGroup>
        <LiveRegion message={status} />
      </form>
    </section>
  );
}
