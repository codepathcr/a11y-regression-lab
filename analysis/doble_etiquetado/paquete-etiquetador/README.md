# Paquete del etiquetador (doble etiquetado)

Esta carpeta está dentro de `analysis/doble_etiquetado/` del repositorio *a11y-regression-lab*. Material para el **doble etiquetado independiente** de la rúbrica de clasificación (Instrumento 4) del proyecto final de graduación *a11y-regression-lab* (CENFOTEC).

Dos personas etiquetan por separado las mismas 60 respuestas de modelos de lenguaje. La coincidencia entre ambas se mide con el coeficiente kappa de Cohen, con umbral de 0.80.

> Esta carpeta es autocontenida y contiene solo las respuestas sin identificar. La clave de la muestra (qué modelo, qué estrategia, qué aplicación, si la respuesta era correcta) está en `../clave-muestra.json`, **un nivel arriba**. Quien etiqueta no debe abrirla hasta terminar y entregar su hoja.

## Si eres el etiquetador

Lee [`GUIA.md`](GUIA.md) y luego [`RUBRICA.md`](RUBRICA.md). No necesitas instalar nada.

## Si eres quien coordina

Lee [`COORDINACION.md`](COORDINACION.md).

## Contenido

| Ruta | Para qué sirve |
|---|---|
| `GUIA.md` | pasos detallados para el etiquetador |
| `RUBRICA.md` | la regla escrita que se aplica a cada respuesta |
| `COORDINACION.md` | cómo calcular el kappa y qué registrar en el documento |
| `datos/muestra-ciega.json` | las 60 respuestas con identificador R01 a R60, sin clave |
| `hoja/hoja-etiquetado.xlsx` | la hoja que se copia y se llena |
| `herramientas/kappa.py` | calcula acuerdo y kappa a partir de dos hojas |
| `herramientas/construir_hoja.py` | regenera la hoja desde `datos/muestra-ciega.json` |
| `herramientas/requirements.txt` | dependencias de las herramientas (`openpyxl`) |
| `resultados/` | aquí se guardan las hojas entregadas y el informe |

## Origen de la muestra

60 respuestas, 5 por cada combinación de modelo (4) y estrategia (3), tomadas al azar con semilla fija (`20261102`) entre las respuestas resueltas por el modelo en la corrida principal del estudio. La muestra se genera con `../muestra.py` y es reproducible.
