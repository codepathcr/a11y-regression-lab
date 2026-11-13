# Guía para Víctor: etiquetado independiente de 60 respuestas

## 1. Para qué sirve esto

La investigación mide qué tan bien detectan regresiones de accesibilidad cuatro modelos de lenguaje. Un programa lee automáticamente las respuestas de los modelos y las califica con una regla escrita (el Instrumento 4). Para demostrar que esa regla es confiable, dos personas la aplican **por separado** a las mismas 60 respuestas y se mide su coincidencia con el coeficiente kappa de Cohen. El objetivo es kappa de 0.80 o más.

Tú eres el segundo etiquetador. Monika es el primero.

**Tiempo estimado:** entre 1 y 1.5 horas, en una o dos sesiones.
**Qué necesitas:** Excel o LibreOffice Calc. No necesitas Python, ni instalar nada, ni conocer el proyecto.

## 2. Reglas de independencia (importantes)

La validez del kappa depende de que las dos etiquetas sean independientes. Por eso:

1. No hables con Monika sobre ninguna respuesta concreta hasta haber entregado tu hoja.
2. No consultes su hoja ni preguntes qué puso.
3. No busques la "respuesta correcta". **No abras el archivo `clave-muestra.json`** (está un nivel arriba de esta carpeta) ni nada fuera de ella. No hace falta: solo se pide leer lo que el modelo escribió y aplicar la regla.
4. No uses ninguna herramienta de IA para etiquetar.
5. No cambies la regla a mitad de camino. Si dudas, anota la duda en `notas` y aplica la regla literal.

Dudar es normal y útil. Las dudas que anotes sirven al final para mejorar la regla.

## 3. Pasos

### Paso 1. Obtén el repositorio

Una de dos:

- Con Git: `git clone <dirección del repositorio que te pase Monika>` y entra a `analysis/doble_etiquetado/paquete-etiquetador`.
- Sin Git: descarga el ZIP desde GitHub (botón verde **Code**, luego **Download ZIP**), descomprímelo y entra a `analysis/doble_etiquetado/paquete-etiquetador`.

### Paso 2. Lee la regla completa

Abre `RUBRICA.md` y léela completa una vez, con calma (unos 10 minutos). Fíjate sobre todo en:

- la sección 3 (cuándo es `sí`, `no` o `no interpretable`),
- la sección 4 (las cuatro categorías y por qué `"focus order"` **no** cuenta),
- la sección 5 (cómo se lee el paso).

### Paso 3. Haz tu propia copia de la hoja

1. Entra a la carpeta `hoja/`.
2. Copia `hoja-etiquetado.xlsx` y nómbrala `hoja-victor.xlsx`. Puedes dejarla en la misma carpeta o en cualquier otra.
3. Trabaja **solo** en `hoja-victor.xlsx`. No modifiques el archivo original.

### Paso 4. Entiende la hoja

Tiene tres pestañas:

- **Hoja:** una fila por respuesta (R01 a R60). Las columnas `id` y `respuesta` ya vienen llenas y no se editan. Tú llenas las celdas amarillas: `regresion`, `categoria`, `paso` y, si quieres, `notas`. La columna `estado` se calcula sola.
- **Opciones:** las listas permitidas. No se edita.
- **Resumen:** cuántas filas llevas completas y cuántas faltan.

Las celdas amarillas tienen listas desplegables. `regresion` y `categoria` se eligen de la lista. En `paso` se escribe un número entero (0 o mayor) o se elige/escribe `ninguno` o `no aplica`.

### Paso 5. Etiqueta cada respuesta, en este orden

Para cada fila, sin saltarte el orden:

1. **Lee** el texto de la columna `respuesta`.
2. **Busca el primer objeto JSON completo** (de la primera `{` hasta su `}` de cierre).
   - Si no hay ninguno, o está cortado o roto: `regresion` = `no interpretable`, y `categoria` y `paso` = `no aplica`. Pasa a la siguiente.
