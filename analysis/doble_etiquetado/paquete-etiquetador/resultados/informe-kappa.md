# Informe de concordancia del doble etiquetado (Instrumento 4, rúbrica de clasificación)

Fecha del cálculo: 2026-11-09. Entradas: `entrada/hoja-monika.xlsx`, `entrada/hoja-victor.xlsx`, `entrada/clave-muestra.json`, `paquete-etiquetador/datos/muestra-ciega.json`. Las etiquetas no se corrigieron ni se modificaron: todo se calcula sobre las clasificaciones independientes, antes de resolver desacuerdos (Cap. 3, sección 3.6.1). Umbral previsto: kappa de Cohen de 0,80.

## 1. Validación de las hojas

| Comprobación | Monika | Víctor |
|---|---|---|
| Pestaña "Hoja" con columnas id, respuesta, regresion, categoria, paso, notas, estado | sí | sí (además 9 columnas vacías sin encabezado, sin efecto) |
| Filas con id | 60 | 60 |
| Identificadores R01 a R60, sin faltantes ni duplicados, iguales a los de la muestra ciega y de la clave | sí | sí |
| Texto de `respuesta` idéntico al de `muestra-ciega.json` en las 60 filas | sí | sí |
| Celdas vacías en regresion, categoria o paso | 0 | 0 |
| Valores fuera de los permitidos | 0 | 0 |
| Columna estado | 60 "completa" | 60 "completa" |
| Notas escritas | 0 | 2 (R23, R25) |
| Última modificación según los metadatos del archivo (solo referencia) | 2026-11-09 19:33 UTC | 2026-11-07 21:55 UTC |

`kappa.py` terminó con código 0 (sin problemas en las hojas). La clave y la muestra ciega del paquete son idénticas a las del repositorio (`analysis/doble_etiquetado/`), y el SHA-256 de `full.jsonl` (b6f8c375…7fc2) coincide con el registrado en la clave.

Observación de coherencia interna (no es un valor inválido para `kappa.py`, y no se corrigió): en la hoja de Monika la fila R06 combina `regresion` = no y `categoria` = ninguna o ausente con `paso` = 9. En las otras 119 filas de ambas hojas, "ninguna o ausente" va siempre con paso "ninguno".

## 2. Diseño de la muestra (según `muestra.py` y la clave)

- 60 respuestas: 5 por cada una de las 12 combinaciones de modelo (4) y estrategia (3), sorteadas con semilla 20261102.
- Elegibles: 759 respuestas del bloque principal resueltas por el modelo y con texto (768 condiciones con consulta menos 9 llamadas fallidas, recalculado sobre `full.jsonl`). Las respuestas no interpretables eran elegibles.
- Clase del par en la muestra: {'positive': 38, 'preexisting': 11, 'benign-divergent': 8, 'negative': 3}.
- Celda asignada por la lectura automática: {'false-negative': 21, 'true-negative': 15, 'false-positive': 7, 'true-positive': 17}. Ninguna respuesta no interpretable salió en el sorteo.
- Lo que vieron los etiquetadores: solo id y texto de la respuesta (sin modelo, estrategia, aplicación, clase ni lectura automática).

## 3. Resultado de `kappa.py` (salida literal)

