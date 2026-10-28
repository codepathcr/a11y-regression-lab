import { STRATEGY_LABELS } from '@a11y-lab/analysis';
import type { AppVerdict, PrCheckResult } from './pr-core';
import type { Affected } from './pr-core';

/**
 * Reporte del flujo de Pull Requests, en Markdown.
 *
 * Está escrito para que lo lea una persona que revisa un cambio y no para que
 * lo lea quien construyó el método: el caso sin hallazgos ocupa una línea, el
 * caso con hallazgo pone adelante la transición y la categoría, y la evidencia
 * queda plegada para quien quiera verificarla. Un comentario automático que
 * obliga a leer veinte líneas para enterarse de que no pasa nada se ignora a la
 * tercera vez.
 */

const GUION = '·';

function porcentaje(value: number): string {
  return `${(value * 100).toFixed(1)} %`;
}

function pasos(steps: number[]): string {
  if (steps.length === 0) return 'ninguno';
  if (steps.length === 1) return `paso ${steps[0]}`;
  return `pasos ${steps.join(', ')}`;
}

function lineaDeApp(verdict: AppVerdict): string {
  switch (verdict.status) {
    case 'nueva':
      return `| \`${verdict.app}\` | Nueva | No existe en la versión base, no hay con qué comparar | |`;
    case 'eliminada':
      return `| \`${verdict.app}\` | Eliminada | Desapareció en esta versión | |`;
    case 'escenario-cambiado':
      return `| \`${verdict.app}\` | **No comparable** | El cambio alteró el recorrido: ${verdict.detail} | |`;
    case 'sin-divergencia':
      return `| \`${verdict.app}\` | Sin cambios observables | Las dos trazas coinciden en los ${verdict.steps} pasos | |`;
    case 'error':
      return `| \`${verdict.app}\` | Error de medición | ${verdict.detail} | |`;
    case 'divergente': {
      if (verdict.error !== undefined) {
        return `| \`${verdict.app}\` | Evidencia sin veredicto | ${pasos(verdict.changedSteps)} con diferencias; el modelo falló: ${verdict.error} | |`;
      }
      if (verdict.verdict === undefined) {
        return `| \`${verdict.app}\` | Diferencias observadas | ${pasos(verdict.changedSteps)}; sin veredicto de modelo en esta ejecución | |`;
      }
      if (!verdict.verdict.regression) {
        return `| \`${verdict.app}\` | Sin regresión | ${pasos(verdict.changedSteps)} con diferencias, interpretadas como cambio inocuo | |`;
      }
      const transicion = verdict.verdict.transitionStep === null ? 'sin localizar' : `paso ${verdict.verdict.transitionStep}`;
      const categoria = verdict.verdict.category ?? 'sin categoría';
      return `| \`${verdict.app}\` | **Regresión** | ${transicion} | ${categoria} |`;
    }
  }
}

function detalleDeApp(verdict: AppVerdict): string[] {
  if (verdict.status !== 'divergente') return [];
  const lineas: string[] = [];
  lineas.push('<details>');
  const titulo =
    verdict.verdict?.regression === true
      ? `Evidencia de <code>${verdict.app}</code>`
      : `Diferencias observadas en <code>${verdict.app}</code>`;
  lineas.push(`<summary>${titulo}</summary>`);
  lineas.push('');
  if (verdict.verdict?.evidence !== undefined && verdict.verdict.evidence !== '') {
    lineas.push(`**Lo que observó el modelo.** ${verdict.verdict.evidence}`);
    lineas.push('');
  }
  lineas.push(
    `Divergencia de eventos ${porcentaje(verdict.eventDivergence)} ${GUION} ` +
      `de árbol de accesibilidad ${porcentaje(verdict.axDivergence)} ${GUION} ` +
      `${pasos(verdict.changedSteps)}`
  );
  lineas.push('');
  lineas.push(
    'La magnitud de la divergencia no es un criterio de decisión y no debe usarse ' +
      'como umbral: depende de la versión del navegador y se infla en cascada cuando ' +
      'el defecto ocurre temprano. Se muestra para situar el cambio, no para juzgarlo.'
  );
  if (verdict.issues !== undefined && verdict.issues.length > 0) {
    lineas.push('');
    lineas.push(`Observaciones sobre el formato de la respuesta: ${verdict.issues.join('; ')}.`);
  }
  lineas.push('');
  lineas.push('```json');
  lineas.push(verdict.evidence.text.length > 6000 ? `${verdict.evidence.text.slice(0, 6000)}\n… evidencia recortada para el comentario` : verdict.evidence.text);
  lineas.push('```');
  lineas.push('</details>');
  return lineas;
}

