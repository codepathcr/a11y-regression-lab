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

## Fase 4 (compuerta real) — piso de ruido · `a09-tienda` · 2026-10-23

La corrida anterior midió el ruido sobre una app de una pantalla y
completamente sincrónica, sin carga de datos ni temporizadores. Ese 0% no decía
nada sobre el caso difícil. Esta corrida es la compuerta de verdad.

**App:** estrato grande, 20 pasos, las ocho primitivas, tres cargas asíncronas
simuladas con retardo **fijo** de 180 ms. Traza de **84 eventos** y ~100 nodos
de árbol por paso. 5 repeticiones, es decir 10 comparaciones por pares.

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

### Primera medición

| Identidad | mínimo | mediana | máximo |
| --- | --- | --- | --- |
| structural | 0,0% | 1,2% | 1,2% |
| semantic | 0,0% | 1,2% | 1,2% |
| both | 0,0% | 1,2% | 1,2% |

**El ruido dejó de ser cero.** Tres de cada cuatro corridas daban trazas
idénticas y el resto difería en una o dos líneas.

### Causa, localizada

Una sola, y siempre la misma: la **posición** de un `keyup` respecto de las
respuestas de la página en el paso 5.

```
paso 5: press Enter *** DIFIERE
   - key up Enter on combobox"Filtrar por categoría"
   + key up Enter on combobox"Filtrar por categoría"
```

La línea es idéntica en texto y está presente en las dos corridas: lo único que
cambia es su lugar. El `keyup` llega al documento como macrotask, mientras los
eventos derivados del `MutationObserver` se vacían en microtasks. Cuál se
registra primero depende de milisegundos.

Ninguna otra categoría de evento osciló. Las tres cargas asíncronas, los
cambios de vista con movimiento de foco, la retención y devolución del foco del
diálogo modal y los seis anuncios de la región live fueron **perfectamente
estables** en las diez comparaciones.

### Decisión: el estímulo primero, las respuestas después

Los eventos de teclado son el **estímulo que inyecta el escenario**, no una
respuesta de la aplicación. Su posición relativa a las respuestas no describe
ningún comportamiento de la interfaz: el guion decide el estímulo y su orden es
conocido de antemano. El orden en que la página **reacciona** sí es
comportamiento, y se conserva intacto.

La normalización coloca entonces los eventos de teclado al inicio de su paso,
cada grupo en su orden observado. Es la opción `stableKeyOrder`, verdadera por
omisión; ponerla en falso devuelve el orden observado y permite volver a medir
el ruido que la regla elimina.

### Resultado tras la corrección

| App | Identidad | mínimo | mediana | máximo |
| --- | --- | --- | --- | --- |
| `a09-tienda` (84 eventos, 20 pasos) | las tres | 0,0% | 0,0% | 0,0% |
| `a01-landing` (26 eventos, 9 pasos) | las tres | 0,0% | 0,0% | 0,0% |

Y la señal de `a01-landing` se mantiene sin cambios: 6,1% y 2,0% en los dos
positivos, 0,0% en el control negativo con identidad semántica.

**La compuerta queda cruzada:** con un piso de ruido de cero sobre una traza de
84 eventos que incluye asincronía, cambios de vista y un diálogo modal, la
comparación diferencial tiene margen para que cualquier diferencia observada sea
atribuible al cambio y no al entorno.

### Regla de diseño de escenarios que esto deja

`data-harness-ready` señala el **montaje**, no la llegada de datos. Un escenario
sobre una app que carga de forma asíncrona debe esperar esas cargas de forma
explícita —acá, pasos `settle` de 400 ms contra un retardo de 180 ms— o la
atribución de eventos a cada paso queda a merced de una carrera.

---

## Fase 5 — los seis operadores, una instancia de referencia de cada uno · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

Objetivo: comprobar que cada operador del protocolo produce una diferencia
observable, que ninguna variante mutante es detectable por axe-core, y que el
control negativo sigue en cero.

### Resultado

| Operador | App | Variante | structural | semantic | Pasos con diferencia |
| --- | --- | --- | --- | --- | --- |
| CTO (Ma11y) | a01 | `m04-cto-tab-order` | 21,2% | 21,2% | 3, 4, 5 |
| CCB (Ma11y) | a01 | `m05-ccb-context-on-blur` | 11,1% | 11,1% | 8, 10 |
| CCS (Ma11y) | a09 | `m01-ccs-context-on-selection` | 19,5% | 27,3% | 5, 6, 7, 8, 12, 13, 19 |
| Activación por teclado | a01 | `m01-kbd-activation` | 7,7% | 4,6% | 5, 6 |
| Pérdida de foco | a09 | `m02-focus-loss-view-change` | 3,7% | 3,7% | 8, 9, 13, 14 |
| Anuncio de estado | a01 | `m02-status-silent` | 1,5% | 1,5% | 10 |
| **Control negativo** | a01 | `m03-neutral-refactor` | 38,2% | **0,0%** | — |

Piso de ruido 0,0% en las dos apps. axe-core limpio en las diez variantes.

**Mutation score 6 de 6, cero falsos positivos.**

Las magnitudes van de 1,5% a 27,3%: un orden de magnitud entre defectos
igualmente reales. Vuelve a confirmar que la magnitud de la divergencia no sirve
como detector y que lo que separa los casos es si difieren y dónde.

### Hallazgo 1: una operacionalización inválida, detectada por el chequeo de axe

La primera versión de CTO usaba `tabindex` positivo para invertir el orden de
tabulación. axe-core la reportó como violación de gravedad seria: *"Elements
should not have tabindex greater than zero"*.

El caso era inválido: un validador estático ya lo resuelve, de modo que
incluirlo habría inflado el desempeño del validador en la comparación del OE5 y
el par no probaría lo que el estudio afirma probar. Se re-operacionalizó con
`tabindex="-1"` sobre un enlace, que es marcado válido, no lo reporta axe, y sí
cambia la secuencia de foco.

Es la primera vez que el criterio de admisión "invisible al análisis estático"
rechaza un caso, y lo hizo una herramienta y no una revisión manual.

### Hallazgo 2: una tercera razón de no detección

Con el escenario original de `a01-landing` —dos pulsaciones de Tab— CTO daba
**0,0%**. El enlace mutado es la tercera parada del recorrido por teclado: el
escenario nunca llegaba al defecto.

No es un límite de la evidencia ni del modelo: es **cobertura del escenario**.
Extendido el recorrido a cuatro pulsaciones, el mismo mutante pasó a 21,2%.

Consecuencia para el documento: el mutation score, definido como la proporción
de mutantes con alguna diferencia observable, mide **conjuntamente** la
adecuación de la evidencia y la cobertura del escenario. Acota el método tal
como está configurado, no el método en principio. Separar las dos causas exige
variar el escenario sobre el mismo mutante.

Y convierte el diseño de los escenarios de interacción en una decisión
metodológica con consecuencias medibles, no en un trámite.

### Hallazgo 3: una regresión puede volver el escenario inejecutable

El mutante CCS navega a otra vista al seleccionar una categoría, de modo que los
pasos siguientes del escenario no encuentran sus elementos. La captura se caía
con una excepción y se perdía el caso entero.

Corregido: un paso que falla se registra con una clasificación determinista
—`elemento no disponible` o `accion no ejecutable`— y la captura continúa. Esa
clasificación entra en la comparación como una línea más, porque que una versión
pueda ejecutar el escenario y la otra no es una diferencia de comportamiento, y
de las más fuertes. El mensaje crudo del navegador se guarda aparte y queda
fuera del modelo comparable, porque incluye tiempos y texto variable.

Se agregó además un plazo máximo breve por acción, de 2 segundos. El valor por
omisión de Playwright es de 30, y con un escenario roto todos los pasos
restantes lo agotarían: un solo caso costaría varios minutos y el benchmark
completo sería impracticable.

### Nota de diseño que esto obligó

El manejo del foco al cambiar de vista vivía en la composición de `a09-tienda`,
que por diseño es idéntica en todas las variantes y por tanto no es mutable. Se
movió a una parte intercambiable, `ViewHeading`. La regla general: **todo
comportamiento que un operador deba poder mutar tiene que vivir en una parte, no
en el armado de la app.**

---

## Fase 8 (parcial) — tercera app y reubicación de operadores · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

### Reubicación

`a01-landing` tenía cinco pares y su cuota como app del estrato pequeño es tres.
El exceso venía de la fase 5, que necesitaba una instancia de referencia de cada
operador y usó `a01` como anfitrión cómodo para cuatro de los seis.

Dos operadores se reubicaron, y el criterio fue el anfitrión más adecuado y no
el acomodo de la cuota:

| Operador | De | A | Por qué |
| --- | --- | --- | --- |
| CTO | `a01-landing` (navegación de tres enlaces) | `a02-piscina` (rejilla de horarios) | Una rejilla de controles equivalentes es donde la continuidad del recorrido es justamente lo que la hace usable |
| CCB | `a01-landing` (formulario de contacto) | `a09-tienda` (diálogo de pago) | Dentro de un modal el foco está retenido, de modo que un cambio de contexto es más severo. Y `a09` necesita completar su cuota |

Cada operador gana así un segundo anfitrión distinto, que es requisito del
protocolo: con uno solo, el resultado del operador y el comportamiento de ese
componente son indistinguibles.

### Estado del benchmark

| App | Estrato | Pares | Meta | Pasos |
| --- | --- | --- | --- | --- |
| `a01-landing` | pequeña | 3 (2 pos, 1 neg) | 3 | 11 |
| `a02-piscina` | pequeña | 3 (2 pos, 1 neg) | 3 | 9 |
| `a09-tienda` | grande | 3 (3 pos, 0 neg) | 10 | 21 |
| | | **9 de 60** | | |

Tres apps de diez. Faltan dos pequeñas, cuatro medianas y una grande.

### Medición

Piso de ruido **0,0%** en las tres apps, en las tres identidades. axe-core
limpio en las trece variantes.

| App | Variante | Esperado | structural | semantic | Pasos |
| --- | --- | --- | --- | --- | --- |
| a01 | `m01-kbd-activation` | regresión | 7,7% | 4,6% | 5, 6 |
| a01 | `m02-status-silent` | regresión | 1,5% | 1,5% | 10 |
| a01 | `m03-neutral-refactor` | limpio | 38,2% | **0,0%** | — |
| a02 | `m01-cto-slot-tab-order` | regresión | 25,9% | 25,9% | 3, 4, 5 |
| a02 | `m02-focus-loss-confirmation` | regresión | 3,8% | 3,8% | 8 |
| a02 | `m03-neutral-refactor` | limpio | 48,1% | **0,0%** | — |
| a09 | `m01-ccs-context-on-selection` | regresión | 19,0% | 26,6% | 5, 6, 7, 8, 12, 13, 20 |
| a09 | `m02-focus-loss-view-change` | regresión | 3,6% | 3,6% | 8, 9, 13, 14 |
| a09 | `m03-ccb-context-on-blur` | regresión | 0,6% | 0,6% | 16 |

**Mutation score 7 de 7 positivos. Cero falsos positivos en los dos controles
negativos.**

Los dos controles negativos vuelven a dar casi 40% y 48% con identidad
estructural y cero con identidad semántica. Dos apps independientes, el mismo
resultado: la decisión de normalización se sostiene.

### Hallazgo: el umbral de sensibilidad del método

`m03-ccb-context-on-blur` produce **0,6%**: una línea de unas ciento setenta.

La causa es del navegador, no del instrumento: **el siguiente destino del foco
se resuelve antes de ejecutar el manejador de `blur`**, de modo que un cambio de
contexto disparado por blur no puede alterar el movimiento de foco que lo
provocó. Los controles insertados quedan además en una posición a la que la
tabulación hacia adelante ya no vuelve. El rastro se reduce al alta del nodo.

Se intentaron dos ajustes antes de aceptar la cifra: insertar el bloque debajo
del campo en lugar de encima —cambio adoptado, porque revelar campos
dependientes debajo es el caso realista— y agregar una tabulación después del
blur. Ninguno aumentó la señal, por la razón de arriba. La verdad de terreno se
corrigió para no prometer una evidencia que no se observa, en lugar de torcer el
escenario hasta producirla.

**Consecuencia para el documento.** Este caso es detectable únicamente porque el
piso de ruido es exactamente cero. Con un piso de apenas un punto porcentual
sería indistinguible del ruido. Es a la vez la justificación retrospectiva del
trabajo de normalización y una limitación que hay que declarar: la sensibilidad
del enfoque diferencial está acotada por su piso de ruido, y hay regresiones
reales cuyo rastro es de una sola línea.

---

## Fase 8 (parcial) — las cuatro bases del estrato medio · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

