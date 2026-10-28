/**
 * Las cuatro categorías de regresión del alcance aprobado.
 *
 * Son las que el modelo debe nombrar y contra las que se calcula la exactitud de
 * categoría. El orden es el del documento de aprobación.
 */
export const CATEGORIES = [
  'orden y continuidad del foco',
  'operación mediante teclado',
  'cambios inesperados de contexto',
  'comunicación accesible de actualizaciones dinámicas',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Criterios WCAG 2.2 que cada categoría cubre, para construir el enunciado del
 * prompt desde una sola fuente y no repetirlo en las tres plantillas.
 */
export const CATEGORY_CRITERIA: Record<Category, string[]> = {
  'orden y continuidad del foco': ['2.4.3'],
  'operación mediante teclado': ['2.1.1'],
  'cambios inesperados de contexto': ['3.2.1', '3.2.2'],
  'comunicación accesible de actualizaciones dinámicas': ['4.1.3'],
};

/** Quita diacríticos y pasa a minúsculas, para comparar sin depender de tildes. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const INDEX = new Map<string, Category>(CATEGORIES.map((category) => [fold(category), category]));

/**
 * Resuelve lo que respondió el modelo a una de las cuatro categorías, o a null.
 *
 * La comparación ignora tildes, mayúsculas y espacios de más, y acepta que la
 * categoría venga dentro de una frase más larga. La razón es metodológica: lo
 * que se mide es si el modelo identificó la categoría, no si escribió las tildes.
 * Un modelo que responde "Orden y continuidad del foco." acertó, y contarlo como
 * fallo mediría ortografía en lugar de accesibilidad.
 *
 * Lo que NO hace es adivinar: no acepta sinónimos, abreviaturas ni traducciones.
 * Si el modelo responde "focus order" el resultado es null, porque no respondió
 * en los términos que el instrumento le pidió y el instrumento se los da
 * literalmente en el prompt.
 */
export function resolveCategory(value: string | null | undefined): Category | null {
  if (!value) return null;
  const folded = fold(value);
  const exact = INDEX.get(folded);
  if (exact) return exact;
  for (const [key, category] of INDEX) {
    if (folded.includes(key)) return category;
  }
  return null;
}
