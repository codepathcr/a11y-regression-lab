import { resolveCategory } from './categories';
import type { ParsedVerdict, Verdict } from './types';

/**
 * Extrae el primer objeto JSON del texto.
 *
 * Los modelos envuelven la respuesta de formas variadas —vallas de código,
 * una frase de cortesía antes, una explicación después— y eso no es un fallo de
 * razonamiento sino de formato. Rescatarlo mide el razonamiento; rechazarlo
 * mediría obediencia al formato. Lo segundo también interesa, pero se registra
 * aparte en `issues` y no se confunde con un fallo de detección.
 *
 * El recorrido cuenta llaves respetando cadenas y escapes, porque un corte por
 * la última llave del texto rompe cuando el modelo escribe prosa con llaves
 * después del objeto.
 */
function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      if (inString) escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Lee un booleano admitiendo las formas en que los modelos lo escriben. */
function readBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'si', 'sí', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

/** Lee el índice del paso. Rechaza no enteros y negativos, y admite la cadena
 *  numérica, que es como la devuelven varios modelos locales. */
function readStep(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string') {
    const match = /-?\d+/.exec(value.trim());
    if (match) {
      const parsed = Number.parseInt(match[0], 10);
      if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    }
  }
  return null;
}

/**
 * Convierte la respuesta cruda del modelo en un veredicto comparable.
 *
 * Nunca completa un campo ausente con un valor plausible. Una respuesta que
 * afirma una regresión sin nombrar categoría produce un veredicto con categoría
 * nula y un problema registrado, no una categoría inventada: rellenarla con la
 * más frecuente del benchmark inflaría la exactitud de categoría con aciertos
 * que el modelo no tuvo.
 */
export function parseVerdict(raw: string): ParsedVerdict {
  const issues: string[] = [];
  const json = extractJson(raw);

  if (json === null) {
    return { verdict: null, issues: ['sin objeto JSON en la respuesta'], raw };
  }
  if (json.length !== raw.trim().length) {
    issues.push('la respuesta trae texto fuera del objeto JSON');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { verdict: null, issues: [`JSON mal formado: ${detail}`], raw };
  }

  // No hace falta comprobar que sea un objeto: `extractJson` devuelve siempre
  // una rebanada que empieza en '{' y cierra balanceada, de modo que o lanza al
  // parsear o produce un objeto. La consecuencia buscada es que una respuesta
  // envuelta en un arreglo —`[{...}]`, que algunos modelos producen— se rescata
  // en lugar de descartarse, y el envoltorio queda registrado como texto fuera
  // del objeto. Un guardia de tipo aqui seria codigo inalcanzable.
  const record = parsed as Record<string, unknown>;

  const regression = readBoolean(record['regression']);
  if (regression === null) {
    return { verdict: null, issues: [...issues, 'campo regression ausente o ilegible'], raw };
  }

  const rawCategory = typeof record['category'] === 'string' ? record['category'] : null;
  const category = resolveCategory(rawCategory);
  const transitionStep = readStep(record['transitionStep']);
  const evidence = typeof record['evidence'] === 'string' ? record['evidence'].trim() : '';

  if (regression) {
    if (category === null) {
      issues.push(
        rawCategory === null
          ? 'afirma regresión sin campo category'
          : `categoría no reconocida: ${JSON.stringify(rawCategory)}`
      );
    }
    if (transitionStep === null) issues.push('afirma regresión sin transitionStep legible');
    if (evidence.length === 0) issues.push('afirma regresión sin evidencia de soporte');
  } else {
    // Una respuesta negativa que además nombra categoría o paso se contradice.
    if (category !== null || transitionStep !== null) {
      issues.push('niega regresión pero completa category o transitionStep');
    }
  }

  const verdict: Verdict = {
    regression,
    category: regression ? category : null,
    transitionStep: regression ? transitionStep : null,
    evidence,
  };

  return { verdict, issues, raw };
}