Se construyeron **solo las versiones base** de las cuatro apps medianas, con sus
escenarios. Las 28 mutaciones van por separado: una base con un defecto propio
contamina los siete pares que cuelgan de ella, de modo que conviene verificarla
antes de construir sobre ella.

| App | Patrones que ejercita | Eventos | Nodos de árbol | Pasos |
| --- | --- | --- | --- | --- |
| `a03-panel` | Tabla ordenable con `aria-sort`, filtro por combo, anuncio del nuevo orden | 41 | 1.782 | 12 |
| `a04-multipaso` | Tres pasos con foco al encabezado, retroceso, dos validaciones | 66 | 606 | 11 |
| `a05-blog` | Búsqueda al enviar, paginación con `aria-current`, foco a los resultados | 53 | 834 | 12 |
| `a06-equipo` | Menú de rol por fila con foco itinerante, diálogo modal de invitación | 45 | 1.015 | 14 |

### Resultado

Piso de ruido **0,0%** en las cuatro, en las tres identidades, con cinco
repeticiones cada una —diez comparaciones por pares—. axe-core limpio en las
diecisiete variantes del benchmark.

La regla de normalización del orden del teclado, decidida con `a09-tienda`, se
sostiene en cuatro apps nuevas con patrones distintos y sin ningún ajuste
adicional. `a04-multipaso` es la prueba más exigente de las medianas: 66 eventos
sobre tres cambios de paso, un retroceso y dos errores de validación.

### Decisión de diseño que vale registrar

En `a05-blog` la búsqueda se dispara **al enviar el formulario y no en cada
tecla**. Es una decisión de accesibilidad y no de comodidad: filtrar mientras se
escribe cambia el contenido bajo el cursor sin que la persona lo haya pedido, y
obliga a elegir entre anunciar en cada pulsación —insoportable— o no anunciar
nada. La versión base del benchmark tiene que ser ejemplar, no corriente.

### Estado del benchmark

| Estrato | Apps | Pares construidos | Pares objetivo |
| --- | --- | --- | --- |
| Pequeñas | 2 de 4 | 6 | 12 |
| Medianas | **4 de 4** | 0 | 28 |
| Grandes | 1 de 2 | 3 | 20 |
| | **7 de 10** | **9 de 60** | |

---

## Fase 8 (parcial) — las diez bases completas · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

Las diez apps del benchmark tienen su versión base y su escenario. Las
mutaciones van por separado, app por app.

| App | Estrato | Patrones que ejercita | Eventos | Pasos |
| --- | --- | --- | --- | --- |
| `a01-landing` | pequeña | FAQ plegable, formulario con validación anunciada | 34 | 11 |
| `a02-piscina` | pequeña | Rejilla de horarios, confirmación con foco | 27 | 9 |
| `a07-perfil` | pequeña | Pestañas con activación manual, casillas nativas | 31 | 12 |
| `a08-contacto` | pequeña | Combo que agrega un campo al formulario | 40 | 11 |
| `a03-panel` | mediana | Tabla ordenable con `aria-sort`, filtro | 39 | 12 |
| `a04-multipaso` | mediana | Tres pasos con foco al encabezado, retroceso | 66 | 11 |
| `a05-blog` | mediana | Búsqueda al enviar, paginación con foco | 53 | 12 |
| `a06-equipo` | mediana | Menú por fila, diálogo modal de invitación | 45 | 14 |
| `a09-tienda` | grande | Cuatro primitivas más, carrito, pago modal, asincronía | 83 | 21 |
| `a10-tramites` | grande | Cuatro vistas, pestañas con requisitos plegables, asincronía | 73 | 19 |

**Piso de ruido 0,0% en las diez**, en las tres identidades, con cinco
repeticiones cada una. axe-core limpio en las veinte variantes existentes.

### Cobertura de primitivas por anfitriones

| Primitiva | Anfitriones |
| --- | --- |
| Button | las diez |
| TextField | a01, a02, a04, a05, a06, a07, a08, a09, a10 |
| LiveRegion | las diez |
| Disclosure | a01, a02, a10 |
| Combobox | a03, a08, a09 |
| Tabs | a07, a09, a10 |
| Dialog | a06, a09, a10 |
| Menu | a06, a09, a10 |

Cada primitiva tiene al menos tres anfitriones distintos, que es lo que el
protocolo exige para que el resultado de un operador no se confunda con el
comportamiento de un componente en particular.

### Corrección: la primitiva `Combobox` anunciaba en cada tecla

Tenía una región live con el recuento de resultados, que se actualizaba a cada
pulsación mientras la persona escribía. Es mala práctica: insoportable de
escuchar e interrumpe la propia escritura.

Un retardo lo habría evitado, pero habría introducido un temporizador justo en
el camino que la traza mide, y con él indeterminismo ajeno al fenómeno
estudiado. La corrección fue retirar la región live: el recuento queda como
texto visible para quien ve la pantalla, la navegación de la lista la comunica
`aria-activedescendant` opción por opción como prevé el patrón de ARIA, y el
anuncio del resultado corresponde al momento de seleccionar, que es lo que ya
hacen las aplicaciones que consumen el componente.

Efecto en la medición: dos eventos menos por traza en `a03-panel` y
`a09-tienda`, sin cambio en el piso de ruido ni en las señales de los mutantes
de `a09` (18,7% · 3,7% · 0,6%).

### Estado del benchmark

| Estrato | Apps | Pares construidos | Pares objetivo |
| --- | --- | --- | --- |
| Pequeñas | **4 de 4** | 6 | 12 |
| Medianas | **4 de 4** | 0 | 28 |
| Grandes | **2 de 2** | 3 | 20 |
| | **10 de 10** | **9 de 60** | |

---

## Fase 8 — primeras dos medianas: `a03-panel` y `a04-multipaso` · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

Catorce pares nuevos: diez positivos y cuatro controles negativos. Piso de ruido
0,0% en las dos apps. axe-core limpio en las dieciséis variantes.

### Cambio estructural: el anuncio pasa a ser una parte

La región live vivía en la composición de cada app, que por diseño es idéntica
en todas las variantes y por tanto **no es mutable**. Sin moverla, el operador de
eliminación del anuncio accesible no tenía anfitrión. Se extrajo a una parte
`Announcer`, aplicando la regla que dejó la fase 5: *todo comportamiento que un
operador deba poder mutar tiene que vivir en una parte, no en el armado*.

### `a03-panel`

| Variante | Operador | Esperado | Eventos | Árbol | Pasos (eventos) |
| --- | --- | --- | --- | --- | --- |
| `m01-kbd-activation-mouse-only` | propio, 2.1.1 | regresión | 2,5% | 7,8% | 3, 5 |
| `m02-cto-tab-order` | CTO, 2.4.3 | regresión | 17,5% | 17,5% | 4, 5, 6 |
| `m03-focus-loss-remount` | propio, 2.4.3 | regresión | 31,9% | 2,2% | 3, 4, 5, 6, 7, 11 |
| `m04-ccs-focus-steal` | CCS, 3.2.2 | regresión | 8,2% | 0,1% | 10, 11 |
| `m05-status-silent` | propio, 4.1.3 | regresión | 6,5% | 0,7% | 3, 5, 6, 10, 11 |
| `m06-neutral-table-refactor` | control | limpio | **0,0%** | **0,0%** | — |
| `m07-neutral-summary-refactor` | control | limpio | **0,0%** | **0,0%** | — |

`m03` merece una nota: la causa es una `key` de React que depende del
ordenamiento, de modo que la fila de encabezados se desmonta y se vuelve a
montar en cada ordenamiento y el foco cae al cuerpo del documento. Es el defecto
de React más común de esta familia y de los más difíciles de ver leyendo un
diff: la `key` cambia en una línea y la consecuencia aparece interacciones
después. Es el tercer anfitrión del operador y el único cuya causa no es un
efecto eliminado.

### `a04-multipaso`

| Variante | Operador | Esperado | Eventos | Árbol | Pasos (eventos) |
| --- | --- | --- | --- | --- | --- |
| `m01-focus-loss-step-change` | propio, 2.4.3 | regresión | 18,1% | 1,3% | 5, 6, 7, 10–13 |
| `m02-kbd-activation-mouse-only` | propio, 2.1.1 | regresión | 67,9% | 24,9% | 5–13 |
| `m03-ccb-advance-on-blur` | CCB, 3.2.1 | regresión | 59,1% | 20,1% | 4–13 |
| `m04-cto-back-tab-order` | CTO, 2.4.3 | regresión | 44,9% | 15,7% | 8–13 |
| `m05-status-silent` | propio, 4.1.3 | regresión | 4,0% | 1,9% | 1, 5, 10–13 |
| `m06-neutral-indicator-refactor` | control | limpio | **0,0%** | **0,0%** | — |
| `m07-neutral-nav-refactor` | control | limpio | **0,0%** | **0,0%** | — |

Las magnitudes son mucho mayores que en `a03` porque un formulario por pasos
amplifica cualquier defecto: si el avance falla, el resto del escenario ocurre en
un paso distinto del de la base y la divergencia se acumula. Es información útil
y a la vez una advertencia para el análisis: la divergencia de un par depende
tanto del defecto como de cuánto le queda de escenario por delante.

### Hallazgo 1: una operacionalización con un confound, corregida

La primera versión del operador de eliminación de activación mediante teclado
sustituía `onClick` por `onMouseDown`. Funcionaba, pero `mousedown` se dispara
**antes** que `click`: con el ratón el cambio de estado ocurría en otro punto de
la secuencia de eventos, y el mutante divergía también en pasos donde el
comportamiento de accesibilidad era idéntico. En `a04` divergía ya en el paso 1,
un clic de ratón sin ninguna falla.

Era una diferencia real pero ajena al defecto, y habría contaminado la métrica de
localización: el modelo podría señalar correctamente un paso que la verdad de
terreno no reconoce.

Corrección: se conserva `onClick` y se agrega un manejador de `keydown` que
llama a `preventDefault()` para Enter y Espacio, con lo que el navegador no
sintetiza el clic de esas teclas. El camino del ratón queda idéntico y la
divergencia aparece únicamente donde el escenario usa el teclado. En `a03` el
mutante pasó de divergir en `[3, 5, 6, 11]` a divergir en `[3, 5]`.

Es además el patrón real: alguien agrega un manejador de teclado para un atajo
propio y se come Enter sin notarlo.

### Hallazgo 2: la poda de evidencia estaba mal definida

La regla decía *enviar el árbol de accesibilidad al modelo solo en los pasos
donde la comparación encontró diferencias*, y **diferencias** significaba
diferencias de eventos. La medición de `a03` mostró el problema: el mutante
`m01` difiere en eventos en los pasos `[3, 5]` y en árbol en los pasos
`[3, 4, 5]`. El paso 4 no tiene ninguna diferencia de eventos y sí de contenido:
el ordenamiento que no ocurrió deja la tabla en otro orden. Con la regla
anterior, la evidencia de ese paso se habría descartado justo donde estaba.

Corrección en `align.ts`: la comparación distingue ahora `changedSteps` —el
flujo de eventos, es decir el comportamiento observable— de `axChangedSteps`
—el árbol, es decir el estado resultante—, y expone su unión como
`evidenceSteps`. La poda se calcula sobre la unión, y `hasDifferences` también,
porque la compuerta que decide si vale la pena invocar un modelo tiene que
considerar los cambios de contenido.

### Hallazgo 3: las dos vías de evidencia son complementarias

Los datos lo muestran sin ambigüedad:

| Mutante | Eventos | Árbol | Qué lleva la señal |
| --- | --- | --- | --- |
| `a03 m03-focus-loss-remount` | 31,9% | 2,2% | el flujo de eventos |
| `a03 m01-kbd-activation` | 2,5% | 7,8% | el árbol |
| `a03 m05-status-silent` | 6,5% | 0,7% en **todos** los pasos | el árbol, de forma constante |

`m05` es el caso más instructivo. Al perder `role="status"`, el árbol de la
versión mutante carece de ese nodo **desde el paso 0**, antes de cualquier
interacción. axe-core no lo reporta porque examina una versión sola; comparar
los dos árboles sí lo revela.

Eso sostiene por partida doble el alcance aprobado, que exige el árbol de
accesibilidad **y** la secuencia de eventos como evidencia: ninguna de las dos
basta por sí sola, y la segunda lectura es un argumento directo a favor del
enfoque diferencial frente al análisis estático de una sola versión.

### Estado del benchmark

| Estrato | Apps | Pares | Objetivo |
| --- | --- | --- | --- |
| Pequeñas | 4 de 4 | 6 | 12 |
| Medianas | 4 de 4 | **14** | 28 |
| Grandes | 2 de 2 | 3 | 20 |
| | 10 de 10 | **23 de 60** | |

---

## Fase 8 — medianas completas: `a05-blog` y `a06-equipo` · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