export function renderReport(result: PrCheckResult, affected: Affected): string {
  const regresiones = result.verdicts.filter(
    (v) => v.status === 'divergente' && v.verdict?.regression === true
  ).length;
  const noComparables = result.verdicts.filter((v) => v.status === 'escenario-cambiado').length;
  const errores = result.verdicts.filter((v) => v.status === 'error').length;

  const lineas: string[] = [];

  if (result.verdicts.length === 0) {
    lineas.push('### Accesibilidad dinámica: sin aplicaciones afectadas');
    lineas.push('');
    lineas.push('Ningún archivo del cambio pertenece a una aplicación del benchmark.');
    return lineas.join('\n');
  }

  if (regresiones > 0) {
    lineas.push(`### Accesibilidad dinámica: ${regresiones === 1 ? 'una regresión' : `${regresiones} regresiones`}`);
  } else if (noComparables > 0 || errores > 0) {
    lineas.push('### Accesibilidad dinámica: revisión incompleta');
  } else {
    lineas.push('### Accesibilidad dinámica: sin regresiones');
  }
  lineas.push('');

  if (affected.frameworkTouched) {
    lineas.push(
      '> El cambio toca el framework de captura. Lo que cambió es el instrumento de ' +
        'medición y no la aplicación, de modo que una diferencia de trazas acá no es ' +
        'una regresión del producto. Interpretar con ese cuidado.'
    );
    lineas.push('');
  }
  if (affected.uiTouched) {
    lineas.push(
      '> El cambio toca la biblioteca de componentes, que es base común de todas las ' +
        'aplicaciones, de modo que la comprobación se extendió a todas.'
    );
    lineas.push('');
  }

  lineas.push('| Aplicación | Veredicto | Transición | Categoría |');
  lineas.push('| --- | --- | --- | --- |');
  for (const verdict of result.verdicts) lineas.push(lineaDeApp(verdict));
  lineas.push('');

  for (const verdict of result.verdicts) {
    const detalle = detalleDeApp(verdict);
    if (detalle.length > 0) {
      lineas.push(...detalle);
      lineas.push('');
    }
  }

  const modelos = [...new Set(result.verdicts.flatMap((v) => (v.status === 'divergente' && v.model !== undefined ? [v.model] : [])))];
  const pie: string[] = [
    `Comparación \`${result.base}\` contra \`${result.head}\``,
    `estrategia ${STRATEGY_LABELS[result.strategy] ?? result.strategy}`,
  ];
  if (modelos.length > 0) pie.push(`modelo ${modelos.join(', ')}`);
  if (result.browserVersion !== undefined) pie.push(`Chromium ${result.browserVersion}`);
  lineas.push(`<sub>${pie.join(` ${GUION} `)}</sub>`);

  return lineas.join('\n');
}

/** Código de salida: 1 solo cuando hay una regresión o la revisión no se pudo
 *  completar. Un cambio con diferencias que el modelo juzga inocuas no rompe el
 *  pipeline, porque el método no es un oráculo y bloquear por eso lo volvería
 *  inservible en la práctica. */
export function exitCode(result: PrCheckResult): number {
  const hayRegresion = result.verdicts.some(
    (v) => v.status === 'divergente' && v.verdict?.regression === true
  );
  const incompleta = result.verdicts.some(
    (v) => v.status === 'escenario-cambiado' || v.status === 'error'
  );
  return hayRegresion || incompleta ? 1 : 0;
}
