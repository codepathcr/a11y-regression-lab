export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  specs: string[];
  shipping: string;
}

export const CATEGORIES = [
  { id: 'todas', label: 'Todas las categorías' },
  { id: 'audio', label: 'Audio' },
  { id: 'teclados', label: 'Teclados' },
  { id: 'monitores', label: 'Monitores' },
];

const CATALOG: Product[] = [
  {
    id: 'p01', name: 'Audífonos de diadema XR-200', category: 'audio', price: 89,
    description: 'Audífonos cerrados con cancelación pasiva y cable desmontable.',
    specs: ['Impedancia 32 ohmios', 'Respuesta 20 Hz – 20 kHz', 'Cable de 1,5 m'],
    shipping: 'Envío en 2 a 4 días hábiles.',
  },
  {
    id: 'p02', name: 'Micrófono de condensador MC-7', category: 'audio', price: 134,
    description: 'Micrófono cardioide con soporte antivibración incluido.',
    specs: ['Patrón cardioide', 'Conexión USB-C', 'Trípode incluido'],
    shipping: 'Envío en 3 a 5 días hábiles.',
  },
  {
    id: 'p03', name: 'Teclado mecánico TK-84', category: 'teclados', price: 112,
    description: 'Teclado compacto de 84 teclas con interruptores táctiles.',
    specs: ['84 teclas', 'Interruptores táctiles', 'Retroiluminación blanca'],
    shipping: 'Envío en 2 a 4 días hábiles.',
  },
  {
    id: 'p04', name: 'Teclado ergonómico dividido ED-2', category: 'teclados', price: 198,
    description: 'Teclado partido con inclinación regulable para cada mano.',
    specs: ['Dos módulos', 'Inclinación 0 a 30 grados', 'Reasignable por capas'],
    shipping: 'Envío en 5 a 7 días hábiles.',
  },
  {
    id: 'p05', name: 'Monitor 27 pulgadas QHD', category: 'monitores', price: 289,
    description: 'Panel IPS de 27 pulgadas con base de altura regulable.',
    specs: ['2560 x 1440', 'IPS, 75 Hz', 'Altura regulable 11 cm'],
    shipping: 'Envío en 4 a 6 días hábiles.',
  },
  {
    id: 'p06', name: 'Monitor portátil 15 pulgadas', category: 'monitores', price: 176,
    description: 'Segunda pantalla alimentada por un solo cable USB-C.',
    specs: ['1920 x 1080', 'Alimentación por USB-C', 'Funda rígida incluida'],
    shipping: 'Envío en 2 a 4 días hábiles.',
  },
];

/**
 * Retardo de la carga simulada.
 *
 * Es **fijo y declarado**, no aleatorio, y la distinción importa para la
 * medición. La variable del estudio es la regresión de accesibilidad, no la
 * variabilidad de la red: un retardo aleatorio metería en la traza una fuente
 * de ruido irreproducible que no pertenece al fenómeno que se investiga.
 *
 * Un retardo fijo igual introduce asincronía real —orden de efectos, renders en
 * dos fases, carreras entre el foco y la llegada de datos—, que es la fuente
 * genuina de indeterminismo en una aplicación React. Si el piso de ruido sube
 * con este retardo, lo que se midió es indeterminismo de ordenamiento, que sí
 * es parte del fenómeno.
 */
export const FETCH_DELAY_MS = 180;

export function fetchProducts(category: string): Promise<Product[]> {
  const result = category === 'todas' ? CATALOG : CATALOG.filter((p) => p.category === category);
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), FETCH_DELAY_MS);
  });
}
