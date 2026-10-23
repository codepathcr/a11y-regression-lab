# @a11y-lab/framework

El aporte reutilizable del estudio: captura, normalización, alineación y
comparación diferencial de trazas de interacción accesible, y el análisis de
esas trazas asistido por modelos de lenguaje.

## Frontera

Este paquete **no conoce el benchmark**. Recibe una URL y un escenario de
interacción; devuelve una traza. No importa nada de `@a11y-lab/benchmark` ni de
`@a11y-lab/ui`, y esa restricción es deliberada: es lo que permite aplicarlo a
cualquier aplicación React, que es un requisito del alcance aprobado.

Si algún día este paquete necesita saber qué es un "fixture" o un "operador de
mutación", la frontera se rompió y hay que revisar el diseño.

## Responsabilidades

| Módulo | Qué hace |
| --- | --- |
| `capture` | Ejecuta un escenario sobre una URL con Playwright y el protocolo de depuración de Chromium, y registra los eventos de accesibilidad y el árbol por paso |
| `normalize` | Aplica las reglas declaradas que eliminan variación sin significado |
| `align` | Alinea dos trazas y localiza las transiciones donde difieren |
| `strategies` | Las estrategias de análisis, detrás de una interfaz común |
| `providers` | Los proveedores de modelos de lenguaje, detrás de una interfaz común |
| `report` | La salida: regresión, categoría, transición afectada y evidencia |

## Estado

Fase 0: el paquete existe con su frontera definida y sin implementación. Las
fases 3, 6 y 7 lo completan.
