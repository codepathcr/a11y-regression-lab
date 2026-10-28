import type { Completion, CompletionResult, Provider } from '../types';

export interface OllamaOptions {
  /** Semilla y temperatura van en cero y fijas: la variable del estudio es la
   *  estrategia de análisis, no el muestreo del modelo. */
  temperature?: number;
  seed?: number;
  /** Ventana de contexto. Ollama la recorta en silencio al valor del modelo si
   *  se pide más, y un prompt truncado produce un falso negativo que parece un
   *  fallo de detección. Por eso el proveedor verifica el tamaño del prompt. */
  num_ctx?: number;
  [key: string]: unknown;
}

export interface OllamaConfig {
  id: string;
  label: string;
  /** Nombre del modelo tal como lo sirve Ollama, por ejemplo "llama3.1:8b". */
  model: string;
  baseUrl: string;
  requestTimeoutMs: number;
  options: OllamaOptions;
  /**
   * Cuánto mantiene Ollama el modelo residente entre peticiones.
   *
   * Falta de esto costó caro. Sin el campo, Ollama aplica su valor por omisión
   * de unos minutos y descarga el modelo por inactividad; en una tanda de
   * doscientas llamadas, cada pausa obliga a volver a cargar diez gigabytes
   * desde disco. El síntoma no se parece a su causa: llamadas sueltas que tardan
   * minutos sin que el prompt tenga nada de particular.
   */
  keepAlive: string;
  /**
   * Restricción de formato de la salida.
   *
   * `'json'` impone una gramática: el servidor solo deja emitir tokens que
   * formen un JSON válido. Es lo que se quiere para el veredicto, y es
   * incompatible con pedir un solo token de salida: ni `{}` cabe en un token, de
   * modo que el muestreador no puede terminar la secuencia y la petición se
   * queda sin responder, con la GPU al dos por ciento. Ese fue el síntoma que
   * dejó colgada la sonda de tokens mientras `ollama run` contestaba sin
   * problema.
   *
   * Por eso es configurable: quien solo quiere medir el costo del prompt la
   * desactiva.
   */
  format?: 'json' | null;
  /**
   * Acepta una respuesta cortada por longitud en lugar de tratarla como error.
   *
   * Para la medición real, un corte por longitud ES un error: produce JSON
   * incompleto y hay que distinguirlo de una respuesta mal formada. Para quien
   * solo quiere el conteo de tokens del prompt y pide un token de salida, el
   * corte es el resultado esperado.
   */
  allowTruncation?: boolean;
}

interface OllamaResponse {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  done_reason?: string;
}

/**
 * Proveedor de Ollama.
 *
 * Habla con `/api/generate` y no con `/api/chat` porque el estudio no necesita
 * conversación: cada par es una consulta independiente, y `generate` con
 * `system` y `prompt` separados es el camino más corto y el que menos difiere
 * entre modelos.
 *
 * `stream: false` es deliberado: el streaming no aporta nada a una medición por
 * lotes y complica el conteo de tokens.
 */
export class OllamaProvider implements Provider {
  readonly kind = 'ollama';
  readonly metered = false;

  constructor(private readonly config: OllamaConfig) {}

  get id(): string {
    return this.config.id;
  }

  get label(): string {
    return this.config.label;
  }

  async complete(completion: Completion): Promise<CompletionResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    const started = performance.now();

    /**
     * Reloj propio alrededor de TODA la operación.
     *
     * La señal del `fetch` no alcanzó: una petición se quedó sin responder
     * durante más de tres minutos con un límite de ciento veinte segundos, de
     * modo que el abort no cubría la etapa en la que estaba detenida. Una espera
     * sin tope es lo peor que puede tener un ejecutor por lotes, porque no falla
     * y no avanza: se queda. Este reloj garantiza que la promesa termina.
     */
    const deadline = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `Ollama no respondió en ${this.config.requestTimeoutMs} ms para el modelo ${this.config.model} ` +
                '(reloj del cliente)'
            )
          ),
        this.config.requestTimeoutMs + 2_000
      ).unref();
    });

    try {
      const response = await Promise.race([deadline, fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          system: completion.system,
          prompt: completion.user,
          stream: false,
          ...(this.config.format === null ? {} : { format: this.config.format ?? 'json' }),
          keep_alive: this.config.keepAlive,
          options: this.config.options,
        }),
      })]);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Ollama respondió ${response.status} para el modelo ${this.config.model}. ${body.slice(0, 400)}`
        );
      }

      const payload = (await Promise.race([deadline, response.json()])) as OllamaResponse;
      const latencyMs = Math.round(performance.now() - started);

      if (typeof payload.response !== 'string') {
        throw new Error(`Ollama no devolvió texto para el modelo ${this.config.model}.`);
      }

      // Un corte por longitud produce JSON incompleto, que el parser reportaría
      // como respuesta mal formada. Son cosas distintas y conviene distinguirlas
      // en el origen.
      if (payload.done_reason === 'length' && this.config.allowTruncation !== true) {
        throw new Error(
          `La respuesta de ${this.config.model} se cortó por longitud. Subí num_predict o revisá num_ctx.`
        );
      }

      return {
        text: payload.response,
        promptTokens: payload.prompt_eval_count ?? 0,
        completionTokens: payload.eval_count ?? 0,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Ollama no respondió en ${this.config.requestTimeoutMs} ms para el modelo ${this.config.model}.`
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface ModelCheck {
  model: string;
  present: boolean;
  contextTokens: number | null;
  ok: boolean;
  detail: string;
}

