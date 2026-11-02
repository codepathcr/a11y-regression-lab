# Instrumento 4 — Rúbrica de clasificación de respuestas

Reglas que convierten la respuesta textual de un modelo en una celda de la
matriz de confusión y en los indicadores de categoría y localización. Las
implementan `packages/analysis/src/parse.ts` (lectura) y
`packages/analysis/src/score.ts` (puntuación); este documento describe lo que
ese código hace, no algo distinto.

## 1. Lectura de la respuesta (`parse.ts`)

1. Se toma el **primer objeto JSON balanceado** de la respuesta. Texto antes o
   después del objeto no invalida la lectura, pero se registra como incidencia.
2. Si no hay objeto JSON, o está mal formado, o falta `regression` o es
   ilegible, el veredicto es **no interpretable** (ver sección 4).
3. Normalización de campos:
   - `regression`: se acepta `true`/`false`, y las formas `sí`, `si`, `yes`, `1`
     (y sus negaciones) como booleano.
   - `transitionStep`: entero ≥ 0; se acepta una cadena numérica.
   - `category`: se compara sin tildes, sin distinguir mayúsculas ni espacios
     sobrantes, y se acepta dentro de una frase más larga. **No** se aceptan
     sinónimos, abreviaturas ni traducciones: el prompt entrega las cuatro
     categorías literalmente.
4. **Nunca se completa un campo ausente.** Lo que el modelo no dijo se lee como
   ausente.
5. Las incoherencias (afirma regresión sin `transitionStep` o sin evidencia;
   niega regresión pero completa categoría o paso) se registran como
   incidencias y no alteran la puntuación.

Las cuatro categorías: orden y continuidad del foco (2.4.3), operación mediante
teclado (2.1.1), cambios inesperados de contexto (3.2.5, 3.2.2) y comunicación
accesible de actualizaciones dinámicas (4.1.3).

## 2. Puntuación (`score.ts`)

| Respuesta | Verdad de terreno | Celda |
|---|---|---|
| `regression = true`  | con regresión    | verdadero positivo |
| `regression = true`  | sin regresión    | falso positivo |
| `regression = false` | sin regresión    | verdadero negativo |
| `regression = false` | con regresión    | falso negativo |

- **Acierto de detección**: la respuesta binaria coincide con la verdad de terreno.
- **Categoría** y **localización** se evalúan **solo en verdaderos positivos**.
  En un falso negativo el modelo no nombró nada; en un falso positivo no existe
  categoría que acertar.
- **Categoría correcta**: la categoría resuelta (sección 1) es la de la verdad de
  terreno.
- **Localización exacta (la que se reporta)**: `transitionStep` es igual a
  `expectedStep` del par.

## 3. Defectos que se manifiestan en más de una transición

Un defecto puede dejar rastro en varias transiciones, y es lo habitual: el
`m01-kbd-activation` de `a01-landing` se manifiesta en los pasos 5 y 6 (en la
base el clic mueve el foco al botón, por lo que al enfocar el campo siguiente
hay un `blur` que en el mutante no existe), y lo mismo ocurre, por ejemplo, en
`a03` (pasos 3 y 5), `a05` (8 y 9) y `a06` (7, 9 y 13). En todos, el
`expectedStep` del manifiesto es el primero de la lista.

**Regla adoptada: solo cuenta como exacta la primera transición**, es decir la
registrada como `expectedStep` en el manifiesto del par. Nombrar la segunda no es
localización exacta.

La lectura tolerante (`transitionWithinEvidence`: el paso nombrado está entre los
que presentan diferencias en la evidencia entregada) se calcula y se conserva
como indicador **secundario y descriptivo**; ninguna prueba confirmatoria
depende de ella.

Esta regla coincide con la puntuación que ya se aplicó a toda la campaña, de modo
que no modifica ninguna cifra publicada.

## 4. Fallos, respuestas no interpretables y límite de contexto

Tres situaciones distintas, que se reportan por separado y no se mezclan:

- **Fallo de ejecución** (error de transporte o del servidor, incluido el aborto
  por repetición de tokens): no hay respuesta; el par-celda queda sin veredicto.
- **Respuesta no interpretable**: hay texto pero no un veredicto legible. La
  puntuación es nula. **No se cuenta como «sin regresión»**, porque regalaría
  aciertos en todas las clases sin regresión. Se reporta como respuesta inválida,
  propiedad del modelo con cifra propia.
- **Límite de contexto**: se rige por la regla declarada en la sección 3.6 del
  documento; no se reinterpreta aquí.

## 5. Doble etiquetado (procedimiento previsto)

Previsto en el diseño, **aún no ejecutado**:

- Muestra de 60 respuestas, 5 por combinación de modelo y estrategia.
- Dos anotadoras aplican esta rúbrica de forma independiente.
- Concordancia: kappa de Cohen, con umbral previsto ≥ 0,80.
- Los desacuerdos se resuelven ampliando la regla escrita aquí, no caso por caso.

Hasta que se ejecute, la puntuación vigente es la automática descrita en las
secciones 1 a 4, y este apartado no puede citarse como resultado.