```text
### Concordancia entre Monika y Victor

Respuestas etiquetadas por ambas: 60.

| Campo | Acuerdo observado | Kappa de Cohen | Desacuerdos | ¿Alcanza 0,80? |
| --- | --- | --- | --- | --- |
| regresion | 0.983 (59/60) | 0.965 | 1 | sí |
| categoria | 0.983 (59/60) | 0.970 | 1 | sí |
| paso | 1.000 (60/60) | 1.000 | 0 | sí |

Respuestas con los tres campos iguales: 59 de 60.

#### Desacuerdos (para la sesión de resolución)

| id | campo | Monika | Victor |
| --- | --- | --- | --- |
| R06 | regresion | no | sí |
| R06 | categoria | ninguna o ausente | orden y continuidad del foco |

Se resuelven ampliando la regla escrita en la rúbrica, no caso por caso.

#### Notas escritas

- R23: Monika: (vacío) · Victor: segun evidence, parece que no sabe si es una regresion introducida en el cambio o si el problema de accesibilidad existia previamente
- R25: Monika: (vacío) · Victor: segun evidence, pareciera que en lugar de una regresion, se introdujo en realidad una solucion de accesibilidad.

#### Monika contra la rúbrica automática

- Celda de la matriz de confusión: coincide en 59 de 60.
- En los verdaderos positivos que ambas lecturas comparten (17): categoría coincide en 17, paso exacto coincide en 17.

Diferencias de celda:
- R06: persona true-negative, automática false-positive

#### Victor contra la rúbrica automática

- Celda de la matriz de confusión: coincide en 60 de 60.
- En los verdaderos positivos que ambas lecturas comparten (17): categoría coincide en 17, paso exacto coincide en 17.
```

## 4. Recalculo independiente (código propio, `work/mykappa.py`)

| Campo | n | Acuerdo observado (po) | Acuerdo esperado (pe) | Kappa de Cohen | Desacuerdos | IC 95 % bootstrap percentil | IC 95 % asintótico | IC 95 % de Wilson del acuerdo observado | ¿Alcanza 0,80? | ¿Coincide con kappa.py? |
|---|---|---|---|---|---|---|---|---|---|---|
| regresion | 60 | 59/60 (0,983) | 0,523 | 0,965 | 1 | [0,886; 1,000] | [0,897; 1,000] | [0,911; 0,997] | sí | sí |
| categoria | 60 | 59/60 (0,983) | 0,446 | 0,970 | 1 | [0,896; 1,000] | [0,911; 1,000] | [0,911; 0,997] | sí | sí |
| paso | 60 | 60/60 (1,000) | 0,377 | 1,000 | 0 | degenerado en 1,000 (sin desacuerdos) | degenerado en 1,000 | [0,940; 1,000] | sí | sí |

Notas sobre los intervalos. El bootstrap remuestrea las 60 respuestas con reemplazo (10 000 réplicas, semilla 20261109, percentiles 2,5 y 97,5; ninguna réplica dejó la kappa indefinida). El asintótico usa el error estándar de muestras grandes de la kappa (Fleiss, Cohen y Everitt, 1969), truncado en 1. Con un solo desacuerdo, ambos son orientativos: el Cap. 3 ya advierte que el tamaño de 60 no garantiza precisión del coeficiente. Para el paso no hay desacuerdos y el intervalo no es informativo; como referencia, el intervalo de Wilson del acuerdo observado 60/60 es [0,940; 1,000]. El límite inferior de los intervalos de kappa de regresión y categoría queda por encima de 0,80. La fuente del error estándar asintótico no está en las Referencias del documento, por eso en el Cap. 4 solo se reporta el intervalo bootstrap (cálculo propio).

Respuestas con los tres campos iguales: 59 de 60. Respuestas con algún desacuerdo: 1 (R06), que afecta dos campos.

### Matrices de confusión entre etiquetadores (filas: Monika; columnas: Víctor)

**regresion**

| Monika \ Víctor | sí | no | no interpretable | Total |
|---|---|---|---|---|
| sí | 23 | 0 | 0 | 23 |
| no | 1 | 36 | 0 | 37 |
| no interpretable | 0 | 0 | 0 | 0 |
| Total | 24 | 36 | 0 | 60 |

**categoria**

