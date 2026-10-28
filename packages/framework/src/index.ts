/**
 * Única superficie pública del framework.
 *
 * Nada de lo que vive acá conoce el benchmark: la captura recibe una URL y un
 * escenario. Ver docs/arquitectura.md.
 */
export { captureTrace, DEFAULT_SETTLE_MS, DEFAULT_READY_TIMEOUT_MS } from './capture';
export { normalize, eventLine, axLine, prepareAx } from './normalize';
export type { IdentityMode, NormalizeOptions, NormalizedStep } from './normalize';
export { diffTraces, diffLines } from './align';
export type { LineDiff, StepDiff, TraceDiff } from './align';
export { INSTRUMENT } from './instrument';
export type {
  AxNode,
  CaptureOptions,
  ElementRef,
  Scenario,
  Step,
  StepAction,
  StepRecord,
  Trace,
  TraceEnvironment,
  TraceEvent,
} from './types';
