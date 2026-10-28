import { parseVerdict } from '../src/parse';
import { resolveCategory } from '../src/categories';
import { ScriptedProvider } from '../src/providers/scripted';

/**
 * Comprobación del contrato de salida contra las formas en que los modelos
 * responden de verdad.
 *
 * Corre sin red y sin modelo. Existe porque las rutas de error del parser
 * aparecen de forma esporádica con un modelo real y no se pueden provocar a
 * voluntad: descubrirlas a mitad de una corrida de novecientas inferencias
 * significa repetirla.
 */

interface Case {
  name: string;
  raw: string;
  expect: {
    regression: boolean | null;
    category: string | null;
    step: number | null;
    issues: number | 'alguno';
  };
}

const FOCO = 'orden y continuidad del foco';
const TECLADO = 'operación mediante teclado';

const CASES: Case[] = [
  {
    name: 'JSON limpio',
    raw: `{"regression": true, "category": "${FOCO}", "transitionStep": 9, "evidence": "falta el foco"}`,
    expect: { regression: true, category: FOCO, step: 9, issues: 0 },
  },
  {
    name: 'valla de código',
    raw: '```json\n{"regression": false, "category": null, "transitionStep": null, "evidence": "sin cambios"}\n```',
    expect: { regression: false, category: null, step: null, issues: 'alguno' },
  },
  {
    name: 'prosa antes y después',
    raw: `Analicé las trazas. {"regression": true, "category": "${TECLADO}", "transitionStep": 18, "evidence": "Enter no activa"} Espero que ayude.`,
    expect: { regression: true, category: TECLADO, step: 18, issues: 'alguno' },
  },
  {
    name: 'sin tildes y en mayúsculas',
    raw: '{"regression": true, "category": "Operacion Mediante Teclado", "transitionStep": 3, "evidence": "x"}',
    expect: { regression: true, category: TECLADO, step: 3, issues: 0 },
  },
  {
    name: 'categoría dentro de una frase',
    raw: `{"regression": true, "category": "Se trata de ${FOCO} segun 2.4.3", "transitionStep": 4, "evidence": "x"}`,
    expect: { regression: true, category: FOCO, step: 4, issues: 0 },
  },
  {
    name: 'categoría inventada en inglés',
    raw: '{"regression": true, "category": "focus order", "transitionStep": 4, "evidence": "x"}',
    expect: { regression: true, category: null, step: 4, issues: 'alguno' },
  },
  {
    name: 'afirma regresión sin categoría',
    raw: '{"regression": true, "transitionStep": 7, "evidence": "algo cambió"}',
    expect: { regression: true, category: null, step: 7, issues: 'alguno' },
  },
  {
    name: 'booleano en español',
    raw: `{"regression": "sí", "category": "${FOCO}", "transitionStep": "paso 21", "evidence": "x"}`,
    expect: { regression: true, category: FOCO, step: 21, issues: 0 },
  },
  {
    name: 'niega pero completa categoría',
    raw: `{"regression": false, "category": "${FOCO}", "transitionStep": 5, "evidence": "ninguna"}`,
    expect: { regression: false, category: null, step: null, issues: 'alguno' },
  },
  {
    name: 'llaves dentro de la evidencia',
    raw: `{"regression": true, "category": "${FOCO}", "transitionStep": 2, "evidence": "falta focus {button} tras la baja"}`,
    expect: { regression: true, category: FOCO, step: 2, issues: 0 },
  },
  {
    name: 'prosa con llaves después del objeto',
    raw: `{"regression": true, "category": "${FOCO}", "transitionStep": 2, "evidence": "x"} Nota: revisar {paso 3}.`,
    expect: { regression: true, category: FOCO, step: 2, issues: 'alguno' },
  },
  {
    name: 'sin JSON',
    raw: 'No encuentro ninguna regresión de accesibilidad en esta comparación.',
    expect: { regression: null, category: null, step: null, issues: 'alguno' },
  },
  {
    name: 'JSON cortado',
    raw: '{"regression": true, "category": "orden y contin',
    expect: { regression: null, category: null, step: null, issues: 'alguno' },
  },
  {
    name: 'arreglo en lugar de objeto',
    raw: '[{"regression": true}]',
    expect: { regression: true, category: null, step: null, issues: 'alguno' },
  },
  {
    name: 'regression ausente',
    raw: '{"category": "orden y continuidad del foco", "transitionStep": 4}',
    expect: { regression: null, category: null, step: null, issues: 'alguno' },
  },
  {
    name: 'paso cero es válido',
    raw: `{"regression": true, "category": "${FOCO}", "transitionStep": 0, "evidence": "en el montaje"}`,
    expect: { regression: true, category: FOCO, step: 0, issues: 0 },
  },
];

let failed = 0;

for (const testCase of CASES) {
  const parsed = parseVerdict(testCase.raw);
  const got = {
    regression: parsed.verdict?.regression ?? null,
    category: parsed.verdict?.category ?? null,
    step: parsed.verdict?.transitionStep ?? null,
  };
  const want = testCase.expect;
  const issuesOk = want.issues === 'alguno' ? parsed.issues.length > 0 : parsed.issues.length === want.issues;
  const ok =
    got.regression === want.regression &&
    got.category === want.category &&
    got.step === want.step &&
    issuesOk;

  if (ok) {
    const note = parsed.issues.length > 0 ? `  · ${parsed.issues.join(' · ')}` : '';
    console.log(`  OK    ${testCase.name}${note}`);
  } else {
    failed += 1;
    console.log(`  FALLA ${testCase.name}`);
    console.log(`        esperado ${JSON.stringify(want)}`);
    console.log(`        obtenido ${JSON.stringify(got)} issues=${JSON.stringify(parsed.issues)}`);
  }
}

// El resolvedor no debe adivinar.
for (const value of ['', 'ninguna', 'foco', 'keyboard operation', 'otra cosa']) {
  const resolved = resolveCategory(value);
  if (resolved !== null) {
    failed += 1;
    console.log(`  FALLA resolveCategory(${JSON.stringify(value)}) devolvió ${resolved}`);
  }
}

// El proveedor de guion recorre en ciclo.
const scripted = new ScriptedProvider('guion', 'Guion', ['uno', 'dos']);
const seen: string[] = [];
for (let i = 0; i < 4; i += 1) {
  seen.push((await scripted.complete({ system: 's', user: 'u' })).text);
}
if (seen.join(',') !== 'uno,dos,uno,dos') {
  failed += 1;
  console.log(`  FALLA ciclo del proveedor de guion: ${seen.join(',')}`);
}

console.log('');
if (failed > 0) {
  console.error(`${failed} comprobaciones fallaron.`);
  process.exit(1);
}
console.log(`Contrato de salida verificado en ${CASES.length} formas de respuesta.`);
