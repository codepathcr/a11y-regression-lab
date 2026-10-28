import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** Trazas capturadas, una por variante. Regenerables: no se versionan. */
export const TRACES = resolve(ROOT, 'data', 'traces');
/** Resultados de inferencia, en JSONL de una linea por llamada. Se versionan:
 *  son la bitacora de ejecucion del Instrumento 5. */
export const RESULTS = resolve(ROOT, 'data', 'results');
/** Linea base del validador estatico. */
export const BASELINE = resolve(ROOT, 'data', 'baseline');

export function tracePath(app: string, variant: string): string {
  return resolve(TRACES, app, `${variant}.json`);
}
