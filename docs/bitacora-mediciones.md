# Bitácora de mediciones

Registro de cada corrida de medición, sus resultados y las decisiones que
produjo. Existe para que las cifras del documento puedan rastrearse hasta la
corrida que las generó.

---

## Fase 4 — piso de ruido y señal · `a01-landing` · 2026-10-22

**Entorno:** contenedor de desarrollo, Chromium headless. **No es el entorno de
medición definitivo**; estas cifras validan la tubería, no son resultados del
estudio. El piso de ruido es una propiedad del entorno y debe recalcularse en la
imagen definitiva antes de citarlo.

**Configuración:** escenario provisional de 9 pasos, 3 repeticiones de la base,
período de quietud 150 ms, traza de 26 eventos y ~95 nodos de árbol por paso.

### Piso de ruido — base contra base

| Identidad | mínimo | mediana | máximo |
| --- | --- | --- | --- |
| structural | 0,0% | 0,0% | 0,0% |
| semantic | 0,0% | 0,0% | 0,0% |
| both | 0,0% | 0,0% | 0,0% |

Tres repeticiones de la misma versión producen trazas **idénticas**. La captura
es determinista para una app pequeña con un escenario sin esperas asíncronas.
Queda pendiente repetir la medición sobre una app del estrato grande: es ahí
donde el ruido puede aparecer, y una app de una pantalla da un cero
tranquilizador que no dice nada sobre el caso difícil.

### Señal — base contra cada variante

| Variante | Esperado | structural | semantic | both | Pasos con diferencia |
| --- | --- | --- | --- | --- | --- |
| `m01-kbd-activation` | regresión | 10,2% | 6,1% | 10,2% | 3, 4 |
| `m02-status-silent` | regresión | 2,0% | 2,0% | 2,0% | 8 |
| `m03-neutral-refactor` | limpio | 50,0% | **0,0%** | 50,0% | — |

### Decisión: identificar elementos por rol y nombre accesible

El control negativo es una refactorización que **no altera la accesibilidad en
absoluto**: extrae la validación a una función pura y envuelve los campos en un
contenedor de maquetación. Ese contenedor desplaza la ruta en el DOM de todo lo
que envuelve.

Con identidad estructural produce **50% de divergencia falsa**. Con identidad
semántica produce **0,0%**. La decisión la toma el dato: `semantic` pasa a ser el
valor por omisión de la normalización. Es además lo que percibe una persona
usando tecnología asistiva.

El script de medición sigue reportando las tres identidades para que la decisión
quede a la vista y pueda revisarse al incorporar más apps.

### Observación: la magnitud de la divergencia no sirve como detector

`m02-status-silent` produce **2,0%** de divergencia: una línea de cincuenta. Un
detector por umbral no distinguiría eso de ruido en una app con más actividad.
Lo que separa los casos no es cuánto difieren las trazas sino **si difieren y
dónde**. Sostiene el diseño del estudio: una compuerta booleana determinista
decide si hay algo que mirar, y el modelo de lenguaje interpreta qué significa.

---

## Defectos encontrados y corregidos en esta fase

### 1. El observador de mutaciones nunca se instalaba (silencioso)

El instrumento llamaba `observer.observe(document.documentElement, …)`. El script
corre mediante `addInitScript`, es decir **antes de cualquier código de la
página**, cuando `document.readyState` vale `"loading"` y
`document.documentElement` todavía es `null`. Observar `null` lanza
`parameter 1 is not of type 'Node'`, lo que abortaba el resto del script.

Los escuchadores de foco y teclado ya estaban registrados, de modo que la
captura seguía produciendo trazas verosímiles a las que les faltaba **todo** lo
que depende de mutaciones: anuncios de regiones live, cambios de atributos ARIA
y altas y bajas de nodos.

Consecuencia si no se hubiera detectado: `m02-status-silent` daba 0,0% de
divergencia y se habría concluido que el modelo de traza tiene un punto ciego
para el criterio 4.1.3. **Un hallazgo metodológico falso.**

Corrección: observar `document`, que existe siempre. Y dos guardas para que un
fallo así no vuelva a ser silencioso:

- el instrumento publica `__A11Y_READY` y `__A11Y_ERROR`;
- el capturador ejecuta una **verificación activa** antes de cada escenario:
  provoca un cambio de atributo observable, exige verlo en la cola de eventos, y
  aborta con un mensaje explícito si no aparece. La verificación se retira y la
  cola se vacía, de modo que no deja rastro en la traza.

### 2. Los valores de atributo no se normalizaban

`eventLine` limpiaba rutas y nombres pero no los valores de `from` y `to` de un
`aria-change`. Un atributo como `aria-describedby` contiene identificadores
generados por `useId` de React (`:r3:-error`), y el contador de React se
desplaza si una versión monta un componente más que la otra.

Dentro de una misma versión esos identificadores son deterministas, así que el
piso de ruido no lo delataba. Entre base y mutante sí podía producir diferencias
falsas. Corregido: los valores pasan por la misma limpieza.

---

## Pendiente

- Recalcular el piso de ruido en el entorno de medición definitivo.
- Medir el piso de ruido sobre una app del estrato grande, que es donde la
  compuerta de viabilidad realmente se cruza o no.
- `m01-kbd-activation` se manifiesta en **dos** transiciones (pasos 3 y 4), no en
  una: en la base el clic mueve el foco al botón, de modo que al enfocar el
  campo siguiente hay un `blur` que en el mutante no existe. La rúbrica del
  Instrumento 4 debe decidir si el modelo acierta nombrando cualquiera de las dos
  o si debe nombrar la primera.
