# analysis

Análisis estadístico del capítulo 4. Lee la bitácora de ejecución que produce el
framework y calcula las métricas y los contrastes descritos en la sección 3.7
del documento.

```bash
python3 analysis/analyze.py --block full
python3 analysis/analyze.py --block subsample
```

Deja dos salidas en `analysis/out/`: el reporte legible y el mismo contenido en
JSON. **Ninguna cifra del capítulo 4 se obtiene de otra parte.** Si un número no
sale de acá, no va al documento.

## Qué calcula

| sección del reporte | qué responde |
|---|---|
| Integridad | si la bitácora es utilizable: claves duplicadas, configuraciones mezcladas, respuestas falladas y no interpretables por modelo |
| Desempeño agregado | matriz de confusión, precisión, sensibilidad, F1 y tasa de falsos positivos por estrategia |
| Por modelo | las mismas cuatro métricas cruzadas por modelo, para ver si el agregado esconde heterogeneidad |
| Contraste de hipótesis | McNemar exacto de H0-1 y H0-2 con corrección de Holm, el mismo contraste por modelo, y Q de Cochran sobre las tres estrategias |
| Magnitud del efecto | diferencias de F1 con intervalo de confianza por **bootstrap de conglomerado**, remuestreando aplicaciones completas |
| Falsos positivos por clase | el desglose que justifica las clases de divergencia benigna y defecto preexistente |
| Categoría | exactitud contra la línea base de H0-6 y matriz de confusión de cuatro por cuatro |
| Localización | las dos lecturas, estricta y tolerante, interpretadas por estrategia |
| Eficiencia | tokens y latencia con mediana y rango intercuartil, más delta de Cliff |
| Por operador y estrato | sensibilidad desagregada, donde se ve qué operador se beneficia de qué evidencia |
| Discordancias par por par | la regla de reporte de 3.7.3: dos condiciones pueden empatar en el agregado y fallar en pares distintos |

## Sin dependencias externas

`stats.py` implementa a mano la cola de la chi cuadrado, McNemar exacto, Q de
Cochran, la corrección de Holm, el bootstrap de conglomerado y el delta de
Cliff. No se importa SciPy, y la razón es de reproducibilidad: el análisis tiene
que poder recalcularse en el mismo contenedor que produjo los datos, sin
instalar nada y sin que una versión distinta de una biblioteca mueva una cifra
del capítulo. Son cuatro funciones; la dependencia no se paga.

Cada función devuelve los conteos que producen el valor p y no solo el p, porque
un p sin sus conteos no se puede interpretar ni verificar.

## Verificación

`stats.py` se comprobó contra valores conocidos antes de usarse: la cola de la
chi cuadrado en los puntos críticos de 0,05 para uno a cuatro grados de
libertad, y McNemar reproduciendo los conteos de la primera corrida real.

## Dos cosas que el script hace y conviene saber

**Aborta si la bitácora mezcla configuraciones.** Cada fila lleva la huella de
la configuración que la produjo —formato de evidencia, ventana de contexto,
tokens de salida, temperatura, semilla y resumen del enunciado del sistema—, y
si hay más de una, el análisis se detiene. Ya ocurrió una vez: una corrida
olvidada siguió escribiendo durante dos horas mientras se corregían esos
parámetros, y hubo que descartar la bitácora entera porque las filas no se
podían atribuir a una configuración.

**La localización tolerante no se reporta como cifra global.** En las dos
estrategias diferenciales la evidencia contiene únicamente los pasos
divergentes, de modo que nombrar uno de ellos está casi forzado; en la
estrategia sin versión base, que recibe todos los pasos, la misma medida sí
discrimina. El reporte lo imprime por estrategia y con esa advertencia al pie.
