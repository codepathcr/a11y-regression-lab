import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OllamaProvider } from './providers/ollama';
import type { OllamaOptions } from './providers/ollama';
import type { EvidenceFormat, Provider } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = join(HERE, '..', 'analysis.config.json');

/** Sobreescritura del endpoint sin tocar la configuración versionada. */
const URL_OVERRIDE = 'A11Y_OLLAMA_URL';
/** Restringe la corrida a una lista de ids de modelo, separados por comas. */
const MODELS_OVERRIDE = 'A11Y_MODELS';

interface ProviderSpec {
  kind: string;
  baseUrl: string;
  requestTimeoutMs: number;
  /** Cuánto mantiene el servidor el modelo residente entre peticiones. */
  keepAlive: string;
  options: OllamaOptions;
}

interface ModelSpec {
  id: string;
  provider: string;
  model: string;
  label: string;
}

export interface AnalysisConfig {
  providers: Record<string, ProviderSpec>;
  /** Ventana de contexto mínima exigida a cualquier modelo. Es un requisito del
   *  benchmark y no una preferencia: la estrategia estática no tiene base y por
   *  tanto no puede podar la evidencia. */
  minContextTokens: number;
  /**
   * Razón declarada entre caracteres y tokens, para proyectar el tamaño de un
   * prompt ANTES de enviarlo. Se calibra con `token-probe` contra el servidor
   * real; el valor por omisión es conservador.
   */
  charsPerToken: number;
  /** Tokens que se reservan para la respuesta al comprobar si un prompt entra. */
  responseReserveTokens: number;
  models: ModelSpec[];
  evidenceFormat: EvidenceFormat;
  repetitions: { full: number; subsample: number; subsampleSize: number };
}

export async function loadConfig(): Promise<AnalysisConfig> {
  const config = JSON.parse(await readFile(CONFIG, 'utf8')) as AnalysisConfig;

  const override = process.env[URL_OVERRIDE];
  if (override) {
    for (const spec of Object.values(config.providers)) {
      if (spec.kind === 'ollama') spec.baseUrl = override.replace(/\/+$/, '');
    }
  }

  const only = process.env[MODELS_OVERRIDE];
  if (only) {
    const wanted = new Set(only.split(',').map((entry) => entry.trim()).filter(Boolean));
    const filtered = config.models.filter((model) => wanted.has(model.id));
    const missing = [...wanted].filter((id) => !config.models.some((model) => model.id === id));
    if (missing.length > 0) {
      throw new Error(
        `${MODELS_OVERRIDE} nombra modelos que no están en la configuración: ${missing.join(', ')}`
      );
    }
    config.models = filtered;
  }

  return config;
}

/**
 * Construye los proveedores declarados.
 *
 * Es el único lugar que conoce las familias de proveedor. Agregar una API de
 * pago es un caso más en este `switch` y un archivo en `providers/`: nada del
 * ejecutor, de las plantillas ni de las métricas cambia.
 */
export function buildProviders(config: AnalysisConfig): Provider[] {
  return config.models.map((model) => {
    const spec = config.providers[model.provider];
    if (!spec) {
      throw new Error(`El modelo ${model.id} declara el proveedor ${model.provider}, que no existe.`);
    }
    switch (spec.kind) {
      case 'ollama':
        return new OllamaProvider({
          id: model.id,
          label: model.label,
          model: model.model,
          baseUrl: spec.baseUrl,
          requestTimeoutMs: spec.requestTimeoutMs,
          keepAlive: spec.keepAlive,
          options: spec.options,
        });
      default:
        throw new Error(`Familia de proveedor no implementada: ${spec.kind}`);
    }
  });
}

/** Nombres de modelo tal como los sirve Ollama, para la comprobación previa. */
export function ollamaModelNames(config: AnalysisConfig): string[] {
  return config.models
    .filter((model) => config.providers[model.provider]?.kind === 'ollama')
    .map((model) => model.model);
}
