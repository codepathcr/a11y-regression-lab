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

## Licencia y destino

El prototipo será donado a la Universidad CENFOTEC y podrá usarse con fines
académicos, conforme a la propuesta aprobada el 27 de agosto de 2026.