Catorce pares nuevos. Las cuatro apps del estrato medio quedan completas.
Piso de ruido 0,0% en las siete apps con mutantes. axe-core limpio en las
treinta variantes.

### `a05-blog`

| Variante | Operador | Esperado | Eventos | Árbol | Pasos (eventos) |
| --- | --- | --- | --- | --- | --- |
| `m01-status-silent-search` | propio, 4.1.3 | regresión | 0,8% | 1,1% | 13 |
| `m02-ccb-search-on-blur` | CCB, 3.2.1 | regresión | 15,6% | 3,3% | 2, 12, 13 |
| `m03-focus-loss-pagination` | propio, 2.4.3 | regresión | 12,0% | 1,0% | 8, 9, 10, 13 |
| `m04-cto-pagination` | CTO, 2.4.3 | regresión | 27,9% | 2,5% | 7, 8, 9, 10 |
| `m05-kbd-activation-pages` | propio, 2.1.1 | regresión | 21,3% | 2,3% | 8, 9 |
| `m06-neutral-list-refactor` | control | limpio | **0,0%** | **0,0%** | — |
| `m07-neutral-pagination-refactor` | control | limpio | **0,0%** | **0,0%** | — |

`m01` es valioso por una razón de diseño: esta app tiene **dos** regiones live
—el recuento de la búsqueda, en `SearchBar`, y el cambio de página, en
`Announcer`— y la mutación rompe solo la primera. Permite comprobar si el
detector localiza cuál de las dos se rompió, en lugar de limitarse a notar que
falta un anuncio.

### `a06-equipo`

| Variante | Operador | Esperado | Eventos | Árbol | Pasos (eventos) |
| --- | --- | --- | --- | --- | --- |
| `m01-focus-loss-row-removal` | propio, 2.4.3 | regresión | 3,8% | 0,3% | 7, 9 |
| `m02-cto-row-tab-order` | CTO, 2.4.3 | regresión | 19,3% | 6,5% | 6, 7, 9, 13 |
| `m03-kbd-activation-remove` | propio, 2.1.1 | regresión | 9,6% | 4,2% | 7, 9, 13 |
| `m04-ccb-send-on-blur` | CCB, 3.2.1 | regresión | 12,1% | 5,2% | 12, 13 |
| `m05-status-silent` | propio, 4.1.3 | regresión | 2,9% | 1,1% | 5, 7, 13 |
| `m06-neutral-table-refactor` | control | limpio | **0,0%** | **0,0%** | — |
| `m07-neutral-toolbar-refactor` | control | limpio | **0,0%** | **0,0%** | — |

`m04` es la operacionalización más grave de CCB en el benchmark: abandonar el
campo de correo **envía la invitación**. El cambio de contexto no solo
desorienta, ejecuta una acción irreversible que la persona no confirmó.

### Dos defectos en versiones base, corregidos

**`a06-equipo` perdía el foco al retirar una integrante.** La fila desaparecía
con el botón que tenía el foco y este caía al cuerpo del documento. Era un
defecto de accesibilidad en la propia versión base, es decir en la referencia
contra la que se mide. La base ahora mueve el foco de forma explícita al
encabezado de la sección, y la pérdida de foco pasó a ser el mutante `m01`.

**El escenario de `a06-equipo` no ejercitaba el menú.** Hacía `ArrowDown` sobre
un botón corriente, donde no hace nada, de modo que el menú nunca se abría y la
pulsación de Enter retiraba a alguien en lugar de cambiar un rol. Reescrito para
abrir el menú con el teclado, seleccionar un rol y recién entonces retirar.

Los dos se encontraron al diseñar las mutaciones, no al medir: construir el
mutante de un operador obliga a entender qué hace la base en ese punto, y ahí
salta lo que la base hace mal.

### Hallazgo: la fragmentación del texto contamina el árbol de accesibilidad

Un control negativo falló. `m07-neutral-toolbar-refactor` daba **3,0% de
divergencia de árbol** sin ningún cambio semántico:

```
base:       StaticText "3" + StaticText "integrantes"
refactor:   StaticText "3 integrantes"
```

La base renderiza `{members.length} integrantes`, que en React son **dos nodos
de texto**; la refactorización devuelve una sola cadena desde una función. El
nombre accesible del párrafo es idéntico y lo que una tecnología asistiva
anuncia es el mismo texto: lo único que cambia es la fragmentación interna.

Es el equivalente, para el árbol, del problema de la ruta estructural que la
fase 4 encontró para los eventos: una diferencia de representación que no
corresponde a ninguna diferencia perceptible.

**Dos reglas de normalización, en `prepareAx`:**

1. **Unir los nodos de texto contiguos del mismo nivel.** Lo que se anuncia es
   la concatenación, así que la concatenación es lo que debe compararse. Dos
   nodos de texto contiguos en el recorrido en orden de documento y con la misma
   profundidad son necesariamente hermanos: un cambio de padre obligaría a
   emitir antes un nodo de profundidad menor.

2. **Descartar los nodos `InlineTextBox`.** Son la representación de caja de
   línea del motor de maquetación, no semántica: duplican el contenido del
   `StaticText` que los contiene y dependen del ancho de la ventana y de la
   fuente. Un viewport distinto habría cambiado el árbol sin que cambiara nada
   de la accesibilidad. No llegó a producir ruido porque el viewport está fijo,
   pero era una fuente latente, y además duplicaba el tamaño de la evidencia que
   se entrega al modelo.

Tras la corrección los dos controles negativos de `a06` dan 0,0% en ambas vías,
y ningún positivo perdió señal. Un efecto secundario favorable: el caso más
débil del benchmark, `a09 m03-ccb-context-on-blur`, pasó de tener una sola línea
de evidencia de eventos a mostrar además diferencias de árbol en cuatro pasos.

**Lo encontró un control negativo, no una revisión del código.** Es el segundo
caso en el que un control negativo revela un problema de normalización que
ninguna mutación positiva habría mostrado, y la justificación de dedicarles un
tercio del benchmark.

### Estado del benchmark

| Estrato | Apps | Pares | Objetivo |
| --- | --- | --- | --- |
| Pequeñas | 4 de 4 | 6 | 12 |
| Medianas | **4 de 4** | **28** | 28 |
| Grandes | 2 de 2 | 3 | 20 |
| | 10 de 10 | **37 de 60** | |

---

## Fase 8 — `a10-tramites`, y un verificador del benchmark · 2026-10-25

**Entorno:** contenedor de desarrollo. Pendiente recalcular en el definitivo.

Diez pares nuevos: siete positivos y tres controles negativos. Piso de ruido
0,0%. axe-core limpio en las cuarenta variantes.

| Variante | Operador | Esperado | Eventos | Árbol | Pasos (eventos) |
| --- | --- | --- | --- | --- | --- |
| `m01-focus-loss-view-change` | propio, 2.4.3 | regresión | 4,5% | 0,3% | 11, 12, 17, 18, 22 |
| `m02-cto-nav-tab-order` | CTO, 2.4.3 | regresión | 8,8% | 0,3% | 4, 5, 6 |
| `m03-kbd-activation-detail` | propio, 2.1.1 | regresión | 57,5% | 27,4% | 11–22 |
| `m04-ccs-navigate-on-tab` | CCS, 3.2.2 | regresión | 32,4% | 10,0% | 11–17 |
| `m05-ccb-confirm-on-blur` | CCB, 3.2.1 | regresión | 5,6% | 2,0% | 20, 21 |
| `m06-status-silent` | propio, 4.1.3 | regresión | 1,3% | 1,7% | 9, 22 |
| `m07-status-no-busy` | propio, 4.1.3 | regresión | **1,3%** | **27,3%** | 8, 9 |
| `m08-neutral-table-refactor` | control | limpio | **0,0%** | **0,0%** | — |
| `m09-neutral-text-join` | control | limpio | **0,0%** | **0,0%** | — |
| `m10-neutral-detail-refactor` | control | limpio | **0,0%** | **0,0%** | — |

Tres casos merecen nota:

**`m04-ccs-navigate-on-tab`** es el único anfitrión de CCS que no es un combo.
Seleccionar la pestaña "Costos" navega a otra vista en lugar de mostrar su
panel. El patrón de pestañas promete que el resto de la página se queda quieto,
y romper esa promesa es de los cambios de contexto más desorientadores.

**`m05-ccb-confirm-on-blur`** abre un diálogo modal al abandonar un campo. No
ejecuta ninguna acción, pero **captura el contexto**: el foco queda retenido y el
resto de la página inerte, y salir exige descubrir que hay un diálogo y que
Escape lo cierra. Los pasos siguientes del escenario quedan inejecutables, y la
captura los registra como fallos clasificados en lugar de perder el caso.

**`m07-status-no-busy`** es el caso más desbalanceado del benchmark: **1,3% en
eventos y 27,3% en el árbol**. Retira `aria-busy` de la región de resultados, y
Chromium expone el subárbol de forma distinta durante la carga. Es el argumento
más fuerte a favor de exigir las dos vías de evidencia: un detector que mirara
solo el flujo de eventos tendría aquí una señal veinte veces más débil.

Interesa además porque las otras seis instancias del operador de eliminación de
anuncio retiran `role` y `aria-live` de un contenedor. Un detector podría estar
reconociendo ese patrón concreto en lugar del fenómeno; este mutante lo somete a
un mecanismo distinto.

### Hallazgo: la unión de nodos de texto insertaba un separador

El control negativo `m08` daba 0,4% de divergencia de árbol:

```
base:       StaticText "MUN-2026-0 1 12"
refactor:   StaticText "MUN-2026-0112"
```

La regla de unión de nodos de texto contiguos, introducida con `a06-equipo`,
concatenaba con un espacio de separación. Estaba mal, y el error era de orden:
recortaba cada fragmento **antes** de unirlos, perdiendo la información de si
había espacio entre ellos. En `{n} integrantes` el espacio viene dentro del
propio fragmento (`" integrantes"`); en `MUN-2026-0{x}12` no hay ninguno.

Corrección: concatenar en crudo y dejar la normalización del espacio en blanco
para la serialización de la línea.

**Es la tercera vez que un control negativo encuentra un defecto de
normalización** —primero la ruta estructural, después la fragmentación del
texto, ahora el separador de la unión— y ninguna mutación positiva habría
mostrado ninguno de los tres. Los positivos verifican que el método detecta; los
negativos verifican que no inventa. Son las dos mitades, y la segunda es la que
ha hecho el trabajo de encontrar errores.

### Verificador del benchmark

Se agregó `pnpm --filter @a11y-lab/benchmark verify-gt`, que recorre el
benchmark completo y comprueba tres cosas por app:

1. **Piso de ruido cero**: dos capturas de la base deben dar trazas idénticas en
   eventos y en árbol.
2. **Cada positivo produce evidencia observable.**
3. **Cada control negativo produce cero evidencia**, de eventos y de árbol.

Sale con código distinto de cero si algo falla, de modo que puede correr en
integración continua. Es la comprobación que evita que un cambio en la
normalización rompa en silencio pares ya validados: con 47 pares y creciendo,
revisar a ojo dejó de ser viable.

Resultado de la primera corrida completa: **verdad de terreno consistente en 47
pares.**

### Estado del benchmark

| Estrato | Apps | Pares | Objetivo |
| --- | --- | --- | --- |
| Pequeñas | 4 de 4 | 6 | 12 |
| Medianas | 4 de 4 | 28 | 28 |
| Grandes | 2 de 2 | **13** | 20 |
| | 10 de 10 | **47 de 60** | |

Faltan trece pares: los siete restantes de `a09-tienda` y los tres de cada una
de `a07-perfil` y `a08-contacto`.

---

## Defectos encontrados y corregidos en la fase 3

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

---

## Fase 8, cierre — los trece pares restantes y el benchmark completo

Se completaron `a09-tienda` (siete pares nuevos), `a07-perfil` y `a08-contacto`
(tres cada una). El benchmark queda en **sesenta pares: cuarenta y dos positivos
y dieciocho controles negativos**, el 30 % de la muestra.

### Un defecto en la base de `a09-tienda`, hallado al diseñar su mutante

El `CartView` de la versión base no movía el foco al retirar una línea del
carrito: la fila desaparecía con el botón que tenía el foco y este caía al cuerpo
del documento. Es el mismo defecto latente que se halló en `a06-equipo` en la
fase 7, y por la misma vía: al escribir el mutante del operador correspondiente,
no al medir. Se corrigió la base moviendo el foco de forma explícita al
encabezado de la sección.

Una base defectuosa no produce un par con menos señal: produce diez pares cuya
verdad de terreno es falsa, porque el defecto está en los dos lados de la
comparación y por tanto no aparece en la diferencia. El procedimiento que lo
encontró —escribir el mutante obliga a mirar el comportamiento que se va a
destruir— es la única barrera que ha funcionado contra esta clase de error, y
`axe-core` no ve ninguno de los dos casos.

