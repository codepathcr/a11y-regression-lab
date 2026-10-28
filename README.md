# a11y-regression-lab

Framework experimental para detectar y localizar **regresiones dinámicas de
accesibilidad** en aplicaciones React, comparando trazas de interacción
equivalentes entre una versión base y una versión modificada, con asistencia de
modelos de lenguaje.

Es el entregable técnico del proyecto de graduación *Evaluación de un enfoque
diferencial asistido por inteligencia artificial para la detección de
regresiones dinámicas de accesibilidad en aplicaciones React mediante trazas de
interacción* (Maestría Profesional en Ingeniería del Software con énfasis en
Inteligencia Artificial Aplicada, Universidad CENFOTEC).

## El problema en una frase

Un Pull Request puede dejar un componente funcionando y, al mismo tiempo,
romper el orden del foco, la operación por teclado o el anuncio accesible de un
mensaje de estado. Los validadores basados en reglas examinan un estado del DOM
y no responden la pregunta operativa de una revisión de código: **¿este cambio
introdujo una regresión, y en qué transición apareció?**

## Cómo está organizado

| Ruta | Responsabilidad |
| --- | --- |
| `packages/framework` | El aporte reutilizable: captura, normalización, alineación y comparación diferencial de trazas, y el análisis asistido por modelos. No sabe nada del benchmark. |
| `packages/ui` | Primitivas atómicas accesibles con las que se construyen las apps del benchmark. |
| `packages/benchmark` | El aporte de datos: las aplicaciones de prueba, sus pares base-mutante y el harness que las sirve. |
| `analysis` | Análisis estadístico en Python de los datos crudos del experimento. |
| `docs` | Instrumentos del estudio: protocolo de mutación y rúbrica de clasificación. |

La dependencia va en una sola dirección: `benchmark` → `framework`. El
framework nunca importa nada del benchmark, y esa frontera es lo que lo hace
aplicable a cualquier aplicación React. Ver [docs/arquitectura.md](docs/arquitectura.md).

## Requisitos

- **Docker Desktop.** Toda medición corre dentro del contenedor, nunca en el
  sistema anfitrión. El motivo está en `docs/arquitectura.md`.
- Node 20.11 o superior y pnpm 9, únicamente si se quiere trabajar fuera del
  contenedor para editar fixtures.

## Instalación

```bash
git clone https://github.com/codepathcr/a11y-regression-lab.git
cd a11y-regression-lab
docker compose build
```

La construcción descarga la imagen de Playwright con Chromium y sus librerías
de sistema ya instaladas, y resuelve las dependencias del espacio de trabajo
dentro de la imagen.

## Uso

Abrir una terminal dentro del contenedor:

```bash
docker compose run --rm lab bash
```

Y dentro:

```bash
pnpm typecheck     # verificación de tipos de los tres paquetes
pnpm build         # build estático del harness del benchmark
```

### Una advertencia que conviene leer

El harness tiene dos formas de servirse y **no son intercambiables**:

- `pnpm --filter @a11y-lab/benchmark harness` levanta el servidor de desarrollo.
  Sirve para **construir** fixtures, nunca para medir: inyecta su propio
  cliente en la página y esa actividad aparece en la traza sin pertenecer a la
  aplicación.
- `pnpm build` seguido de `pnpm --filter @a11y-lab/benchmark serve` sirve el
  build estático. **Toda cifra que vaya al documento sale de acá.**

## El entorno de referencia

Las cifras del estudio se produjeron con **Chromium 130.0.6723.31**, que es el
que trae la imagen `mcr.microsoft.com/playwright:v1.48.2-jammy` fijada en el
`Dockerfile`. El valor está declarado en
`packages/benchmark/environment.json`, `measure` y `verify-gt` lo imprimen en su
encabezado, y **cualquier ejecución con otra versión aborta con código distinto
de cero**.

No es una formalidad. El árbol de accesibilidad lo computa el navegador, y dos
versiones de Chromium emiten distinta cantidad de nodos para el mismo DOM. Se
comprobó contra Chromium 141:

| | entre 130 y 141 |
|---|---|
| verdad de terreno de los 60 pares | idéntica |
| piso de ruido | idéntico, 0,0 % en las diez apps |
| divergencia de eventos | idéntica, los 42 valores al decimal |
| pasos con diferencia | idénticos, los 60 conjuntos |
| **magnitud de la divergencia de árbol** | **distinta en 3 de 10 apps** |

Es decir: la detección y la localización son propiedades del par base-mutante,
pero la magnitud no lo es. Un porcentaje de divergencia de árbol sin su versión
de navegador no es una cifra reproducible.

Para trabajar fuera del contenedor de referencia —construir fixtures, iterar
sobre una mutación, donde importa el signo de la divergencia y no su magnitud:

```bash
export A11Y_ALLOW_BROWSER_MISMATCH=1
```

Deja continuar y marca cada salida como no citable. No debe usarse para producir
ninguna cifra que vaya al documento.

## Licencia y destino

El prototipo será donado a la Universidad CENFOTEC y podrá usarse con fines
académicos, conforme a la propuesta aprobada el 27 de agosto de 2026.
