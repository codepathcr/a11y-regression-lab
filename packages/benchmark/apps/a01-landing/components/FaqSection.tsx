import { Disclosure } from '@a11y-lab/ui';

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
 * Preguntas frecuentes plegables. Cada pregunta es un `Disclosure`, de modo que
 * el disparador es un `<button>` real y la activación por teclado la aporta el
 * navegador.
 */
export function FaqSection() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-titulo">
      <h2 id="preguntas-titulo">Preguntas frecuentes</h2>
      {QUESTIONS.map((item) => (
        <Disclosure key={item.id} summary={item.question}>
          <p>{item.answer}</p>
        </Disclosure>
      ))}
    </section>
  );
}