### Un escenario provisional que no ejercitaba lo que decía ejercitar

El escenario de `a07-perfil`, escrito en la fase 4 y marcado como provisional,
estaba roto: los pasos 5 y 6 enviaban flechas y Enter cuando el foco estaba sobre
una casilla y no sobre la lista de pestañas, de modo que no hacían nada, y los
pasos 7 y 10 fallaban porque sus paneles nunca llegaban a abrirse. Las dos
pestañas que el escenario pretendía recorrer no se abrían nunca.

Se detectó con `inspect` comparando la base contra sí misma, antes de construir
un solo mutante. Es el argumento de procedimiento para la sección 3.6: **un
escenario se verifica contra la base antes de usarse como instrumento de
medición**, porque un escenario que no llega a donde cree llegar produce
cobertura cero sobre los operadores que dependen de ese tramo, y el resultado se
leería como un punto ciego del método.

### Cuarto defecto de normalización, otra vez hallado por un control negativo

El control negativo `m03-neutral-form-refactor` de `a08-contacto` divergió un
2,3 % en el paso 8. El par difería así:

```
- dom-add into form"Contanos qué pasó…Número de facturaEnviar mensaje" << div"Número de factura"
+ dom-add into div"Contanos qué pasó…Número de factura"              << div"Número de factura"
```

Dos defectos encadenados, los dos en la identidad de los elementos:

1. **`roleOf` daba rol a elementos que no generan nodo en el árbol de
   accesibilidad.** Su respaldo era el nombre de la etiqueta, de modo que un
   `div` de maquetación tenía rol `div` y por tanto identidad propia. Envolver
   unos campos en un contenedor para colgarle una clase de CSS cambiaba el padre
   del alta y hacía divergir el par.

2. **`nameOf` tomaba el `textContent` completo de cualquier elemento.** El nombre
   del `form` incluía todo el texto del formulario, así que *toda* alta dentro de
   un formulario era sensible a cualquier cambio de texto en otra parte del mismo
   formulario. Este era un falso positivo **latente en las diez apps** que ningún
   control negativo había provocado todavía.

La corrección no es un parche para el caso: es la regla que corresponde al
fenómeno. Un elemento que no genera nodo en el árbol no tiene identidad propia;
se identifica por el nodo que la tecnología asistiva sí percibe. De ahí dos
reglas complementarias, cada una en la dirección que corresponde a lo que el
evento afirma:

| | dirección | justificación |
|---|---|---|
| objeto de un evento, y contenedor de un alta o baja | al ancestro más cercano con rol | «se insertó algo en el formulario» es el hecho; en cuál `div` aterrizó, no |
| nodo dado de alta o de baja | al primer descendiente con rol | subir devolvería el contenedor y se perdería qué apareció |

Y para el nombre: el respaldo por contenido se aplica solo a los roles que toman
el nombre de su contenido. Un `form`, una `region` o una `list` no lo hacen: su
nombre viene de `aria-label`, `aria-labelledby`, `caption`, `legend` o
`figcaption`. `roleOf` pasó de un respaldo por nombre de etiqueta a un mapa
explícito de roles implícitos, con los casos condicionales resueltos —`section`
es `region` solo si tiene nombre; `header` y `footer` son `banner` y
`contentinfo` solo en el nivel de la página; `th` es `rowheader` o
`columnheader` según su `scope`.

**Cuatro de los cuatro defectos de normalización del estudio aparecieron en
controles negativos.** Ninguno apareció en un mutante. Un mutante que diverge
confirma lo que se esperaba y no invita a mirar la traza; un cambio que no debía
divergir y divergió obliga a mirarla. Es el argumento empírico para que los
controles negativos sean un tercio de la muestra y no un apéndice.

El cambio invalidó todas las mediciones anteriores y las diez apps se remidieron.

### Dos hallazgos de evidencia

**`a09 m06-status-removed` — el árbol detecta, los eventos localizan.**

| canal | divergencia | pasos con diferencia |
|---|---|---|
| eventos | 2,8 % | `[10, 11, 12, 18, 21, 29]` |
| árbol | 1,2 % | `[0 … 22, 29, 30]` |

El nodo con `live="polite"` desaparece del árbol **en el montaje**, así que el
árbol diverge en casi toda la traza y localizaría el defecto en el paso 0, donde
no ocurrió nada. Los eventos localizan en los seis pasos donde realmente se
perdió un anuncio. Es el inverso exacto de `a10 m07`, donde los eventos divergían
un 1,3 % y el árbol un 27,3 %: **ninguno de los dos canales domina al otro, y en
este caso uno detecta mientras el otro localiza.** La métrica de localización de
la transición del Instrumento 4 debe tomar la evidencia de los eventos cuando
ambos canales divergen y el del árbol es difuso.

**`a08 m01-ccs-clear-on-selection` — una regresión sin ningún evento asociado.**
Borrar el campo de detalle no produce evento: el valor de un `input` es una
propiedad, no un atributo, y el `MutationObserver` no lo ve. El canal de eventos
diverge solo en el paso 12, por consecuencia; el árbol diverge en el paso 8, que
es donde ocurrió. Es el caso que prueba que el árbol de accesibilidad no es
evidencia redundante: **sin él, esta regresión no sería localizable y con un
escenario más corto no sería detectable.**

### Resultados del benchmark completo

Diez apps, sesenta pares, cinco repeticiones de cada base.

| | resultado |
|---|---|
| piso de ruido, identidad semántica | **0,0 %** en las diez apps (mínimo, mediana y máximo) |
| **mutation score** | **42/42 = 100 %** |
| divergencia falsa en controles negativos | **0/18 = 0 %** |
| rango de magnitud, eventos | 0,4 % (`a09 m03`) a 63,4 % (`a04 m02`) |
| rango de magnitud, árbol | 0,1 % (`a09 m02`, `a09 m07`) a 27,4 % (`a10 m03`) |

Tres lecturas, todas para el capítulo 4:

1. **El mutation score de 100 % es un techo, no un resultado del método.** Dice
   que la evidencia recolectada y los escenarios configurados bastan para que
   los cuarenta y dos defectos dejen rastro observable. No dice nada sobre si un
   modelo de lenguaje lo aprovecha: eso es el recall, y se mide en la fase 9. La
   descomposición entre ambas métricas es lo que permite atribuir un fallo a la
   evidencia, al escenario o al modelo.

2. **La magnitud de la divergencia no es un detector.** Entre 0,4 % y 63,4 % para
   defectos igualmente reales, y con el caso menos visible —`a09 m03`, una línea
   de unas ciento setenta— detectable únicamente porque el piso de ruido es cero.
   Un umbral sobre el porcentaje de divergencia descartaría regresiones genuinas.
   Las magnitudes altas, además, están infladas por cascada: `a04 m02` y
   `a10 m03` divergen mucho porque el defecto ocurre temprano y desplaza el resto
   de la traza.

3. **La compuerta determinista es económicamente viable.** Los dieciocho cambios
   que preservan la accesibilidad produjeron divergencia exactamente cero, de
   modo que ninguno habría consumido una sola llamada a un modelo. En un flujo de
   Pull Requests reales, donde la mayoría de los cambios no toca el
   comportamiento accesible, el costo de inferencia se concentra en los cambios
   que sí lo tocan.

### Distribución final de la muestra

Por estrato, por operador y por criterio:

| estrato | apps | pares | positivos | negativos |
|---|---|---|---|---|
| pequeño | `a01`, `a02`, `a07`, `a08` | 12 | 8 | 4 |
| mediano | `a03`, `a04`, `a05`, `a06` | 28 | 20 | 8 |
| grande | `a09`, `a10` | 20 | 14 | 6 |
| | | **60** | **42** | **18** |

| operador | fuente | positivos |
|---|---|---|
| eliminación del anuncio accesible de un mensaje de estado | propio | 9 |
| CTO, Change Tab Index Order | Ma11y | 8 |
| pérdida de foco después de una actualización dinámica | propio | 8 |
| eliminación de activación mediante teclado | propio | 7 |
| CCB, Change Context on Blur | Ma11y | 6 |
| CCS, Change Context on Selection | Ma11y | 4 |

Veinticuatro positivos de los operadores propios y dieciocho de los tres
operadores tomados de Ma11y. Cada operador tiene **entre cuatro y nueve
anfitriones distintos**, que es la condición que permite distinguir el resultado
de un operador del comportamiento de un componente en particular: con un solo
anfitrión, un acierto o un fallo del modelo no se puede atribuir.

| criterio WCAG 2.2 | positivos |
|---|---|
| 2.4.3 Focus Order | 16 |
| 4.1.3 Status Messages | 9 |
| 2.1.1 Keyboard | 7 |
| 3.2.1 On Focus | 6 |
| 3.2.2 On Input | 4 |

El reparto por criterio es desigual y conviene declararlo: 2.4.3 concentra
dieciséis positivos porque dos operadores distintos —CTO y pérdida de foco— caen
bajo ese criterio, y 3.2.2 solo tiene cuatro. **La unidad de análisis del estudio
es el par, no el criterio**, y los objetivos específicos no comprometen
afirmaciones por criterio individual. Cualquier lectura desagregada por criterio
en el capítulo 4 debe reportarse como exploratoria, con su intervalo de
confianza, y no como una estimación con la potencia del diseño: con cuatro casos
el intervalo de Wilson para 3.2.2 es inservible para contrastar hipótesis.

---

## Réplica en el entorno fijado, y la quinta amenaza a la validez

El benchmark se corrió por primera vez en el contenedor Docker del proyecto, el
que fija la imagen `mcr.microsoft.com/playwright:v1.48.2-jammy`. `verify-gt`
reportó **verdad de terreno consistente en los sesenta pares**: los cuarenta y
dos positivos dejan rastro y los dieciocho controles negativos no divergen.

La verdad de terreno es, entonces, una propiedad del par base-mutante y no del
entorno de ejecución. Es el resultado que sostiene la afirmación de que el
benchmark es reutilizable, que es parte del entregable comprometido.

### Qué resultó invariante y qué no

Al comparar las dos ejecuciones par por par, coincidieron de forma exacta:

- el **piso de ruido**: 0,0 % en las diez apps, en las tres identidades;
- la **divergencia de eventos**: los cuarenta y dos valores, al decimal;
- los **conjuntos de pasos con diferencia**, de eventos y de árbol, los sesenta;
- la **clasificación**: cuarenta y dos positivos con evidencia, dieciocho
  negativos con cero.

No coincidió una cosa: la **magnitud de la divergencia de árbol** de
`a04-multipaso`, más baja en el entorno fijado y con una razón constante de
≈0,85 en sus cinco mutantes. El recuento de nodos de árbol de la base de esa app
difería —811 contra 766— y también difería, en menor medida, en `a01` (1131
contra 1143) y `a09` (3214 contra 3232), donde el redondeo a un decimal lo
ocultaba.

### La causa

El contenedor de la primera ejecución resolvía **Playwright 1.56 con Chromium
141** en lugar del 1.48.2 que fija el `package.json`: una instalación global del
entorno tapaba la del workspace. El árbol de accesibilidad **lo computa el
navegador**, y dos versiones de Chromium emiten distinta cantidad de nodos para
el mismo DOM.

Las cifras de referencia del estudio son por tanto las del entorno fijado, no
las de la primera ejecución. Las que esta bitácora venía citando sobreviven
porque los extremos del rango no caían en `a04`: la divergencia de eventos va de
0,4 % a 63,4 % y la de árbol de 0,1 % a 27,4 % en los dos entornos, y los dos
hallazgos de evidencia —`a09 m06` con 2,8 % contra 1,2 %, y `a10 m07` con 1,3 %
contra 27,3 %— son idénticos. Lo que cambia son los cinco valores de árbol de
`a04`.

### El defecto era de procedimiento, no de código

La traza registraba `environment.browserVersion` desde la fase 3. **Ningún
script lo imprimía.** La información estaba capturada y nunca se mostró, de modo
que dos ejecuciones con navegadores distintos produjeron cifras distintas sin que
nada lo advirtiera. Un dato que no se imprime no cumple su función.

La corrección tiene dos partes:

1. `measure` y `verify-gt` imprimen el entorno en su encabezado: navegador,
   versión, viewport y `settleMs`.
2. `packages/benchmark/environment.json` declara `expectedBrowserVersion`.
   Mientras valga `null` los scripts solo informan; fijado el valor, cualquier
   ejecución con otra versión **aborta con código distinto de cero**. Es
   preferible no obtener cifras a obtener cifras que no se puedan comparar con
   las publicadas.

### Para la sección 3.9