/**
 * Comprobación previa del servidor y de cada modelo, antes de empezar un lote de
 * centenares de llamadas.
 *
 * Verifica tres cosas: que el servidor responde, que el modelo está descargado y
 * que su ventana de contexto alcanza. La tercera es la que importa y la que
 * motivó escribir esto: Ollama recorta un prompt que no entra **en silencio**,
 * sin error y sin aviso, y el modelo responde sobre evidencia truncada. El
 * resultado es un falso negativo indistinguible de un fallo de detección, que
 * contaminaría el recall sin dejar rastro.
 *
 * La ventana se consulta al servidor en lugar de mantenerse en una tabla acá,
 * porque una tabla de ventanas por modelo envejece y se equivoca en silencio,
 * que es el mismo fallo que esta función existe para evitar.
 */
export async function checkOllama(
  baseUrl: string,
  models: string[],
  minContextTokens: number
): Promise<{ ok: boolean; detail: string; checks: ModelCheck[]; available: string[] }> {
  let available: string[];
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      return { ok: false, detail: `${baseUrl} respondió ${response.status}`, checks: [], available: [] };
    }
    const payload = (await response.json()) as { models?: { name: string }[] };
    available = (payload.models ?? []).map((entry) => entry.name);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `no se pudo contactar ${baseUrl}: ${detail}`, checks: [], available: [] };
  }

  const checks: ModelCheck[] = [];

  for (const model of models) {
    // Ollama acepta "qwen2.5:7b" y lista "qwen2.5:7b", pero un modelo bajado sin
    // etiqueta queda como "nombre:latest".
    const present =
      available.includes(model) || available.includes(`${model}:latest`) || available.includes(model.split(':')[0] ?? model);

    if (!present) {
      checks.push({
        model,
        present: false,
        contextTokens: null,
        ok: false,
        detail: `sin descargar. Corré: ollama pull ${model}`,
      });
      continue;
    }

    let contextTokens: number | null = null;
    try {
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { model_info?: Record<string, unknown> };
        const info = payload.model_info ?? {};
        // La clave lleva el prefijo de la arquitectura: "llama.context_length",
        // "qwen2.context_length". Se busca por sufijo para no depender de ella.
        for (const [key, value] of Object.entries(info)) {
          if (key.endsWith('.context_length') && typeof value === 'number') {
            contextTokens = value;
            break;
          }
        }
      }
    } catch {
      contextTokens = null;
    }

    if (contextTokens === null) {
      checks.push({
        model,
        present: true,
        contextTokens: null,
        ok: false,
        detail:
          'el servidor no reportó su ventana de contexto. Verificala a mano antes de medir: ' +
          `el prompt más grande del benchmark necesita ${minContextTokens} tokens.`,
      });
      continue;
    }

    const ok = contextTokens >= minContextTokens;
    checks.push({
      model,
      present: true,
      contextTokens,
      ok,
      detail: ok
        ? `ventana de ${contextTokens} tokens`
        : `ventana de ${contextTokens} tokens, insuficiente: se necesitan ${minContextTokens}. ` +
          'Ollama recortaría el prompt en silencio y el resultado sería un falso negativo. ' +
          'Reemplazá este modelo en analysis.config.json.',
    });
  }

  const bad = checks.filter((check) => !check.ok);
  return {
    ok: bad.length === 0,
    detail:
      bad.length === 0
        ? `${checks.length} modelos listos en ${baseUrl}`
        : `${bad.length} de ${checks.length} modelos no sirven: ${bad.map((c) => c.model).join(', ')}`,
    checks,
    available,
  };
}
