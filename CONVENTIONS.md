# Convenciones del repositorio

Estas reglas no son preferencias de estilo: cada una responde a un requisito del
estudio. Donde no sea obvio, se indica el motivo.

## Idioma

- **Identificadores en inglés** (`captureTrace`, `focusOrder`, `mutationScore`).
  Es la convención del ecosistema y evita mezclas como `capturarTrace`.
- **Comentarios y documentación en español**, porque el documento de tesis está
  en español y el código debe poder leerse junto a él.
- Los nombres de dominio del estudio conservan el término del documento:
  `baseVersion`, `mutantVersion`, `trace`, `operator`, `groundTruth`.

## TypeScript

- `strict` activado en los tres paquetes. **Prohibido `any`**; cuando el tipo
  es genuinamente desconocido se usa `unknown` y se estrecha.
- El modelo de la traza es una unión discriminada por `kind`. Todo `switch`
  sobre ella debe ser exhaustivo: `noFallthroughCasesInSwitch` y la ausencia de
  `default` hacen que el compilador marque los lugares a actualizar cuando se
  agregue una categoría de evento.
- Sin `export default` salvo en componentes de fixture, donde el harness los
  carga de forma diferida y lo necesita.
- Un `index.ts` por paquete como única superficie pública. Nada se importa
  cruzando la frontera de un paquete por ruta interna.

## Accesibilidad del código de prueba

Las apps del benchmark son el instrumento de medición: si la versión base no es
accesible, el par no sirve, porque no se puede medir una regresión contra una
referencia ya rota.

- **Elementos semánticos reales.** Nunca un `div` con `onClick`: si es un botón,
  es un `<button>`.
- Todo control debe ser operable por teclado sin atributos adicionales. Un
  `tabindex` positivo es un error, no una solución.
- `aria-*` solo cuando el HTML nativo no alcanza. ARIA mal puesto es peor que
  ausente.
- **Cada versión base debe pasar axe-core sin hallazgos** antes de entrar al
  benchmark. Es un criterio de construcción, no una aspiración.
- La versión mutante difiere de la base **únicamente** en lo que define el
  operador aplicado. Cualquier otra diferencia invalida el par.

## Componentes

- Un componente por archivo, en `PascalCase.tsx`, con el nombre del archivo
  igual al del componente. El resto de los módulos en `kebab-case.ts`.
- Componentes puros; los efectos viven en hooks con nombre propio.
- Atómicos y reutilizables. No es solo higiene: una regresión introducida en
  una primitiva compartida y manifestada en varias pantallas es el escenario que
  justifica el enfoque diferencial, y solo existe si hay reutilización real.
- Props tipadas de forma explícita, sin `React.FC`.

## Parámetros

- **Ningún número mágico en el código.** Todo valor que afecte la medición
  —período de quietud, número de repeticiones, reglas de normalización, qué
  eventos se registran— vive en configuración y se vuelca al registro de cada
  corrida.
- Si un valor influye en un resultado del documento, tiene que poder citarse
  desde la bitácora de ejecución sin leer el código fuente.

## Fronteras entre paquetes

- `framework` no importa nada de `benchmark` ni de `ui`. Recibe una URL y un
  escenario; devuelve una traza. Esa frontera es lo que lo hace reutilizable
  para cualquier aplicación React, que es un requisito del alcance aprobado.
- `ui` no conoce las apps que lo consumen.
- `benchmark` puede importar de ambos.

## Git

- Mensajes de commit en formato convencional: `feat:`, `fix:`, `docs:`,
  `refactor:`, `chore:`.
- `pnpm-lock.yaml` **se versiona**: la reproducibilidad de la imagen depende de
  él.
- Nada de `node_modules`, `dist` ni `out` en el repositorio.