Quinta amenaza a la validez, con su control:

> La magnitud de la divergencia de árbol depende de la versión del navegador,
> porque el árbol de accesibilidad lo computa el navegador y no el instrumento.
> La detección, la localización y el piso de ruido son invariantes —se verificó
> en dos versiones de Chromium separadas por once versiones mayores—, pero un
> porcentaje de divergencia de árbol sin su versión de navegador no es una cifra
> reproducible. Control: la versión se registra en cada traza, se imprime en cada
> ejecución y se declara en la configuración del benchmark, que aborta ante
> cualquier discrepancia.

Es además el tercer argumento independiente contra usar la magnitud como
detector, y el más fuerte de los tres. Los dos anteriores eran que el rango de
los defectos reales se solapa con cualquier umbral plausible, y que las
magnitudes altas están infladas por cascada. Este agrega que la magnitud no es
comparable ni siquiera entre dos ejecuciones del mismo benchmark en navegadores
distintos. **La decisión de regresión no puede depender de ella.**

### Entorno de referencia fijado

El contenedor del proyecto corre **Chromium 130.0.6723.31**, el que trae la
imagen `playwright:v1.48.2-jammy`. Quedó declarado en
`packages/benchmark/environment.json` y es el entorno del que salen las cifras
del documento. La primera ejecución había corrido en Chromium 141: once
versiones mayores de diferencia, y aun así la verdad de terreno de los sesenta
pares, el piso de ruido, las cuarenta y dos divergencias de eventos y los sesenta
conjuntos de pasos coincidieron exactamente. Solo se movió la magnitud de árbol,
y solo en tres de las diez apps.

La comprobación es estricta por omisión porque el costo de los dos errores es
asimétrico: no obtener cifras cuesta volver a correr el benchmark, y publicar
cifras no comparables cuesta el capítulo de resultados. La excepción
—`A11Y_ALLOW_BROWSER_MISMATCH=1`— exige intención explícita y marca su salida
como no citable; sirve para construir fixtures, donde lo que importa es el signo
de la divergencia y no su magnitud.

---

## Fase 6 — capa de modelos, tres estrategias, y dos clases de par que faltaban

### Lo que se construyó

`packages/analysis`, con la dirección de dependencias en una sola vía:
`analysis → framework`, y `benchmark` consumiendo las dos. El framework no
importa nada de modelos, porque es el entregable reutilizable y tiene que poder
capturar y alinear trazas sin que exista un LLM en la máquina.

La costura para las APIs de pago es la interfaz `Provider`: texto a texto, sin
exponer nada propio de Ollama. Agregar un proveedor es un archivo en
`providers/` y una entrada en la configuración; ni el ejecutor, ni las
plantillas, ni las métricas cambian.

Nada de endpoint ni de modelo está en el código. `A11Y_OLLAMA_URL` apunta el
servidor donde esté y `A11Y_MODELS` restringe la corrida a una lista de ids.

### Las tres estrategias, y por qué son tres

Están anidadas en información y cada incremento es exactamente una variable:

| | base | eventos de transición | lo que agrega |
|---|---|---|---|
| `static` | no | no | — |
| `state-diff` | sí | no | tener con qué comparar |
| `trace-diff` | sí | sí | el contexto temporal |

Sin la estrategia del medio, una mejora de `static` a `trace-diff` no se podría
atribuir: quedaría la duda de si el modelo mejoró por tener contexto temporal o
por el simple hecho de tener una base. La pregunta de investigación es
exactamente si el contexto temporal mejora la detección, de modo que la
estrategia intermedia es la condición para poder responderla.

Las tres conservan el orden de los pasos y la acción que lo produjo, de modo que
las tres pueden nombrar la transición y la métrica de localización está definida
en las tres. Con esta operacionalización el "contexto temporal" del título son
los eventos de transición.

El validador estático queda aparte, como línea base no asistida por IA, y no se
le pasan sus hallazgos a ninguna estrategia: hacerlo le daría a `static` una
fuente que las otras dos no tienen y rompería el anidamiento.

### Las dos clases de par que faltaban

Al medir los tamaños de prompt apareció algo que invalidaba una métrica
comprometida. Los dieciocho controles negativos tienen divergencia **cero**, de
modo que la compuerta determinista los resuelve sin llamar al modelo:

| clase | pares | con cero pasos de evidencia |
|---|---|---|
| `positive` | 42 | 0 |
| `negative` | 18 | **18** |

Consecuencia: **la tasa de falsos positivos de `state-diff` y `trace-diff` era
cero por construcción.** El modelo nunca veía esos pares, así que la métrica no
medía nada del modelo.

Y el planteamiento del problema aprobado pide separar las regresiones
*"de problemas preexistentes y de diferencias que no afectan la accesibilidad"*.
El benchmark no tenía ninguna de las dos clases. Se agregaron:

**`benign-divergent`, diez pares, uno por app.** La traza cambia y la
accesibilidad se preserva. Son el único caso donde la tasa de falsos positivos
del modelo existe de verdad. Deliberadamente variados en dificultad: tres
reescrituras de texto visible, tres mejoras del nombre accesible, una alta de
contenido con marcado correcto, una alta de un punto de tabulación, una
reescritura de rótulo de control y un recuento derivado de los datos.

Tres de ellos son el contraste directo de un positivo de la misma app, y ahí
está su valor:

- `a09 n01` **suma un punto de tabulación** y no es una regresión; el operador
  CTO de la misma app también cambia el orden de tabulación y sí lo es. Obliga a
  mirar si el control nuevo es alcanzable y tiene nombre, no si el orden cambió.
- `a06 n01` y `a07 n01` **cambian el nombre accesible de un control** y no son
  regresiones. Un detector que marque toda diferencia de nombre accesible —un
  atajo plausible— falla en los dos.
- `a08 n01` actúa sobre el mismo componente que el positivo `a08 m01` y diverge
  en el mismo paso. Uno reescribe un rótulo y el otro borra lo que la persona
  escribió: obliga a mirar **qué** cambió y no **dónde**.

**`preexisting`, seis pares, en las cuatro medianas y las dos grandes.** El lado
izquierdo del par ya tiene un defecto de accesibilidad; el derecho tiene el
mismo defecto más un cambio benigno. Es la prueba de la distinción entre
*accessibility testing* y *accessibility regression testing*, que es el
planteamiento de este estudio.

Lo que se espera de cada estrategia, y que convierte a esta clase en la medida
más directa del aporte del enfoque diferencial:

- `static` ve la versión modificada sola, encuentra un defecto real y no tiene
  forma de saber que ya existía. Debería reportarlo: **falso positivo**.
- `state-diff` y `trace-diff` solo ven el delta benigno, porque el defecto está
  en los dos lados y por tanto no aparece en la diferencia. Deberían responder
  que no hay regresión.

Esta clase obligó a reformular el invariante de la arquitectura, y la nueva
formulación es mejor que la original: lo que debe ser exactamente una parte no es
el cambio respecto de `base`, sino **el delta entre los dos lados del par**. Un
par `preexisting` cambia dos partes respecto de `base` y una sola respecto de su
propio lado izquierdo. El campo `baseVariant` lo declara.

### Distribución final: 76 pares

| clase | pares | divergencia esperada | respuesta esperada |
|---|---|---|---|
| `positive` | 42 | sí | hay regresión, con categoría y transición |
| `negative` | 18 | **cero** | no llega al modelo: lo resuelve la compuerta |
| `benign-divergent` | 10 | sí | no hay regresión |
| `preexisting` | 6 | sí, solo la benigna | no hay regresión |

`verify-gt` comprueba la verdad de terreno de los setenta y seis, con piso de
ruido cero en **cada lado izquierdo**, incluidos los seis defectuosos: si una
variante defectuosa no fuera determinista, su par tampoco lo sería. Las ochenta y
seis variantes del benchmark, que son las diez versiones base y los setenta y
seis mutantes, pasan `axe-core` sin hallazgos, las `preexisting` incluidas, que
es lo correcto: los defectos de este estudio son invisibles al validador
estático por diseño, y eso es la premisa.

### Un candado que faltaba: las categorías

Las categorías de la verdad de terreno tenían **seis cadenas distintas para
cuatro categorías**: catorce positivos llevaban las tildes y el resto no. La
exactitud de categoría compara la respuesta del modelo contra ese valor, de modo
que esos pares habrían contado mal respondiera lo que respondiera el modelo, y
el fallo no se habría manifestado como error sino como una métrica unos puntos
más baja.

Se corrigió por los dos lados, porque uno solo no alcanza:

1. Las cuatro cadenas canónicas son las del alcance aprobado, y `verify-gt`
   aborta si alguna verdad de terreno se sale de ellas.
2. El resolvedor del analizador compara sin tildes, sin mayúsculas y admitiendo
   la categoría dentro de una frase más larga. Lo que se mide es si el modelo
   identificó la categoría, no si escribió las tildes. Lo que **no** hace es
   adivinar: no acepta sinónimos ni traducciones, porque el prompt le da las
   cuatro cadenas literales.

`verify-gt` también exige ahora que el `expectedStep` de cada positivo esté entre
los pasos con evidencia. Los cuarenta y dos lo cumplen, y es precondición para
que la métrica de localización sea contestable.

### El contrato de salida, verificado sin modelo

Los cuatro campos del alcance aprobado, con un parser que **nunca completa un
campo ausente con un valor plausible**: una respuesta que afirma una regresión
sin nombrar categoría produce categoría nula y un problema registrado, no una
categoría inventada. Rellenarla con la más frecuente del benchmark inflaría la
exactitud de categoría con aciertos que el modelo no tuvo.

Se validó contra dieciséis formas de respuesta —vallas de código, prosa antes y
después, booleanos en español, paso como cadena, llaves dentro de la evidencia,
respuesta que se contradice, JSON cortado, sin JSON— con un proveedor de guion
que no usa red ni modelo. Ese proveedor no es un accesorio de pruebas: permite
ejercitar las rutas de error que con un modelo real aparecen de forma esporádica
y no se pueden provocar, y permite que el prototipo donado se ejecute de punta a
punta sin descargar varios gigabytes de pesos.

La política de rescate es deliberada: envolver la respuesta en una valla de
código es un fallo de formato, no de razonamiento. Rescatarlo mide razonamiento;
rechazarlo mediría obediencia. Lo segundo también interesa y se registra aparte
en `issues`, sin confundirse con un fallo de detección.

### Viabilidad: tamaño de los prompts

Medido sobre los 228 pares-estrategia, sin ejecutar una sola inferencia.

| estrategia | mínimo | mediana | máximo | pasos (mediana) |
|---|---|---|---|---|
| `static` | 5.311 | 11.810 | 30.838 | 15 |
| `state-diff` | 761 | 1.371 | 16.960 | 5 |
| `trace-diff` | 824 | 1.803 | 19.178 | 5 |

**La compuerta determinista reduce el prompt entre seis y ocho veces en la
mediana.** Es la cuantificación del argumento económico: el enfoque diferencial
no solo evita llamadas, también abarata las que hace.

`static` no puede podar porque no tiene base: no sabe dónde mirar. La asimetría
no es un sesgo encubierto, es la propiedad que distingue a los dos enfoques, y
queda a la vista en el conteo de tokens.

### Un modelo descartado por su ventana de contexto

El prompt más grande es `static` sobre el estrato grande, con unos 30.800 tokens
estimados de forma conservadora. Eso **descalificó a `gemma2:9b`**, que era el
tercer modelo de la selección inicial: su ventana es de 8.192 tokens y no le
entra el prompt estático de *ningún* par del benchmark. Ollama recorta en
silencio, sin error y sin aviso, de modo que habría producido falsos negativos
indistinguibles de fallos de detección.

Es un resultado anotable para el capítulo 4: **la ventana de contexto puede
descalificar a un modelo de este método con independencia de su calidad**, y la
estrategia estática es la que impone el requisito. Un método diferencial con
poda corre en modelos que uno estático no puede usar.

La selección queda en cuatro familias distintas —Meta, Alibaba, Mistral y
Microsoft—, todas con ventana suficiente, y `minContextTokens` en 32.768 como
requisito declarado. `pnpm preflight` consulta la ventana **real** de cada modelo
contra el servidor y aborta antes de empezar si alguno no alcanza: la lista se
valida en la máquina que la va a correr y no se da por buena desde el repositorio.
Una tabla de ventanas por modelo mantenida a mano envejecería y se equivocaría en
silencio, que es el mismo fallo que la comprobación existe para evitar.

### Presupuesto de inferencia

De las 228 combinaciones par-estrategia, 36 corresponden a los negativos en las
dos estrategias diferenciales y no llegan al modelo. Quedan **192 por modelo**, y
con cuatro modelos **768 inferencias por corrida completa**, más 240 de la
submuestra de veinte pares repetida tres veces para medir consistencia.

