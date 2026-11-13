# Regla de etiquetado (Instrumento 4)

Esta es la regla escrita que usan los dos etiquetadores. Se aplica a cada respuesta de un modelo de lenguaje, **leyendo solo lo que el modelo escribió**. No hay que saber si la respuesta es correcta, ni qué aplicación se analizó, ni qué debía encontrar el modelo. Esa información no se entrega a propósito.

Se registran tres campos por respuesta: `regresion`, `categoria` y `paso`.

## 1. Qué es una respuesta

Cada respuesta debería contener un objeto JSON con estas claves:

| Clave | Significado |
|---|---|
| `regression` | si el modelo afirma que hay una regresión de accesibilidad |
| `category` | la categoría de la regresión, en texto |
| `transitionStep` | el número de paso donde el modelo ubica el problema |
| `evidence` | texto libre de justificación. **Se ignora por completo.** |

La clave `issues`, si aparece, también se ignora. No cambia ninguna etiqueta.

## 2. Qué objeto JSON se lee

1. Se lee **el primer objeto JSON completo** (llaves balanceadas) que aparezca en el texto. Puede haber texto antes o después, o estar dentro de un bloque de código con tres comillas invertidas. Se ignora todo lo demás.
2. Si el primer objeto es incompleto (se corta, falta una llave de cierre, comas o comillas rotas), la respuesta es **no interpretable**.
3. Si el texto es una lista que contiene un objeto, por ejemplo `[{"regression": true, ...}]`, se lee ese objeto.
4. Si no hay ningún objeto JSON, es **no interpretable**.
5. Nunca se completa un campo ausente con lo que "seguramente quiso decir" el modelo.

## 3. Campo `regresion`

Valores permitidos en la hoja: `sí`, `no`, `no interpretable`.

Se mira el valor de la clave `regression`:

| Valor escrito por el modelo | Etiqueta |
|---|---|
| `true`, `"true"`, `"sí"`, `"si"`, `"yes"`, `"1"`, `1` | `sí` |
| `false`, `"false"`, `"no"`, `"0"`, `0` | `no` |
| clave ausente, `null`, vacío, `"quizás"`, `"posible"` o cualquier otra cosa | `no interpretable` |

Las mayúsculas y los espacios sobrantes no cuentan: `"Sí "` es `sí`.

Se decide solo por la clave `regression`. Si `regression` dice `false` pero `evidence` describe un problema, la etiqueta es `no`. Si dice `true` pero `evidence` dice que no hay nada, la etiqueta es `sí`.

Si la respuesta es no interpretable por cualquiera de las razones de la sección 2, o por la tabla anterior, `regresion` es `no interpretable` y `categoria` y `paso` son `no aplica`.

## 4. Campo `categoria`

Se completa cuando `regresion` es `sí` o `no`. Se registra **lo que el modelo escribió en `category`**, aunque `regression` sea `no`.

Las cuatro categorías válidas son exactamente estas:

1. `orden y continuidad del foco`
2. `operación mediante teclado`
3. `cambios inesperados de contexto`
4. `comunicación accesible de actualizaciones dinámicas`

Reglas:

- Se ignoran mayúsculas, tildes y espacios de más. `"Orden y continuidad del foco."` cuenta como la categoría 1.
- Cuenta también si la categoría viene dentro de una frase más larga: `"Se trata de operación mediante teclado (2.1.1)"` cuenta como la categoría 2.
- Si el texto contiene más de una categoría, se toma la primera de la lista de arriba que aparezca contenida, no la que aparezca primero en el texto.
- **No se aceptan sinónimos, abreviaturas ni traducciones.** `"focus order"`, `"teclado"`, `"keyboard"`, `"2.4.3"`, `"foco"`, `"live region"` no son una de las cuatro. Se registran como `otra (no es una de las cuatro)`.
- Si `category` es `null`, está vacía o no existe: `ninguna o ausente`.
- Si `category` no es un texto (un número, una lista, un objeto): `otra (no es una de las cuatro)`.

## 5. Campo `paso`

Se completa cuando `regresion` es `sí` o `no`. Se registra el número de paso del campo `transitionStep`.

| Valor escrito por el modelo | Registrar |
|---|---|
| un entero 0 o mayor: `5`, `0`, `12` | ese número |
| un texto cuyo primer número entero sea 0 o mayor: `"5"`, `"paso 5"`, `"entre el paso 3 y 4"` | el **primer** entero que aparece (`5`, `5`, `3`) |
| `null`, vacío, ausente | `ninguno` |
| número con decimales (`2.5`) | `ninguno` (ver nota) |
| un número negativo (`-1`) | `ninguno` |
| un texto sin ningún número (`"al abrir el menú"`) | `ninguno` |
| una lista o un objeto | `ninguno` |

Nota sobre decimales: la lectura automática solo acepta un entero. Para un número JSON con decimales como `2.5`, la lectura no lo toma. En cambio, un texto `"2.5"` entrega el primer entero, `2`. Si ves un caso así, regístralo según la tabla y anótalo en `notas` para revisarlo con Monika.

## 6. Ejemplos sintéticos

Estos ejemplos son inventados, no pertenecen a la muestra.

```text
{"regression": true, "category": "Operación mediante teclado", "transitionStep": 4, "evidence": "..."}
```
`regresion` = sí, `categoria` = operación mediante teclado, `paso` = 4.

```text
{"regression": false, "category": null, "transitionStep": null, "evidence": "Sin cambios"}
```
`regresion` = no, `categoria` = ninguna o ausente, `paso` = ninguno.

```text
Aquí está mi análisis:
{"regression": "sí", "category": "focus order", "transitionStep": "paso 7"}
Espero que sirva.
```
`regresion` = sí, `categoria` = otra (no es una de las cuatro), `paso` = 7.

```text
{"regression": true, "category": "cambios inesperados de contexto", "transitionStep": 2
```
Se corta antes de cerrar la llave: `regresion` = no interpretable, `categoria` = no aplica, `paso` = no aplica.

```text
{"category": "operación mediante teclado", "transitionStep": 3}
```
Falta la clave `regression`: `regresion` = no interpretable, `categoria` = no aplica, `paso` = no aplica.

```text
[{"regression": false, "category": "operación mediante teclado", "transitionStep": 1}]
```
Es una lista con un objeto, se lee el objeto: `regresion` = no, `categoria` = operación mediante teclado, `paso` = 1.

## 7. Casos dudosos

- Si una respuesta no encaja con claridad en ninguna fila de las tablas, elige la opción que la regla literal indique, escribe en `notas` por qué dudaste y sigue. **No consultes con el otro etiquetador** hasta terminar: la comparación se hace al final.
- No interpretes la intención del modelo. Solo importa lo que está escrito.
- No uses ningún dato externo (otras respuestas, conocimiento del problema). Cada respuesta se etiqueta sola.
- Los desacuerdos entre los dos etiquetadores se resuelven al final ampliando esta regla por escrito. No se resuelven dando la razón a uno de los dos.
