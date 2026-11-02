/**
 * Utilidades HTTP compartidas por los proveedores de API.
 *
 * Existen para que `openai.ts` y `anthropic.ts` no dupliquen tres cosas que
 * conviene hacer una sola vez y bien: el tope de tiempo, el reintento de fallos
 * transitorios y, sobre todo, que una clave de API nunca aparezca en un mensaje
 * de error ni en el registro de una corrida de integración continua.
 */

export interface PostJsonOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  /** Tope por intento. */
  timeoutMs: number;
  /** Reintentos ante 429, 5xx y errores de red. Por omisión 2. */
  retries?: number;
  /** Nombre legible del servicio, para los mensajes de error. */
  label: string;
  /** Valores que no deben aparecer en ningún mensaje (claves de API). */
  secrets?: string[];
}

/** Reemplaza cada secreto por `***`. Ignora valores vacíos o demasiado cortos
 *  para ser una clave, que reemplazarían texto legítimo. */
export function redact(text: string, secrets: string[] = []): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length >= 8) out = out.split(secret).join('***');
  }
  return out;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST con cuerpo JSON y respuesta JSON.
 *
 * Reintenta con espera exponencial (1 s, 2 s) los fallos que suelen ser
 * transitorios. Un 4xx distinto de 408 y 429 (clave inválida, modelo
 * inexistente, solicitud mal formada) no se reintenta: repetirlo solo demora el
 * aviso. Si el servidor indica `retry-after` en segundos, se respeta hasta 30 s.
 */
export async function postJson(options: PostJsonOptions): Promise<unknown> {
  const retries = options.retries ?? 2;
  const secrets = options.secrets ?? [];
  let lastError: Error = new Error(`${options.label}: sin intentos`);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    let waitMs = 1000 * 2 ** attempt;

    try {
      const response = await fetch(options.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...options.headers },
        body: JSON.stringify(options.body),
        signal: controller.signal,
      });

      if (response.ok) return (await response.json()) as unknown;

      const detail = redact((await response.text().catch(() => '')).slice(0, 400), secrets);
      lastError = new Error(`${options.label} respondió ${response.status}. ${detail}`.trim());

      if (!RETRYABLE.has(response.status)) throw lastError;

      const retryAfter = Number(response.headers.get('retry-after'));
      if (Number.isFinite(retryAfter) && retryAfter > 0) waitMs = Math.min(retryAfter * 1000, 30_000);
    } catch (error) {
      if (error === lastError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`${options.label} no respondió en ${options.timeoutMs} ms.`);
      } else {
        lastError = new Error(redact(error instanceof Error ? error.message : String(error), secrets));
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) await sleep(waitMs);
  }

  throw lastError;
}