### Piloto del formato de evidencia: criterio declarado antes de medir

Queda una decisión de instrumento de la fase 6: cómo se serializa la evidencia
dentro del prompt. Las dos alternativas son defendibles:

- `lines`: el mismo texto que produce el comparador, con marcas `- base` y
  `+ modificada`. Compacto y ya validado por el piso de ruido.
- `json`: un objeto por paso con los eventos y los nodos que difieren, cada uno
  como objeto estructurado con sus campos —`path`, `role`, `name`, `focused`,
  `depth`. Explícito, y entre 1,5 y 2 veces más grande.

Se decide por medición, igual que se decidió la identidad semántica en la fase
3. El criterio queda declarado **antes** de correr, en este orden: veredictos
binarios correctos; exactitud de categoría en los positivos acertados;
localización exacta de la transición; y, si todo empata, menos tokens. Un empate
en los cuatro lo gana `lines`, por barato.

Declararlo de antemano es lo que impide racionalizar el resultado. Es la misma
precaución que la de fijar la versión del navegador: el costo de los dos errores
es asimétrico, y acá el error caro es elegir por intuición y descubrir después
que la medición decía lo contrario.

Alcance del piloto: diez pares, un modelo, estrategia `trace-diff`, dos
repeticiones. La submuestra es **declarada y no aleatoria**, para que sea
reproducible sin depender de una semilla que nadie revisa: seis positivos que
cubren los seis operadores y los tres estratos, los dos controles benignos más
discutibles —uno cambia un nombre accesible, el otro suma un punto de
tabulación— y dos defectos preexistentes.

**No es un resultado del estudio y no va al capítulo 4.** Es una decisión de
instrumento: con diez pares, el intervalo de confianza de cualquier proporción es
inservible para contrastar hipótesis. Las dos repeticiones dan además la primera
lectura de consistencia, con temperatura y semilla fijas, de modo que cualquier
discrepancia es del servidor de inferencia y no del muestreo.

### Un detalle de implementación del formato JSON

El comparador del framework opera sobre líneas de texto, y esa decisión es la que
hace medible el piso de ruido. El formato JSON necesita el objeto detrás de cada
línea que difiere, y se recupera reaplicando el mismo serializador que produjo la
línea —`eventLine` y `axLine`, que son públicos justamente para esto— y buscando
en ese índice.

Reconstruir el índice en lugar de cambiar el comparador es deliberado. Diffear
objetos obligaría a definir igualdad estructural sobre cada tipo de evento, y
cualquier diferencia entre esa definición y el serializador produciría
divergencias distintas según el formato: **el piso de ruido dejaría de ser una
propiedad del instrumento y pasaría a depender del formato elegido.** Los dos
formatos tienen que ver exactamente los mismos hechos, y diferir solo en cómo se
los presenta.

### Cómo se puntúa un veredicto

Dos decisiones del puntaje que afectan las métricas:

1. La categoría y la transición se evalúan **solo en los positivos acertados**.
   Puntuarlas en un falso negativo no tiene sentido, porque no nombró ninguna, y
   puntuarlas en un falso positivo premiaría o castigaría por acertar la
   categoría de una regresión que no existe.
2. Una respuesta que no se pudo interpretar **no** cuenta como "sin regresión".
   Contarla así regalaría aciertos en las treinta y cuatro clases sin regresión
   del benchmark. Se reporta aparte como respuesta inválida, que es una propiedad
   del modelo digna de su propia cifra.

La localización se reporta en dos lecturas: el paso exacto, y el paso dentro del
conjunto de pasos con evidencia. La segunda existe porque un defecto puede
manifestarse en varias transiciones —ya ocurrió en `a01 m01`, que se manifiesta
en dos—, y la rúbrica del Instrumento 4 decide cuál de las dos se reporta como
métrica principal.

---

## Piloto del formato: primer modelo, y por qué la tabla resumen no alcanzó

Primera corrida del piloto con `llama3.1:8b`, veinte llamadas por formato.

| formato | inválidas | detección | categoría | transición exacta | en evidencia | FP | FN | tokens | latencia |
|---|---|---|---|---|---|---|---|---|---|
| `lines` | 0 | 18/20 | 4/12 | 6/12 | 12/12 | 2 | 0 | 1.718 | 1,4 s |
| `json` | 0 | 18/20 | 4/12 | 6/12 | 12/12 | 2 | 0 | 3.828 | 1,4 s |

Empate celda por celda en las cinco columnas de acierto. Por el criterio
declarado de antemano decide el costo, y `lines` cuesta 2,2 veces menos.

### El empate no era una equivalencia

Un empate idéntico en todas las columnas es sospechoso, y la comparación par por
par lo confirmó: **los dos formatos fallan en pares distintos.**

| par | clase | `lines` | `json` |
|---|---|---|---|
| `a06 n01-benign-better-label` | benigna | **falso positivo** | correcto |
| `a10 p01-preexisting-cto-defect` | preexistente | correcto | **falso positivo** |

Cuatro de veinte llamadas discrepan, y cada formato falla **el mismo par en las
dos repeticiones**: con temperatura y semilla fijas la respuesta es determinista,
de modo que la diferencia es sistemática y no muestreo. El 18/20 de cada formato
es una coincidencia de conteos.

Es una lección metodológica aparte del resultado: **una tabla agregada puede
ocultar que dos condiciones no son equivalentes**, y con veinte llamadas la
coincidencia de totales es bastante probable. Toda comparación entre estrategias
del capítulo 4 tiene que reportarse también par por par, no solo agregada.

### Los dos falsos positivos, y lo que cada uno dice

**`lines` sobre `a06 n01`** —el control benigno que mejora el nombre accesible—
respondió:

> *"En el paso 13, el foco se mueve a 'Invitar a una persona al equipo' después
> de un click, pero en la versión base el foco se mantenía en 'Invitar'. Esto
> rompe la continuidad del foco."*

Es el **mismo botón renombrado**. El modelo confundió un cambio de nombre
accesible con un cambio de foco. Es exactamente el fallo que esta clase de
control fue diseñada para cazar, y lo cazó en su primer uso: sin los controles de
divergencia benigna, este error habría quedado invisible, porque los dieciocho
negativos de divergencia nula nunca llegan al modelo.

**`json` sobre `a10 p01`** —el defecto preexistente— respondió:

> *"En el paso 23, la tabla tiene un depth de 4 en la versión base, pero un depth
> de 4 en la versión modificada. Esto indica que la tabla ha cambiado de posición
> en el árbol de accesibilidad."*

La respuesta se autorrefuta: repite el mismo número y concluye que cambió. El
formato estructurado expone `depth` y `path` como campos numéricos, y el modelo
se agarró de uno para inventar una diferencia que no existe. En `lines` la
profundidad es indentación y no un entero disponible para razonar sobre él.

**Esta observación es *post hoc* y se registra como hipótesis, no como
evidencia.** El criterio que decide fue declarado antes de medir y decidió por
costo. Dar vuelta el orden —observar el `depth` inventado y declarar después que
por eso gana `lines`— es justamente lo que la declaración previa existe para
impedir. La hipótesis es contrastable en la corrida completa: si el formato JSON
produce más falsos positivos apoyados en campos numéricos sin cambio, eso sí será
evidencia.

### La exactitud de categoría mide un sesgo de respuesta, no discriminación

4 de 12 es el número más flojo del piloto, y el detalle explica por qué:

| par | verdad | respuesta |
|---|---|---|
| `a01 m01` activación por teclado | operación mediante teclado | orden y continuidad del foco |
| `a02 m01` CTO | orden y continuidad del foco | orden y continuidad del foco |
| `a03 m04` CCS | cambios inesperados de contexto | orden y continuidad del foco |
| `a05 m02` CCB | cambios inesperados de contexto | orden y continuidad del foco |
| `a06 m01` pérdida de foco | orden y continuidad del foco | orden y continuidad del foco |
| `a10 m06` anuncio eliminado | comunicación de actualizaciones dinámicas | operación mediante teclado |

Respondió "orden y continuidad del foco" en cinco de seis positivos **y en los
dos falsos positivos**. La categoría acertada coincide con los dos casos en que
esa respuesta era la correcta. Es decir: la exactitud de categoría de este modelo
es compatible con un sesgo hacia una etiqueta, no con discriminación entre
categorías.

Consecuencia para el capítulo 4: **la exactitud de categoría no se puede reportar
como cifra suelta.** Hay que acompañarla de la matriz de confusión de cuatro por
cuatro y de la distribución marginal de las respuestas, porque un modelo que
responda siempre la categoría más frecuente del benchmark obtendría 16 de 42 sin
discriminar nada. Ese es el número a batir, y es la línea base que hay que
declarar.

### La localización pide la lectura tolerante

12 de 12 dentro de los pasos con evidencia, 6 de 12 en el paso exacto. Cuando el
modelo detecta, **siempre** nombra un paso que de verdad diverge; la mitad de las
veces no es el declarado.

Dos de las fallas son informativas. En `a05 m02` el modelo dijo el paso 12 y la
verdad declarada es el 2: es el mismo par cuyo `expectedStep` ya se había
corregido de 12 a 2 en la fase 7, porque el defecto se dispara en cualquier
`blur`. El modelo nombró una manifestación posterior, que también es real. En
`a10 m06` dijo 22 en lugar de 1, y el anuncio se pierde en los dos pasos.

Respalda reportar **la lectura tolerante como métrica principal** y la exacta
como secundaria, y obliga a que la rúbrica del Instrumento 4 defina qué hacer con
los defectos que se manifiestan en varias transiciones. No es una concesión: un
revisor humano que señale cualquiera de las transiciones donde el defecto se
observa ha localizado el defecto.

### Lo que no se fija todavía

El criterio declarado dice `lines`. No se escribe en la configuración hasta
correr el piloto con los otros tres modelos: un empate que no es equivalencia, en
un solo modelo, es base débil para fijar un parámetro de todo el estudio. El
criterio no cambia; se agrega la comprobación de que no es un artefacto de un
modelo.

### Dos cifras operativas

Recall 12 de 12 en los seis positivos de la submuestra, y dos falsos positivos
sobre ocho llamadas de clases sin regresión. Con esta submuestra y este modelo,
**todos los errores son falsos positivos**, lo que confirma la previsión de que
la tasa de falsos positivos iba a ser el hallazgo y no la detección.

Y la latencia: 1,4 segundos por inferencia. Las 768 de una corrida completa son
unos veinte minutos de cómputo, no horas. El cuello de botella del ejecutor de la
fase 7 no va a ser el modelo sino la captura de trazas, que el piloto repite para
cada modelo: hay que cachearlas.

---

## Piloto del formato: los cuatro modelos, y la decisión

| modelo | formato | falladas | detección | categoría | transición | en evidencia | FP | FN | tokens | latencia |
|---|---|---|---|---|---|---|---|---|---|---|
| llama3.1:8b | `lines` | 0 | 18/20 | 4/12 | 6/12 | 12/12 | 2 | 0 | 1.718 | 1,4 s |
| llama3.1:8b | `json` | 0 | 18/20 | 4/12 | 6/12 | 12/12 | 2 | 0 | 3.828 | 1,4 s |
| qwen2.5:7b | `lines` | 0 | **5/20** | 1/1 | 1/1 | 1/1 | 4 | 11 | 1.732 | 0,9 s |
| qwen2.5:7b | `json` | 0 | **14/20** | 4/8 | 6/8 | 8/8 | 2 | 4 | 3.842 | 1,0 s |
| mistral-nemo:12b | `lines` | 0 | 11/20 | 2/5 | 3/5 | 5/5 | 2 | 7 | 1.637 | 2,7 s |
| mistral-nemo:12b | `json` | 0 | 12/20 | 2/4 | 2/4 | 4/4 | 0 | 8 | 3.817 | 2,5 s |
| phi3.5:3.8b | `lines` | **3** | 11/17 | 4/8 | 1/8 | 8/8 | 3 | 3 | 1.760 | 7,2 s |
| phi3.5:3.8b | `json` | 0 | 14/20 | 4/10 | 6/10 | 10/10 | 4 | 2 | 4.656 | 17,9 s |
| **agregado** | `lines` | 3 | **45/77** | 11/26 | 11/26 | 26/26 | 11 | 21 | | |
| **agregado** | `json` | 0 | **58/80** | 14/34 | 20/34 | 34/34 | 8 | 14 | | |

**Decisión: `json`.** Gana el criterio primario en el agregado y no pierde en
ninguno de los cuatro modelos por separado: empata en uno y gana en tres. Cuesta
2,2 veces más tokens y hasta 2,5 veces más latencia, y se paga porque la
diferencia de acierto no es marginal.

### Lo que la decisión le debe a haber declarado el criterio antes

