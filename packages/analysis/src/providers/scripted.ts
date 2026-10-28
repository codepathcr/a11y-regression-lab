import type { Completion, CompletionResult, Provider } from '../types';

/**
 * Proveedor que devuelve respuestas preparadas, sin red y sin modelo.
 *
 * No es un accesorio de pruebas: es lo que permite validar el armado de los
 * prompts, el parser, las métricas y los reportes sin que exista un modelo en la
 * máquina. Tiene tres usos concretos:
 *
 *  1. Ejercitar las rutas de error del parser —JSON con vallas de código,
 *     objeto incompleto, categoría inventada, respuesta que se contradice—, que
 *     con un modelo real aparecen de forma esporádica y no se pueden provocar.
 *  2. Dejar que el prototipo donado se pueda ejecutar de punta a punta sin
 *     descargar varios gigabytes de pesos.
 *  3. Separar un fallo del pipeline de un fallo del modelo: si algo rompe con
 *     este proveedor, el problema no es del modelo.
 *
 * El guion se recorre en orden y se repite en ciclo, de modo que una corrida de
 * sesenta pares no necesita sesenta respuestas escritas a mano.
 */
export class ScriptedProvider implements Provider {
  readonly kind = 'scripted';
  readonly metered = false;
  private index = 0;

  constructor(
    readonly id: string,
    readonly label: string,
    private readonly responses: string[],
    private readonly latencyMs = 0
  ) {
    if (responses.length === 0) throw new Error('ScriptedProvider necesita al menos una respuesta');
  }

  async complete(completion: Completion): Promise<CompletionResult> {
    const text = this.responses[this.index % this.responses.length];
    this.index += 1;
    // El conteo de tokens es una aproximación por palabras. No se usa para
    // ninguna cifra del documento: con este proveedor el costo no tiene sentido.
    return Promise.resolve({
      text,
      promptTokens: (completion.system + completion.user).split(/\s+/).length,
      completionTokens: text.split(/\s+/).length,
      latencyMs: this.latencyMs,
    });
  }
}
