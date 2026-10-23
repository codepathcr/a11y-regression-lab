# Arquitectura

## Principio que ordena todo lo demás

El alcance aprobado compromete **dos aportes distintos**: un framework
experimental reutilizable y un benchmark controlado. El repositorio los separa
en paquetes para que esa distinción sea visible y verificable, y no una promesa
del documento.

```
packages/framework   el aporte reutilizable
packages/ui          primitivas accesibles compartidas
packages/benchmark   el aporte de datos: apps, pares y harness
```

La dependencia va en **una sola dirección**:

```
benchmark  ──►  framework
    │
    └────────►  ui
```

El framework no importa nada del benchmark. Recibe una URL y un escenario de
interacción, y devuelve una traza. Si alguien quisiera aplicarlo a su propia
aplicación React, instala el framework y escribe su escenario: no necesita las
diez apps del estudio. Esa frontera es un requisito del alcance aprobado
("el framework debe ser capaz de acomodarse a cualquier app"), y por eso se
verifica estructuralmente y no por buena voluntad.

## La tubería

```
  escenario de interacción
          │
          ▼
  ┌───────────────┐   ┌───────────────┐
  │ versión base  │   │ versión       │
  │               │   │ modificada    │
  └───────┬───────┘   └───────┬───────┘
          │                   │
          ▼                   ▼
      captura             captura        Playwright + CDP
          │                   │
          ▼                   ▼
    normalización       normalización    reglas declaradas
          │                   │
          └─────────┬─────────┘
                    ▼
               alineación           ¿hay diferencia observable?
                    │                        │
                    │                        └──► mutation score
                    ▼
            estrategia de análisis
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  validador     modelo sobre   modelo sobre
  estático      la modificada  el par de trazas
      │             │             │
      └─────────────┼─────────────┘
                    ▼
       regresión · categoría · transición · evidencia
```

### Dónde se calcula cada métrica

El **mutation score** sale del paso de alineación, sin intervención de ningún
modelo: mide la proporción de mutantes que producen *alguna* diferencia
observable en la traza normalizada. Responde si la evidencia lleva la señal.

El **recall por estrategia** sale de las respuestas de los modelos: mide si el
modelo aprovecha la evidencia disponible.

Los dos juntos descomponen el problema. Un mutation score alto con recall bajo
señala al modelo o al prompt; un mutation score bajo señala el **techo del
método**, porque el defecto simplemente no aparece en la traza y ningún modelo
puede inferirlo. Esa segunda lectura es un resultado del estudio, no un fallo.

## Entorno de medición

Toda medición corre dentro del contenedor definido en el `Dockerfile`, nunca en
el sistema anfitrión. El motivo es metodológico y no de comodidad.

El **piso de ruido** —cuántos eventos difieren entre dos ejecuciones idénticas
de la misma versión— es una propiedad del entorno: depende del navegador, del
sistema operativo y de la carga de la máquina. Donde se mida el ruido, ahí vale
la conclusión. Si el entorno fuera "la computadora de uno de los
investigadores", la cifra sería irreproducible y la sección 3.9 quedaría sin
respaldo.

Al definirlo como una imagen versionada, el entorno pasa a ser un artefacto del
estudio que se publica junto con los datos crudos. La versión de la imagen base
de Playwright y la versión del paquete `playwright` deben coincidir siempre.

## Cómo se sirve el harness

Dos caminos, deliberadamente separados:

| Camino | Para qué | Por qué no el otro |
| --- | --- | --- |
| Servidor de desarrollo (`harness`) | Construir y editar fixtures | Inyecta su cliente en la página; esa actividad aparece en la traza sin pertenecer a la aplicación |
| Build estático (`build` + `serve`) | **Toda medición** | Requiere rehacer el build al cambiar un fixture |

Un solo `vite build` produce el harness completo con las diez apps en carga
diferida. No son diez builds.

## Modelo de la traza

Las categorías de evento registradas corresponden a la evidencia comprometida
en el alcance aprobado:

| Categoría | Criterio WCAG que sostiene |
| --- | --- |
| Acción ejecutada | contexto de todas |
| Eventos de teclado | 2.1.1 Keyboard |
| Secuencia de foco | 2.4.3 Focus Order |
| Altas y bajas de nodos interactivos | 3.2.1 On Focus |
| Cambios en atributos ARIA, rol y tabindex | 3.2.2 On Input |
| Anuncios de regiones live | 4.1.3 Status Messages |
| Árbol de accesibilidad por paso | verificación de todas |

### Identidad de los elementos

Cada evento registra el elemento afectado por **dos vías a la vez**: su ruta
estructural en el DOM, y su rol más su nombre accesible.

La comparación usa la vía **semántica**, y la decisión la tomó la medición de la
fase 4: en el control negativo de `a01-landing` —una refactorización que no
altera la accesibilidad— la identidad estructural produjo 50% de divergencia
falsa, porque un contenedor de maquetación desplaza la ruta de todo lo que
envuelve. La identidad semántica produjo 0,0%. Ver
[bitacora-mediciones.md](bitacora-mediciones.md).

Se capturan las dos porque la decisión debía tomarse con datos y no por
anticipado, y porque capturar de más evita volver a medir. El script de medición
sigue reportando las tres variantes de identidad.

### Verificación del instrumento

El observador de mutaciones es la parte de la captura que puede fallar **en
silencio**: si no se instala, la traza sigue teniendo foco y teclado y pierde
anuncios, cambios ARIA y altas y bajas de nodos. Toda comparación daría entonces
cero diferencias, y ese cero se interpretaría como un límite del método en lugar
de como un defecto del instrumento. Ocurrió, y está documentado en la bitácora.

Por eso el capturador ejecuta una verificación **activa** antes de cada
escenario: provoca un cambio de atributo observable y exige verlo en la cola de
eventos, abortando con un mensaje explícito si no aparece.

### Marcas de tiempo

La traza **no lleva marcas de tiempo**. El tiempo absoluto es la mayor fuente de
variación entre ejecuciones y no aporta nada a la comparación diferencial; el
orden de los eventos dentro de cada paso es la única dimensión temporal que se
conserva. La latencia se mide aparte, como métrica de eficiencia.

El árbol de accesibilidad se captura en cada paso pero **se envía al modelo solo
en los pasos donde la alineación encontró diferencias**. Es una poda necesaria:
sin ella, un caso de una app grande puede superar los cuarenta mil tokens de
evidencia, y el estudio ejecuta miles de llamadas. La decisión queda declarada
acá y en la sección 3.6 del documento.

## Capa de proveedores de modelos

Los modelos se consumen detrás de una interfaz única. La primera implementación
es local sobre Ollama, de costo nulo y reproducible sin depender de un servicio
externo. Agregar un proveedor de pago es escribir una clase que implemente la
misma interfaz, sin tocar nada de lo construido.

La estrategia de análisis es también reemplazable. Las tres del alcance
aprobado son implementaciones de una misma interfaz, y una cuarta variante
—con herramientas que el modelo pueda invocar sobre la traza— cabe sin
rediseñar nada. Eso la deja disponible como extensión o como trabajo futuro,
según alcance el tiempo.