| Monika \ Víctor | orden y continuidad del foco | operación mediante teclado | cambios inesperados de contexto | comunicación accesible de actualizaciones dinámicas | ninguna o ausente | otra (no es una de las cuatro) | no aplica | Total |
|---|---|---|---|---|---|---|---|---|
| orden y continuidad del foco | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 15 |
| operación mediante teclado | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| cambios inesperados de contexto | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| comunicación accesible de actualizaciones dinámicas | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 |
| ninguna o ausente | 1 | 0 | 0 | 0 | 36 | 0 | 0 | 37 |
| otra (no es una de las cuatro) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| no aplica | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Total | 16 | 5 | 0 | 3 | 36 | 0 | 0 | 60 |

**paso**: matriz diagonal (60/60). Distribución común: ninguno: 36, 5: 1, 6: 2, 7: 1, 8: 5, 9: 1, 10: 2, 11: 4, 13: 2, 17: 1, 18: 1, 22: 1, 23: 1, 25: 1, 26: 1. Son 15 valores distintos, tratados como etiquetas nominales.

## 5. Desacuerdos

| id | campo | Monika | Víctor | Lectura literal de la regla (cálculo propio) | Lectura automática (clave) | Notas de Monika | Notas de Víctor |
|---|---|---|---|---|---|---|---|
| R06 | regresion | no | sí | sí | celda false-positive (el modelo declaró regresión en un par con defecto preexistente) | (vacío) | (vacío) |
| R06 | categoria | ninguna o ausente | orden y continuidad del foco | orden y continuidad del foco | celda false-positive (el modelo declaró regresión en un par con defecto preexistente) | (vacío) | (vacío) |

Texto de la respuesta R06 (llama31-8b, trace-diff, a06-equipo/p01-preexisting-focus-defect):

```json
{
  "regression": true,
  "category": "orden y continuidad del foco",
  "transitionStep": 9,
  "evidence": "En el paso 9, el foco se desplaza a un nodo diferente en la versión modificada, pero no en la versión base. Esto indica una regresión en la continuidad del foco."
}
```

Lectura del desacuerdo. La respuesta contiene un objeto JSON completo con `"regression": true`, `"category": "orden y continuidad del foco"` y `"transitionStep": 9`. La tabla de la sección 3 de `RUBRICA.md` asigna "sí" a `true` sin margen de interpretación, y la sección 4 asigna esa categoría. La hoja de Víctor y la lectura automática coinciden con esa lectura literal. La hoja de Monika registra "no" y "ninguna o ausente", pero con paso 9, combinación que la respuesta no sustenta. El desacuerdo es, por tanto, compatible con un error de registro en una fila y **no apunta a una ambigüedad de la regla**. Esto es una inferencia a partir de los archivos: la causa real solo puede confirmarla la sesión de resolución, que no consta en ningún archivo. Ninguna de las dos personas dejó nota en R06.

Los dos desacuerdos de campo (regresion y categoria) proceden de esa única respuesta; no hay desacuerdos de paso.

## 6. Notas escritas por los etiquetadores (sin desacuerdo)

| id | Etiquetas de ambos | Nota de Víctor | Contexto (clave) | ¿Apunta a una ambigüedad de la regla? |
|---|---|---|---|---|
| R23 | sí / comunicación accesible de actualizaciones dinámicas / 17 (idénticas) | segun evidence, parece que no sabe si es una regresion introducida en el cambio o si el problema de accesibilidad existia previamente | phi35, static, a10-tramites/m07-status-no-busy, clase positive; automática: true-positive | No de aplicación: la regla (secc. 3) ordena decidir solo por la clave `regression` e ignorar `evidence`, y ambos la aplicaron igual. Sí señala un límite de constructo: la justificación del modelo no describe con claridad una regresión nueva aunque el campo la afirma, y la rúbrica cuenta la respuesta como detección. |
| R25 | sí / comunicación accesible de actualizaciones dinámicas / 18 (idénticas) | segun evidence, pareciera que en lugar de una regresion, se introdujo en realidad una solucion de accesibilidad. | phi35, trace-diff, a09-tienda/m01-ccs-context-on-selection, clase positive; automática: true-positive | No de aplicación: la regla (secc. 3) ordena decidir solo por la clave `regression` e ignorar `evidence`, y ambos la aplicaron igual. Sí señala un límite de constructo: la justificación del modelo no describe con claridad una regresión nueva aunque el campo la afirma, y la rúbrica cuenta la respuesta como detección. |

