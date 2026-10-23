import { useId, useState } from 'react';
import type { ReactNode } from 'react';

const QUESTIONS = [
  {
    id: 'plazos',
    question: '¿Cuánto tarda una auditoría?',
    answer: 'Entre dos y cuatro semanas, según la cantidad de flujos a revisar.',
  },
  {
    id: 'alcance',
    question: '¿Qué criterios se revisan?',
    answer: 'Los niveles A y AA de WCAG 2.2, con énfasis en los criterios dependientes de interacción.',
  },
  {
    id: 'informe',
    question: '¿Qué incluye el informe?',
    answer: 'Hallazgos priorizados, evidencia reproducible y recomendación de corrección por cada uno.',
  },
];

/**
 * MUTACIÓN · eliminación de activación mediante teclado · criterio 2.1.1
 *
 * El disparador deja de ser un `<button>` y pasa a ser un `<div>` con manejador
 * de clic. Visualmente idéntico, operable con ratón, **inoperable por teclado**:
 * el div no recibe foco ni responde a Enter o Espacio.
 *
 * Es deliberado que la mutación **no** conserve `aria-expanded` ni
 * `aria-controls`. Un `div` con `aria-expanded` y sin rol sería ARIA inválido y
 * un validador estático lo reportaría, lo que arruinaría el caso: se busca un
 * defecto que solo se manifieste al intentar la interacción.
 */
function PlainDisclosure({ summary, children }: { summary: string; children: ReactNode }) {
  const id = useId();
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(false);

  return (
    <div className="a11y-disclosure">
      <div className="a11y-button a11y-button--ghost" onClick={() => setOpen((previous) => !previous)}>
        {summary}
      </div>
      <div id={panelId} hidden={!open} className="a11y-disclosure__panel">
        {children}
      </div>
    </div>
  );
}

export function FaqSectionNoKeyboard() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-titulo">
      <h2 id="preguntas-titulo">Preguntas frecuentes</h2>
      {QUESTIONS.map((item) => (
        <PlainDisclosure key={item.id} summary={item.question}>
          <p>{item.answer}</p>
        </PlainDisclosure>
      ))}
    </section>
  );
}