Con el primer modelo los dos formatos empataron 18 a 18, y el análisis par por
par mostró que `json` había producido un falso positivo autorrefutado: afirmaba
que la profundidad de un nodo cambió citando el mismo número dos veces. La
lectura natural era que el formato estructurado invita a razonar sobre campos
numéricos que no cambiaron, y que por eso convenía `lines`.

Era un cuento. Con los cuatro modelos, `json` detecta trece regresiones más y
produce tres falsos positivos menos. **La observación del `depth` inventado era
una anécdota de una llamada elevada a explicación**, y el criterio declarado de
antemano fue lo único que impidió que decidiera por ella.

Es el argumento empírico, dentro de este mismo estudio, para pre-registrar el
criterio de cualquier decisión de instrumento. Vale para la sección 3.6 y vale
como respuesta a cualquier objeción sobre por qué las decisiones del instrumento
se tomaron como se tomaron.

### El hallazgo no es cuál formato gana

Es que **el formato de la evidencia no es un parámetro neutro: interactúa con el
modelo.** `qwen2.5:7b` pasa de 5 a 14 aciertos de 20, y de once falsos negativos
a cuatro. No es que `json` sea mejor evidencia —son exactamente los mismos
hechos, por construcción del índice—, es que ese modelo no interpreta la
convención `- base` / `+ modificada` de un diff textual. Con estructura explícita
razona; sin ella, responde que no hay regresión casi siempre.

Dos consecuencias:

1. **Para la comparación entre modelos del capítulo 4.** Un modelo que rinde
   peor puede estar rindiendo peor con *ese* formato, y no en la tarea. La
   comparación entre modelos se reporta con el formato fijado y declarado, y la
   limitación se declara: los resultados por modelo son condicionales al formato
   de evidencia elegido.
2. **Para cualquiera que reutilice el framework.** El formato de serialización de
   la evidencia es un parámetro de configuración y no un detalle de
   implementación, justamente porque mueve el resultado. Queda en
   `analysis.config.json` con la medición que lo decidió anotada al lado.

Fijar un formato único no deja nada sobre la mesa, porque **ningún modelo
prefiere `lines`**. Si alguno lo hubiera preferido, habría habido que convertir
el formato en factor del estudio en lugar de en parámetro fijo.

### Las tres llamadas falladas son un dato, no una avería

Las tres son de `phi3.5` con formato `lines`, todas por corte por longitud. Con
`json`, ninguna. Es coherente con lo demás: con el diff textual ese modelo divaga
más y agota el presupuesto de salida.

El proveedor distingue el corte por longitud de una respuesta mal formada, de
modo que no se confunden dos fenómenos en la misma cifra, y desde esta corrección
el piloto **registra el fallo y sigue** en lugar de abortar. La primera versión
abortaba: phi3.5 murió en el segundo par y se perdieron veinte minutos de
capturas. En una corrida de setecientas sesenta y ocho inferencias eso es
inadmisible, y el ejecutor de la fase 7 hereda la misma política más persistencia
incremental.

`num_predict` subió de 1.024 a 2.048 por esto mismo.

### La localización dentro de la evidencia da 60 de 60, y hay que leerla con cuidado

En las dos variantes de formato y en los cuatro modelos, **cada vez que un modelo
afirmó una regresión, el paso que nombró estaba entre los que de verdad
divergen**: 26 de 26 con `lines` y 34 de 34 con `json`.

Es tentador reportarlo como que el modelo nunca alucina una transición. Sería
exagerado: **la evidencia podada contiene únicamente los pasos divergentes**, de
modo que nombrar uno de ellos es casi forzado, y la oportunidad de nombrar otro
es escasa. El resultado es en parte un artefacto de la poda.

Donde esa métrica sí es informativa es en la estrategia `static`, que recibe
todos los pasos y por tanto puede nombrar cualquiera. Ahí la localización dentro
de la evidencia mide algo real, y la comparación entre `static` y las dos
diferenciales en esa métrica es la que hay que reportar. Queda anotado para el
Instrumento 4: la lectura tolerante se interpreta por estrategia y no como cifra
global.

La localización exacta, en cambio, discrimina: 11 de 26 con `lines` contra 20 de
34 con `json`.

---

## Fase 7 — el ejecutor, y lo que encontró su corrida en seco

### Separar la captura de la inferencia

`capture-all` captura una vez la traza de cada una de las ochenta y seis
variantes y la guarda en disco; `run-analysis` las lee de ahí y no abre un
navegador. El motivo lo dio el piloto: con cuatro modelos, un ejecutor que
recaptura pasa la mayor parte del tiempo abriendo navegadores y no infiriendo. La
captura de una variante es idéntica para las tres estrategias y los cuatro
modelos, de modo que repetirla es trabajo puro.

La separación tiene tres consecuencias más allá del tiempo: el análisis puede
recalcularse sin navegador, la traza queda como dato crudo publicable, y un fallo
de captura se distingue de un fallo de inferencia porque ocurren en etapas
distintas. Trece megabytes para las ochenta y seis.

Las trazas no se versionan, porque son regenerables a partir del repositorio y
del navegador fijado. Los resultados de inferencia sí: no se pueden regenerar sin
volver a pagar la inferencia, y son la bitácora del Instrumento 5.

### Tres propiedades del ejecutor que no son adornos

**Orden por modelo y no por par.** Ollama carga y descarga pesos al cambiar de
modelo. Por par serían cientos de cambios; por modelo son tres.

**Persistencia incremental.** Cada llamada se escribe en el acto y al arrancar se
saltan las combinaciones ya registradas, de modo que una corrida interrumpida se
reanuda donde quedó. La primera versión del piloto no lo tenía y phi3.5 murió en
el segundo par: veinte minutos perdidos por una respuesta cortada.

**Una llamada que falla se registra y la corrida sigue**, con reintento solo para
fallos de transporte. Un corte por longitud es determinista con semilla fija, de
modo que reintentarlo solo gasta tiempo; se registra como lo que es, un dato
sobre el modelo.

### La corrida en seco, y el defecto que encontró

El ejecutor corre con `--dry` contra un proveedor de guion, sin red y sin modelo.
No verifica la calidad de las respuestas —no hay modelo— sino lo que no depende
de ella y es justamente donde un ejecutor falla: que la compuerta determinista
registre los casos sin divergencia, que la reanudación salte lo ya hecho, que el
JSONL quede bien formado, que las cuatro clases de par se puntúen como
corresponde.

Encontró uno en la primera ejecución. El ejecutor reportó **cero casos resueltos
por la compuerta** cuando la submuestra tiene tres controles de divergencia nula.
La causa: deducía la condición de que el texto de la evidencia estuviera vacío, y
eso solo era cierto con el formato de líneas. Con el formato estructurado —el que
el piloto acababa de fijar— el texto de una evidencia sin pasos es un objeto con
un arreglo vacío, no una cadena vacía.

El efecto no era gastar inferencias de más. Era que **los dieciocho controles de
divergencia nula, que por diseño no deben llegar al modelo, se le enviaban
igual**, y eso cambia la matriz de confusión de las dos estrategias diferenciales
justo donde el método afirma que la compuerta las protege. La corrección mueve la
autoridad sobre la compuerta al constructor de evidencia, donde la condición es
la ausencia de pasos con divergencia y no depende del formato.

Es el segundo defecto del estudio causado por una condición deducida de una
representación en lugar de preguntada a su fuente; el primero fue el nombre
accesible tomado del contenido textual de cualquier elemento. El patrón vale
anotarlo: **una condición derivada del formato de salida se rompe en silencio
cuando el formato cambia.**

### Cómo quedan registrados los casos de la compuerta

Un caso sin divergencia se escribe en la bitácora con `resolvedBy: "gate"`, sin
llamada y sin tokens, y con el veredicto "no hay regresión" que la compuerta
determina. Queda así marcado para que el Capítulo 4 pueda reportar **la matriz de
confusión con la compuerta y sin ella**, que son dos cifras distintas y las dos
informativas: la primera describe el método tal como se desplegaría en un flujo
de Pull Requests, la segunda aísla el desempeño del modelo.

### Presupuesto comprobado

Con los setenta y seis pares, las tres estrategias y una repetición, el bloque
completo son **doscientas doce inferencias por modelo** —doscientas veintiocho
combinaciones menos las dieciséis que resuelve la compuerta— y **ochocientas
cuarenta y ocho con los cuatro modelos**. El bloque de consistencia son veinte
pares por tres repeticiones, ciento sesenta y dos inferencias por modelo.

---

## Fase 8 — la corrida completa, y el resultado

Cuatro modelos, tres estrategias, setenta y seis pares, una repetición:
**912 filas, 912 claves únicas, una sola configuración.** Seis llamadas falladas
y once respuestas no interpretables, todas de `phi3.5`; los otros tres modelos
sin una sola.

### Desempeño agregado

| estrategia | precisión | sensibilidad | F1 | tasa de falsos positivos |
|---|---|---|---|---|
| sin versión base | 0,543 | 0,272 | **0,362** | 0,285 |
| diferencial de estados | 0,802 | 0,584 | **0,676** | 0,176 |
| diferencial de trazas | 0,850 | 0,685 | **0,758** | 0,147 |

Monótono en las cuatro métricas. Cada incremento de información mejora la
precisión, la sensibilidad y el F1, y **baja** la tasa de falsos positivos.

### Los contrastes

| hipótesis | comparación | solo la 2ª | solo la 1ª | p | p (Holm) | veredicto |
|---|---|---|---|---|---|---|
| H0-1 | sin base vs dif. de estados | 91 | 27 | 2,69×10⁻⁹ | 5,38×10⁻⁹ | **rechazada** |
| H0-2 | dif. de estados vs dif. de trazas | 40 | 19 | 8,64×10⁻³ | 8,64×10⁻³ | **rechazada** |
| — | sin base vs dif. de trazas | 104 | 19 | 2,22×10⁻¹⁵ | descriptivo | — |

Q de Cochran sobre las tres: **Q = 77,47, gl = 2, p = 1,50×10⁻¹⁷**, con 288
casos puntuados en las tres y 135, 198 y 219 aciertos respectivamente.

Y lo que sostiene la afirmación en su forma defendible, porque corrige el
agrupamiento por aplicación:

| diferencia de F1 | observada | IC 95% por conglomerado | excluye cero |
|---|---|---|---|
| dif. de estados menos sin base | +0,314 | [+0,205, +0,450] | sí |
| **dif. de trazas menos dif. de estados** | **+0,082** | **[+0,029, +0,136]** | **sí** |
| dif. de trazas menos sin base | +0,396 | [+0,285, +0,519] | sí |

El intervalo de la segunda fila es la respuesta a la pregunta del título:
**el contexto temporal mejora la detección, y la mejora sobrevive a tratar las
diez aplicaciones como diez conglomerados en lugar de setenta y seis
observaciones independientes.**

### Tres advertencias que van con el resultado

**Por modelo individual, H0-2 carece de potencia.** Solo `mistral-nemo` alcanza
significancia por sí solo (p = 0,031); los otros tres van en la misma dirección
con siete a diecinueve pares discordantes cada uno. Lo que sostiene el resultado
es el agregado más la consistencia de la dirección —**la diferencial de trazas
gana en los cuatro modelos sin excepción**—, no cada modelo por separado.

**El modelo más pequeño ganó.** `phi3.5`, con 3.800 millones de parámetros, da
el mejor F1 en la estrategia diferencial de trazas (0,871), por encima de
`llama3.1` 8B (0,841) y de `mistral-nemo` 12B (0,688). Con evidencia diferencial
bien construida, el tamaño del modelo no es lo que decide. Es también el modelo
con las seis llamadas falladas y las once respuestas no interpretables, de modo
que el mismo modelo es el más certero y el menos fiable en forma.

**`qwen2.5` sin versión base no detecta nada**: sensibilidad 0,024, un acierto
de cuarenta y dos positivos, F1 0,045. No es que falle: es que casi nunca
afirma una regresión cuando no tiene con qué comparar. El caso extremo del
hallazgo general.

### El desglose que justifica las clases agregadas

| estrategia | positivos | divergencia nula | divergencia benigna | defecto preexistente |
|---|---|---|---|---|
| sin versión base | 0/162 | **18/69** | 10/38 | 9/23 |
| diferencial de estados | 0/166 | **0/72** | 15/40 | 9/24 |
| diferencial de trazas | 0/165 | **0/72** | 13/40 | 7/24 |

Falsos positivos sobre el total de cada clase. Ciento cuarenta y cuatro casos
los resolvió la compuerta determinista sin consultar al modelo.

Dos lecturas, y las dos son resultado:

