export { CATEGORIES, CATEGORY_CRITERIA, resolveCategory } from './categories';
export type { Category } from './categories';
export { STRATEGIES, STRATEGY_LABELS } from './types';
export type {
  Completion,
  CompletionResult,
  EvidenceFormat,
  ParsedVerdict,
  Provider,
  Strategy,
  Verdict,
} from './types';
export { parseVerdict } from './parse';
export { scoreVerdict } from './score';
export type { GroundTruth, Score } from './score';
export { buildEvidence } from './evidence';
export type { Evidence, EvidenceInput } from './evidence';
export { SYSTEM_PROMPT, buildPrompt } from './prompts';
export type { PromptInput } from './prompts';
export { OllamaProvider, checkOllama } from './providers/ollama';
export type { ModelCheck, OllamaConfig, OllamaOptions } from './providers/ollama';
export { ScriptedProvider } from './providers/scripted';
export { loadConfig, buildProviders, ollamaModelNames } from './config';
export type { AnalysisConfig } from './config';
