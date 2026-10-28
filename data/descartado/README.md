# Bitácora descartada

Este directorio conserva bitácoras de ejecución que **no se pueden usar** para
ninguna cifra del documento. Se versionan a propósito: una medición descartada
es parte del registro honesto del estudio, y borrarla dejaría sin respaldo la
decisión de haberla descartado.

## full-mezclado-20261026.jsonl

Primera campaña del bloque completo, ejecutada entre las 00:43 y las 02:25 UTC
del 27 de octubre de 2026 sobre un solo modelo, `llama31-8b`.

**Por qué no sirve.** El proceso no terminó cuando se creyó que había
terminado: siguió escribiendo durante casi dos horas, a lo largo de varios
cambios de configuración de la campaña. El resultado son 429 filas con solo 228
claves únicas, es decir 201 filas duplicadas, y las filas **no registran la
configuración con que se produjeron**. No es que mezcle configuraciones y se
pueda separar: no hay forma de saber qué fila vino de cuál, de modo que ningún
subconjunto es recuperable.

**Qué cambió a partir de esto.** Tres controles del ejecutor salieron de este
incidente y son los que lo hacen imposible de repetir:

1. Cada fila lleva una huella de la configuración con la que se produjo, de
   modo que el análisis comprueba por sí mismo que todas las filas que compara
   provienen de la misma configuración y se detiene si no lo están.
2. Un cerrojo de ejecución con el identificador del proceso impide que dos
   campañas escriban sobre la misma bitácora, y detecta y libera el cerrojo de
   un proceso que ya no existe.
3. La bitácora se escribe de forma incremental y se abre en modo de adición
   controlada, para que una corrida nueva no reviva un archivo borrado.

**Qué la sustituye.** `packages/benchmark/data/results/full.jsonl`, con 912
filas, 912 claves únicas y una sola configuración declarada en cada fila.
