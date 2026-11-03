# Coordinación (para Monika)

Todos los comandos se ejecutan desde esta carpeta (`analysis/doble_etiquetado/paquete-etiquetador`).

## Orden de trabajo

1. **Víctor y Monika etiquetan por separado**, cada uno en su copia de la hoja (`hoja-victor.xlsx`, `hoja-monika.xlsx`). Monika guarda la suya **fuera del repositorio** hasta que Víctor entregue la suya, para no contaminar nada.
2. **Aviso de ciego:** la clave está en el mismo repositorio. Mientras Víctor etiquete, conviene que trabaje desde una copia de esta carpeta (ZIP de GitHub de la carpeta o la rama sin la clave), o que la clave no se haya subido todavía. Monika **no mira** `../clave-muestra.json` antes de terminar de etiquetar.
3. Ambas hojas se guardan en `resultados/` (o en cualquier carpeta) sin modificarse más.
4. Se calcula el kappa (abajo).
5. Sesión de resolución de desacuerdos con Víctor, ampliando `RUBRICA.md` por escrito.
6. Se registran los resultados en el documento.

## Cálculo del kappa

Requiere Python 3.9 o superior.

```bash
pip install -r herramientas/requirements.txt

python herramientas/kappa.py \
  --a resultados/hoja-monika.xlsx --nombre-a Monika \
  --b resultados/hoja-victor.xlsx --nombre-b Victor \
  --informe resultados/informe-kappa.md
```

Si alguna hoja tiene celdas vacías o valores no permitidos, el programa termina con código 2 y lista los problemas. Se corrigen en la hoja correspondiente **antes de entregarla** (no después de ver el resultado).

Para comparar además contra la lectura automática (rúbrica programada), usando la clave que está en el repositorio principal:

```bash
python herramientas/kappa.py \
  --a resultados/hoja-monika.xlsx --nombre-a Monika \
  --b resultados/hoja-victor.xlsx --nombre-b Victor \
  --clave ../clave-muestra.json \
  --informe resultados/informe-kappa.md
```

La clave **solo se usa después** de que ambas hojas estén cerradas.

## Qué reporta el informe

Por cada campo (`regresion`, `categoria`, `paso`): acuerdo observado, kappa de Cohen y si cumple el umbral de 0.80. Además, número de filas con acuerdo total, tabla de desacuerdos con las notas de cada etiquetador y, con la clave, la comparación contra la lectura automática.

## Qué registrar en el documento

- Tamaño de la muestra: 60 respuestas, 5 por modelo y estrategia, semilla `20261102`.
- Etiquetadores: los dos investigadores, de forma independiente.
- Acuerdo observado y kappa de Cohen. El documento no fija sobre qué variable se calcula el kappa. Se propone `regresion` como variable principal y reportar `categoria` y `paso` como complementarias. Esto debe decidirse y dejarse escrito.
- Número de desacuerdos y cómo se resolvieron: ampliando la regla por escrito, sin cambiar las etiquetas originales.
- Frases agregadas a `RUBRICA.md` tras la resolución.
- Si el kappa de algún campo queda bajo 0.80: se revisa la regla, y según el documento se repite el etiquetado con respuestas no usadas. El generador `../muestra.py` puede producir otra muestra cambiando la semilla.
- Acuerdo con la lectura automática (opcional, como evidencia adicional).

Sustituye en el Capítulo 4 el marcador "[pendiente: no se han ejecutado]" por estos resultados.

## Límites de la muestra que conviene declarar

La muestra es aleatoria. En esta muestra no salió ninguna respuesta no interpretable y salieron pocos casos de la clase negativa. Eso significa que el kappa de `regresion` se calcula casi solo sobre `sí` y `no`. Si se quiere probar la rúbrica en sus bordes, se puede agregar una segunda muestra estratificada. Es una decisión metodológica, no técnica.

## Si necesitas regenerar la hoja

```bash
python herramientas/construir_hoja.py
```

Escribe `hoja/hoja-etiquetado.xlsx` desde `datos/muestra-ciega.json`. Si cambias la muestra, hay que redistribuir la hoja nueva a ambos etiquetadores.
