export interface Tramite {
  id: string;
  name: string;
  area: string;
  days: string;
  cost: string;
  requirements: string[];
}

const CATALOG: Tramite[] = [
  { id: 'tr1', name: 'Permiso de construcción menor', area: 'Obras', days: '10 días hábiles', cost: '45 000 colones',
    requirements: ['Planos firmados por profesional responsable', 'Copia del plano catastrado', 'Impuestos municipales al día'] },
  { id: 'tr2', name: 'Patente comercial nueva', area: 'Tributos', days: '15 días hábiles', cost: '30 000 colones',
    requirements: ['Personería jurídica vigente', 'Uso de suelo aprobado', 'Póliza de riesgos del trabajo'] },
  { id: 'tr3', name: 'Uso de suelo', area: 'Urbanismo', days: '5 días hábiles', cost: '12 000 colones',
    requirements: ['Plano catastrado', 'Identificación de la persona solicitante'] },
  { id: 'tr4', name: 'Recolección de residuos no tradicionales', area: 'Ambiente', days: '3 días hábiles', cost: 'Sin costo',
    requirements: ['Dirección exacta del inmueble', 'Descripción del material'] },
  { id: 'tr5', name: 'Exoneración de bienes inmuebles', area: 'Tributos', days: '20 días hábiles', cost: 'Sin costo',
    requirements: ['Declaración jurada', 'Constancia de ingresos', 'Copia del plano catastrado'] },
];

export const MINE = [
  { id: 'ex1', name: 'Uso de suelo', filed: '14 de octubre', state: 'en revisión' },
  { id: 'ex2', name: 'Patente comercial nueva', filed: '2 de octubre', state: 'prevención' },
  { id: 'ex3', name: 'Recolección de residuos no tradicionales', filed: '28 de setiembre', state: 'resuelto' },
];

/**
 * Retardo de la consulta simulada. Fijo y declarado, por el mismo motivo que en
 * a09-tienda: la variable del estudio es la regresión de accesibilidad, no la
 * variabilidad de la red. Un retardo fijo igual introduce asincronía real.
 */
export const QUERY_DELAY_MS = 200;

export function searchTramites(query: string): Promise<Tramite[]> {
  const needle = query.trim().toLowerCase();
  const result =
    needle.length === 0
      ? CATALOG
      : CATALOG.filter(
          (t) =>
            t.name.toLowerCase().includes(needle) ||
            t.area.toLowerCase().includes(needle)
        );
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), QUERY_DELAY_MS);
  });
}