Estas dos notas no afectan la kappa. Son la única evidencia en las hojas de una posible ampliación o aclaración de la regla (por ejemplo, dejar escrito que la incoherencia entre `regression` y `evidence` se registra en notas y no cambia la etiqueta, lo que la regla ya dice en la sección 3). La sesión de resolución no agregó ninguna frase a RUBRICA.md (ver acta-resolucion-R06.md).

## 7. Acuerdo con la lectura automática (clave)

La clave solo contiene, por respuesta, la celda de la matriz de confusión que asignó la rúbrica automática y, en los verdaderos positivos, si la categoría y el paso exacto fueron correctos. La comparación sigue el método de `kappa.py`: la celda humana se deriva de la etiqueta de regresión y de la verdad de terreno de la clave.

| Etiquetador | Celda coincidente | Kappa de Cohen (celda, 4 valores) | IC 95 % bootstrap | Verdaderos positivos comunes | Juicio de categoría coincidente | Juicio de paso exacto coincidente | Diferencias |
|---|---|---|---|---|---|---|---|
| Monika | 59/60 (0,983) | 0,977 | [0,928; 1,000] | 17 | 17/17 | 17/17 | R06: persona true-negative, automática false-positive |
| Víctor | 60/60 (1,000) | 1,000 | degenerado en 1,000 | 17 | 17/17 | 17/17 | ninguna |

Verificación adicional propia (no es la rúbrica del laboratorio): una aplicación mecánica de `RUBRICA.md` a las 60 respuestas (primer objeto JSON completo, tablas de las secciones 3 a 5) coincide con la hoja de Víctor en 60/60 en los tres campos y con la de Monika en 59/60 en regresión y categoría y 60/60 en paso (la diferencia es R06). La celda derivada de esa lectura mecánica coincide con la lectura automática en 60/60.

## 8. Límites de la evidencia

- La muestra no contiene ninguna respuesta no interpretable (en el bloque principal hay 11, todas de Phi 3.5 con la versión modificada únicamente), ni respuestas con categoría fuera de las cuatro, ni con la categoría "cambios inesperados de contexto", ni pasos no enteros. Las reglas de borde de la rúbrica (objeto truncado, clave ausente, sinónimos, decimales) no quedaron ejercitadas.
- La decisión de regresión se reparte en 23 o 24 "sí" y 37 o 36 "no", de modo que la kappa no está inflada por una categoría dominante (pe = 0,523).
- El paso se trató como etiqueta nominal con 15 valores; la kappa de 1,000 refleja coincidencia total.
- Con 60 respuestas y un desacuerdo, el coeficiente es poco preciso (límite inferior del bootstrap 0,886 para regresión).
- La concordancia mide que la regla escrita se aplica de forma reproducible sobre lo que el modelo declara; no mide si la respuesta del modelo está bien fundamentada (notas de R23 y R25).
- El Cap. 3 preveía la validación antes del etiquetado del resto; en la práctica se hizo después de la campaña, sobre respuestas ya clasificadas por la lectura automática.

## 9. Conclusión frente al Cap. 3

Los tres campos superan el umbral de 0,80 (regresión 0,965; categoría 0,970; paso 1,000), por lo que no procede la repetición con respuestas no usadas que el Cap. 3 prevé para un coeficiente inferior. La sesión de resolución del desacuerdo de R06 se realizó el 9 de noviembre de 2026 y consta en acta-resolucion-R06.md: se atribuyó a un error de registro, la clasificación consensuada es sí / orden y continuidad del foco / paso 9, y no se modificó la rúbrica ni las hojas originales.