3. **`regresion`:** mira la clave `"regression"`.
   - `true` o equivalentes de la tabla de la regla: `sí`.
   - `false` o equivalentes: `no`.
   - Ausente, `null` o cualquier otra cosa: `no interpretable` (y `categoria`, `paso` = `no aplica`).
4. **`categoria`:** mira la clave `"category"` y elige según la sección 4 de la regla. Se registra aunque `regression` sea `false`.
5. **`paso`:** mira la clave `"transitionStep"` y aplica la sección 5. Un número entero se copia. Un texto como `"paso 5"` da 5. Vacío o `null` es `ninguno`.
6. **Ignora** `evidence` y `issues`. No importa lo que digan.
7. Si algo te hizo dudar, escríbelo en `notas` (una frase basta).

Ejemplo de una fila bien llenada (sintético):

| id | regresion | categoria | paso | notas |
|---|---|---|---|---|
| R99 | sí | operación mediante teclado | 4 | |

### Paso 6. Revisa que no falte nada

1. Ve a la pestaña **Resumen**. La línea **Faltan** debe decir **0**.
2. En la pestaña **Hoja**, la columna `estado` debe decir `completa` en las 60 filas.
3. Si aparece `revisar: debe ser no aplica`, es una fila marcada `no interpretable` donde `categoria` o `paso` no son `no aplica`. Corrígela.

### Paso 7. Guarda y entrega

1. Guarda el archivo como `.xlsx` (no lo conviertas a otro formato).
2. Entrégalo a Monika por el medio acordado. Opciones:
   - Enviar el archivo por correo o mensajería, o
   - Subirlo a una rama propia del repositorio: `git checkout -b entrega-victor`, copiar el archivo a `resultados/hoja-victor.xlsx`, `git add resultados/hoja-victor.xlsx`, `git commit -m "Hoja de Víctor"`, `git push origin entrega-victor`.
3. Una vez entregada, **no la modifiques más**. Si descubres un error después de entregar, avísale a Monika sin cambiar el archivo.

### Paso 8. Sesión de resolución con Monika

Cuando las dos hojas estén entregadas, Monika calcula el kappa y obtiene un informe con los desacuerdos. Se hace una reunión corta (30 a 60 minutos) donde revisan **solo las respuestas en las que no coincidieron**. Para cada una deciden entre los dos cómo debe leerse y **agregan una frase a la regla** para que el criterio quede escrito. El resultado de esa sesión va a la tesis. Las etiquetas originales de las hojas **no se cambian**: el kappa se calcula siempre sobre las etiquetas independientes.

## 4. Preguntas frecuentes

**La respuesta dice `regression: false` pero en `evidence` describe un problema. ¿Qué pongo?**
`no`. Solo importa la clave `regression`. Anota en `notas` si quieres.

**El modelo puso la categoría en inglés o con otro nombre.**
`otra (no es una de las cuatro)`. No se aceptan sinónimos ni traducciones.

**`transitionStep` es `"paso 3"`.**
`3`. Se toma el primer entero del texto.

**`transitionStep` es `"entre el 2 y el 3"`.**
`2`, el primer entero.

**La respuesta tiene dos objetos JSON.**
Se lee solo el primero.

**La respuesta está dentro de un bloque de código con tres comillas invertidas.**
No importa. Se lee el objeto que haya dentro.

**Hay texto antes o después del JSON.**
Se ignora el texto. Solo se mira el primer objeto.

**La respuesta está vacía.**
`no interpretable`.

**No estoy seguro de nada en una respuesta.**
Aplica la regla literal, anota la duda en `notas` y sigue.

**¿Puedo corregir una etiqueta anterior?**
Sí, mientras no hayas entregado la hoja. Después de entregarla, no.

**La hoja no me deja escribir un valor.**
Es la validación de la hoja. Usa los valores de la lista. Si crees que tu caso no está contemplado, elige el más cercano y anótalo en `notas`.

**Mi Excel no muestra las listas desplegables.**
Usa LibreOffice Calc o la versión de escritorio de Excel. Excel en línea o en el navegador muestra las listas, pero algunas versiones antiguas del visor móvil no.