**La compuerta es perfecta en lo suyo.** Cero falsos positivos en los setenta y
dos pares de divergencia nula que alcanzan a las dos estrategias diferenciales,
contra dieciocho de sesenta y nueve en la estrategia que no tiene compuerta
porque no tiene base. Un cambio que no altera la traza nunca produce una alarma.

**Y el modelo sigue siendo el punto débil donde la compuerta no llega.** Sobre
los cambios benignos que sí alteran la traza, trece o quince de cada cuarenta
producen una alarma falsa. Sin la clase de divergencia benigna, la tasa de
falsos positivos de las estrategias diferenciales habría salido **cero por
construcción** y el capítulo habría reportado un método impecable. Construir esa
clase fue lo que impidió publicar un resultado falso.

### H0-6 se sostiene: la categoría no discrimina

Exactitud de categoría de 0,386, 0,371 y 0,407 contra una línea base de
**0,381** —responder siempre "orden y continuidad del foco" acierta dieciséis de
cuarenta y dos. Las tres estrategias están en el nivel del sesgo de etiqueta.

La matriz de confusión de cuatro por cuatro lo confirma: de ciento trece
respuestas de la estrategia diferencial de trazas, setenta y seis dicen "orden y
continuidad del foco", incluidas diecisiete de las veinticinco cuya verdad es
"cambios inesperados de contexto" y nueve de las quince cuya verdad es
"comunicación de actualizaciones dinámicas".

**El método detecta que hay una regresión y no sabe de qué clase es.** Es un
hallazgo negativo firme y hay que reportarlo como tal, no diluirlo: la salida de
cuatro campos que el alcance aprobado compromete se cumple en forma pero no en
contenido para el campo de categoría.

### Localización

| estrategia | paso exacto | dentro de la evidencia |
|---|---|---|
| sin versión base | 10/44 · 0,227 | 24/44 · 0,545 |
| diferencial de estados | 36/97 · 0,371 | 96/97 · 0,990 |
| diferencial de trazas | 46/113 · 0,407 | 113/113 · **1,000** |

La lectura tolerante confirma la advertencia escrita antes de medir: en las dos
estrategias diferenciales la evidencia contiene solo los pasos divergentes y el
acierto está casi forzado —0,990 y 1,000—, mientras que en la estrategia sin
versión base, que recibe todos los pasos, la misma medida da 0,545 y **sí
discrimina**. Por eso se reporta por estrategia y no como cifra global.

### Eficiencia

| estrategia | tokens de prompt (mediana) | latencia (mediana) | rango intercuartil |
|---|---|---|---|
| sin versión base | 9.759 | 3,5 s | [2,0 s, 11,5 s] |
| diferencial de estados | 1.658 | 1,7 s | [1,1 s, 2,3 s] |
| diferencial de trazas | 2.285 | 1,6 s | [1,0 s, 2,2 s] |

Delta de Cliff de la latencia entre la estrategia sin base y la diferencial de
trazas: **+0,506**. La compuerta determinista no solo evita llamadas: abarata
cuatro veces las que hace, y la estrategia que más información recibe es la más
rápida de las tres.

### Dónde se ve el mecanismo

Sensibilidad por operador, que es el desglose más revelador del estudio:

| operador | sin base | dif. estados | dif. trazas |
|---|---|---|---|
| CCB | 6/23 | 18/24 | 18/24 |
| CCS | 5/16 | 11/15 | 13/16 |
| CTO | 10/31 | 21/32 | 23/32 |
| **pérdida de foco tras actualización** | 8/30 | 13/32 | **25/32** |
| eliminación de activación por teclado | 7/27 | 21/27 | 19/26 |
| eliminación del anuncio de estado | 8/35 | 13/36 | 15/35 |

**La pérdida de foco casi duplica con los eventos de transición: 13 de 32 a 25
de 32.** Es el único operador cuyo defecto consiste precisamente en una
transición ausente, y es el que más se beneficia de recibir transiciones. El
mecanismo que la tesis postula aparece exactamente donde debería aparecer, y eso
es más fuerte que la mejora agregada: una mejora uniforme sería compatible con
que el modelo simplemente recibe más texto.

Y por estrato:

| estrato | sin base | dif. estados | dif. trazas |
|---|---|---|---|
| pequeño | 11/32 | 19/31 | 19/31 |
| mediano | 28/80 | 52/80 | 59/78 |
| **grande** | **5/50** | 26/55 | **35/56** |

La estrategia sin versión base se derrumba en el estrato grande: una
sensibilidad de 0,10 contra 0,63. Cuanto más grande la aplicación, más estados
hay que auditar y menos sirve auditarlos sin con qué comparar. Es el argumento
de escala, y es el que conecta con el hallazgo de la ventana de contexto: la
estrategia que peor rinde en las apps grandes es además la única que no cabe en
la ventana sin la poda.

### El análisis es reproducible por un comando

`analysis/analyze.py` produce todo lo anterior desde la bitácora, y
`analysis/stats.py` implementa a mano la chi cuadrado, McNemar exacto, Q de
Cochran, Holm, el bootstrap de conglomerado y el delta de Cliff, sin dependencias
externas. Ninguna cifra de este registro se calculó a mano: todas salen de
`analysis/out/reporte-full.txt`, versionado junto con la bitácora.

La razón de no importar SciPy es de reproducibilidad: el análisis tiene que poder
recalcularse en el mismo contenedor que produjo los datos, sin instalar nada y
sin que una versión distinta de una biblioteca mueva una cifra del capítulo.

## Fase 9 — el bloque de consistencia, y un defecto del analizador

Veinte pares declarados de antemano, tres repeticiones, cuatro modelos: 720
filas, 720 claves únicas, una sola configuración.

### El reporte del bloque habría hecho que el estudio se contradijera

`analyze.py` aplicaba al bloque de submuestra el mismo recorrido que al bloque
completo, contando cada repetición como una observación independiente. No lo es:
cada par aparece tres veces, de modo que los conteos se triplican y el
apareamiento que suponen McNemar y la Q de Cochran se rompe. El resultado era un
reporte que decía que H0-1 y H0-2 **no** se rechazan, cuando el bloque completo
las rechaza con p=2,69e-09 y p=8,64e-03. Si esa salida hubiera entrado al
Capítulo 4 junto a la del bloque completo, el trabajo se habría contradicho a sí
mismo con sus propios datos.

No era un resultado: era triplicar veinte pares. El analizador ahora declara esa
condición al principio del reporte de cualquier bloque con repeticiones y marca
sus cifras de detección como descriptivas y no citables.

La lección se parece a la de la huella de configuración, y conviene decirla una
vez más: **un procedimiento de análisis correcto para un conjunto de datos no es
automáticamente correcto para otro**, y el que decide no es el formato del
archivo sino el diseño que lo produjo.

### Lo que el bloque sí mide

Sobre 208 grupos evaluables de 216, donde un grupo es una condición completa de
par, estrategia y modelo:

| | unanimidad |
|---|---|
| global | 202/208 = 0,971 |
| kappa de Fleiss | 0,959 (observado 0,981, esperado 0,535) |
| versión modificada únicamente | 72/76 = 0,947 |
| diferencial de estados | 65/67 = 0,970 |
| **diferencial de trazas** | **65/65 = 1,000** |

Entre los grupos que detectaron la regresión en las tres ejecuciones, la
categoría y la transición coincidieron en 129 de 129.

**La consistencia sube de forma monótona con la cantidad de evidencia
diferencial, y las seis discordancias se concentran en las dos estrategias con
menos evidencia**: cuatro en la primera, dos en la segunda, ninguna en la de
trazas. Es una cuarta dimensión en que gana el diferencial de trazas, después de
F1, falsos positivos y localización, y es la que decide si el método sirve en
integración continua.

La advertencia va con la cifra: con 65 grupos por estrategia, la diferencia
entre 1,000 y 0,947 son cuatro grupos. La dirección es consistente con todo lo
demás que se midió; la magnitud no soporta una afirmación fuerte.

Los ocho grupos descartados son los errores 500 de phi3.5, y no son aleatorios:
el mismo par falla en las tres repeticiones. Es una propiedad del modelo con ese
tamaño de entrada, no una avería del transporte.

### La kappa se implementó a mano y se verificó antes de usarla

`analysis/stats.py` la calcula sin dependencias externas y devuelve también el
acuerdo observado y el esperado, porque una kappa sin ellos no se puede
interpretar: cuando todas las respuestas caen en una sola categoría el acuerdo
esperado vale 1 y el coeficiente queda indefinido aunque el acuerdo sea
perfecto. Se comprobó contra el ejemplo clásico de Fleiss, de diez sujetos y
catorce evaluadores: da 0,2099 donde la referencia da 0,210.

## Fase 10 — el flujo de Pull Requests, y su autoprueba

Es el OE4, y es un artefacto del desarrollo y no un instrumento de medición.

### Un motor, dos frentes

`scripts/pr-core.ts` recibe dos directorios ya compilados y no sabe de dónde
salieron. El simulador local los obtiene de dos referencias con `git archive`; el
workflow, de dos checkouts. La separación es deliberada: si cada frente tuviera
su propia lógica de medición, los dos reportes podrían diferir y ninguno sería
evidencia de nada.

`git archive` en lugar de `git worktree` por una razón concreta y aprendida: no
escribe nada dentro de `.git`, de modo que no deja metadatos que limpiar. En una
carpeta donde el borrado está restringido, un `worktree remove` que falla deja el
repositorio con referencias a árboles que ya no existen, que es la misma familia
de problema que un archivo de bloqueo huérfano.

### Tres controles sin los cuales el flujo miente

Aplicación ausente en el lado base: es nueva y se reporta como tal. Sin esto,
toda aplicación que un Pull Request agregue aparecería como regresión.

Escenario alterado por el cambio: la comparación se **rechaza**. La equivalencia
del recorrido es la condición que hace comparables las dos trazas; sin ella, toda
diferencia observada es indistinguible de un cambio de recorrido. Es el único
caso en que el flujo se niega a dar un veredicto en lugar de darlo con reservas.

Framework de captura tocado: lo que cambió es el instrumento y no la aplicación,
y se advierte junto al resultado.

### La primera corrida ejercitó los controles que rechazan, no el que mide

Comparando el primer commit contra el árbol de trabajo, las nueve aplicaciones
agregadas después salieron como nuevas y `a01-landing` salió rechazada porque su
escenario pasó de 9 a 11 pasos entre los dos commits. Los tres controles
funcionaron, y ningún par resultó comparable: el camino de captura, comparación,
compuerta y veredicto quedó sin ejercitar.

Esa distinción importa porque una corrida que no falla no es una corrida que
mide.

### La autoprueba contra verdad de terreno

`scripts/pr-selftest.ts` construye a propósito un cambio comparable cuyo
resultado correcto está declarado en el benchmark. Aprovecha que una variante
mutante sustituye exactamente una entrada del mapa de partes: sobrescribir
`variants/base.tsx` con la variante mutante simula con precisión un cambio real
que cablea un componente defectuoso en la composición base. Exporta `HEAD`,
instala una vez, compila el lado base, aparta su `dist`, inyecta el mutante,
compila otra vez y compara.

Sobre `a01-landing` con `m01-kbd-activation`, cuya verdad de terreno declara
regresión en el paso 5 y categoría de operación mediante teclado:

| dimensión | resultado |
|---|---|
| divergencia observable | pasa, en los doce registros |
| el paso esperado divergió | pasa |
| detección | pasa, dijo regresión |
| **localización estricta** | **pasa, dijo paso 5** |
| categoría | falla, dijo orden y continuidad del foco |

La categoría y la localización se informan pero no hacen fallar la prueba, y la
decisión es deliberada: son desempeño del modelo, que es lo que mide el Capítulo
4, y no corrección del flujo. Mezclarlas convertiría una prueba del instrumento
en una prueba del modelo, y entonces un modelo flojo rompería el pipeline del
repositorio.

### Dos lecturas del resultado

**El fallo de categoría no es nuevo: es el sesgo ya medido, reproducido fuera de
la campaña.** En el bloque de consistencia, con la estrategia de diferencial de
trazas y los cuatro modelos, de dieciocho casos cuya verdad era operación
mediante teclado, diecisiete se respondieron como orden y continuidad del foco y
ninguno como la categoría correcta. La autoprueba reprodujo exactamente ese
comportamiento en un caso construido aparte, lo que refuerza H0-6.

**Los doce registros divergentes son cascada, y muestran algo que la localización
tolerante no distingue.** La mutación convierte un `button` en un `div`, de modo
que el rol cambia en el árbol de accesibilidad desde el estado inicial, antes de
cualquier interacción. Por eso difieren los doce y la poda no poda nada en este
par: el modelo recibió la traza completa. Y aun así localizó el paso 5 de forma
exacta teniendo doce candidatos. La lectura tolerante habría dado un acierto
trivial acá; la estricta midió algo.
