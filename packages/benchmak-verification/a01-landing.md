# Verificacion manual: primera aplicacion del benchmark

## 1. Alcance y fuente de verdad

La primera aplicacion que se probara es **`a01-landing`**, una landing de
consultoria. Su encabezado visible es **Consultoría en accesibilidad digital**.
Incluye Servicios, Preguntas frecuentes y Contacto.

La fuente de verdad es [app.json](../../benchmark/apps/a01-landing/app.json).
El escenario esta marcado como provisional: registrar el commit usado y revisar
esta guia si cambia `scenario.steps` o `groundTruth`.

**Antes** significa `base`; **despues** significa una variante del mismo commit.
La rama de trabajo de esta verificacion es `feature/confirm-benchmark-accuracy`.
No editar codigo ni cambiar de rama entre ambos lados.

| Variante despues | Resultado esperado | Paso declarado | WCAG |
| --- | --- | --- | --- |
| `m01-kbd-activation` | Regresion: FAQ sin acceso mediante teclado | 5 | 2.1.1 |
| `m02-status-silent` | Regresion: confirmacion sin anuncio automatico | 10 | 4.1.3 |
| `m03-neutral-refactor` | Sin regresion en los flujos probados | No aplica | No aplica |
| `n01-benign-rewording` | Texto distinto en Servicios, sin regresion en los flujos probados | No aplica | No aplica |

Estos son resultados esperados, no observaciones ya verificadas. No se necesita
Ollama ni otro modelo. El formulario simula el envio localmente; no manda correo.

## 2. Preparar e iniciar la aplicacion

1. Iniciar Docker Desktop y esperar a que el motor este disponible.
2. Tener Chrome o Edge en Windows y NVDA para comprobar anuncios. Sin NVDA se
   pueden probar teclado y apariencia, pero no confirmar el anuncio automatico.
3. Abrir PowerShell. Ejecutar los comandos siguientes, uno por uno:

```powershell
Set-Location C:\Users\Vargas\Documents\GitHub\a11y-regression-lab
git branch --show-current
git rev-parse HEAD
git status --short
docker compose build
docker compose run --rm --service-ports lab bash
```

`git branch --show-current` debe mostrar `feature/confirm-benchmark-accuracy`.
`git rev-parse HEAD` muestra el identificador del commit, no el nombre de la rama;
registrar ambos junto con los cambios locales. Ninguno de estos comandos cambia
la rama. Si aparece otra rama, detenerse y revisar antes de construir o probar.

4. Ya dentro del contenedor Linux, ejecutar:

```bash
pnpm build
pnpm --filter @a11y-lab/benchmark serve --host 0.0.0.0
```

5. Dejar esa terminal abierta. Abrir la URL completa de `base` en la tabla
   siguiente y comprobar que aparece el encabezado indicado, sin error del harness.

| Variante | URL completa |
| --- | --- |
| `base` | http://localhost:5273/?app=a01-landing&variant=base |
| `m01-kbd-activation` | http://localhost:5273/?app=a01-landing&variant=m01-kbd-activation |
| `m02-status-silent` | http://localhost:5273/?app=a01-landing&variant=m02-status-silent |
| `m03-neutral-refactor` | http://localhost:5273/?app=a01-landing&variant=m03-neutral-refactor |
| `n01-benign-rewording` | http://localhost:5273/?app=a01-landing&variant=n01-benign-rewording |

Usar el build estatico, no el comando `harness`: el servidor de desarrollo
inyecta actividad ajena a la aplicacion. `--service-ports` publica el puerto del
contenedor; `--host 0.0.0.0` permite entrar desde Windows. El puerto 5273 debe
estar libre. Si falla el arranque, revisar Docker, el resultado del build y esas
dos opciones. No usar solamente `/`: hay que seleccionar `app` y `variant`.

Para terminar, volver a la terminal del servidor, presionar Ctrl+C y ejecutar
`exit` para salir del contenedor.

## 3. Preparar la evidencia

1. Crear una carpeta `docs/benchmark-verification/a01-landing/` Dentro crear documentos con los cinco identificadores de variante
   de la tabla anterior y un informe `README.md`.
2. Registrar fecha/hora, rama, commit, cambios locales, Windows, navegador y version,
   NVDA y version, idioma, zoom, dimensiones del viewport y escala de pantalla.
   Mantenerlos iguales en cada par. Usar zoom 100 % y una ventana de tamano fijo.
3. Configurar la captura antes de empezar. Por ejemplo, usar Grabacion de pantalla
   de Recortes de Windows, si esta disponible. Iniciar la grabacion antes del
   paso 1; debe mostrar la aplicacion y permitir seguir el foco. Para el lector,
   verificar que el metodo elegido captura su audio o conservar su transcripcion.
4. Tomar PNG con Win+PrtScn, o el equivalente del equipo, sin hacer clic fuera de
   la pagina. Normalmente se guardan en Imagenes/Capturas de pantalla. Mover y
   renombrar los archivos despues del recorrido para no alterar el foco.
   Si el atajo cambia el foco, usar otro metodo y registrar cual.
5. Conservar originales. Usar copias separadas para flechas o anotaciones. Evitar
   contenido personal del escritorio y mantener el mismo encuadre en cada par.
6. Para los anuncios, iniciar NVDA y abrir su menu, Herramientas, Visualizador de
   voz (Tools > Speech Viewer). Hacerlo antes del recorrido y devolver el foco al
   navegador. Delimitar en el registro la hora de inicio/fin de cada variante para
   no confundir mensajes anteriores con anuncios nuevos.

Una captura no demuestra por si sola un salto de foco ni la ausencia de voz.
Conservar la grabacion o una bitacora de teclas/foco y la salida de NVDA.
No dejar DevTools abierto durante el recorrido. Inspeccionar semantica en una
segunda pasada, despues de registrar el comportamiento.

### Orden de ejecucion y estado inicial (S00)

Ejecutar los 11 pasos completos en este orden: `base`, `m01-kbd-activation`,
`m02-status-silent`, `m03-neutral-refactor`, `n01-benign-rewording`.
Repetir la base si cambia el entorno, el lector o el metodo de captura.

Antes de cada variante, abrir su URL completa en una pestana nueva. Comprobar
pagina arriba, FAQ cerrado, correo vacio, sin error ni confirmacion. Iniciar la
grabacion y tomar `<variante>__s00__inicial.png`. Para `base` y `n01`, incluir
Servicios; si no cabe, tomar una captura adicional de Servicios y volver arriba
antes del paso 1. No hacer clic en controles para establecer el foco inicial.

Tras cargar desde la barra de direcciones, el primer Tab debe entrar al enlace
de salto. Si el navegador recorre su interfaz o conserva otro foco, restablecer
el inicio y registrar la diferencia; no contar Tabs adicionales como pasos del
benchmark. No activar los enlaces de navegacion durante los pasos 1 a 4.

## 4. Recorrido numerado del benchmark

Los numeros siguientes corresponden exactamente a los 11 elementos de
`scenario.steps`. Los nombres de captura llevan el identificador completo de la
variante, por ejemplo `base__s05__faq-abierto.png`. Guardarlos en su subcarpeta.
La grabacion cubre todos los pasos; las capturas indicadas son los puntos minimos.

| Paso | Accion concreta | Resultado que observar y evidencia |
| --- | --- | --- |
| 1 | Presionar Tab una vez. | Foco en **Saltar al contenido**. Registrar foco, sin activar el enlace. |
| 2 | Presionar Tab una vez. | Foco en **Servicios**. Registrar en la grabacion. |
| 3 | Presionar Tab una vez. | Foco en **Preguntas frecuentes**. Registrar en la grabacion. |
| 4 | Presionar Tab una vez. | Foco en **Contacto**. Tomar `<variante>__s04__contacto-foco.png`. |
| 5 | Hacer clic con el raton en la primera pregunta: **¿Cuánto tarda una auditoría?** | Aparece **Entre dos y cuatro semanas, según la cantidad de flujos a revisar.** en todas las variantes, incluso `m01`. Registrar donde queda el foco y tomar `<variante>__s05__faq-abierto.png`. Ver la aclaracion de abajo. |
| 6 | Poner foco en **Correo electrónico**, haciendo clic dentro del campo. | Campo enfocado. Equivale al destino de `focus` en `[data-testid=email]`; registrar el foco. |
| 7 | Dentro del campo, Ctrl+A y escribir `correo-sin-arroba`. No enviar todavia. | Valor exacto indicado, aun sin validacion por envio. Registrar el valor en la grabacion. |
| 8 | Hacer clic en **Enviar consulta**. | Aparece **El correo electrónico debe incluir una arroba.** en todas las variantes. Registrar el anuncio/error con NVDA y tomar `<variante>__s08__error.png`. |
| 9 | Volver al campo, Ctrl+A y escribir `persona@ejemplo.com`. No enviar todavia. | Valor corregido. El error anterior puede seguir visible: la validacion se actualiza al enviar, no al escribir. |
| 10 | Hacer clic en **Enviar consulta** y no mover el foco despues. | Desaparece el error y aparece **Mensaje enviado. Respondemos en un plazo de dos días hábiles.** en todas las variantes. En `base`, `m01`, `m03` y `n01` se espera anuncio automatico; en `m02` falta. Tomar `<variante>__s10__enviado.png` sin interrumpir la voz. |
| 11 | No interactuar durante al menos 200 ms, como `settle` del escenario. | Mantener el estado y tomar `<variante>__s11__estable.png`. Para la observacion humana de NVDA, continuar sin interactuar al menos 5 segundos adicionales o hasta terminar la voz de la base; usar la misma ventana en ambos lados y registrarla. Guardar transcripcion/grabacion. |

El paso 5 usa el selector
`#preguntas .a11y-disclosure:first-of-type > *:first-child`.
Los pasos 8 y 10 usan `[data-testid=enviar]`.
El clic manual del paso 6 aproxima el foco programatico y la escritura manual
aproxima `fill`; este recorrido reproduce el flujo, no una traza identica de
eventos de bajo nivel. No insertar pasos de teclado adicionales en la numeracion.

### Diferencia esperada en el paso 5: `m01`

`groundTruth.expectedStep` es **5**, pero la accion registrada es **clic**, no
Enter. La descripcion de evidencia del manifiesto menciona activacion por
teclado; no confundir esa descripcion con la accion realmente ejecutada.

En la base, el disparador es un boton con `aria-expanded`. En `m01` es un `div`
con clic, sin semantica de boton ni estado expandido. Ambos abren con raton.
En Windows Chromium normalmente el clic enfoca el boton de la base, mientras que
el `div` no recibe ese foco; registrar el resultado real del navegador usado.
Una imagen del panel abierto no prueba la regresion de teclado: ejecutar tambien
la seccion 5. No sustituir el clic del paso 5 por Enter y llamarlo el mismo escenario.

### Diferencia esperada en el paso 10: `m02`

La confirmacion visible debe coincidir entre base y mutante. La base actualiza
una region `role="status"`, `aria-live="polite"`; `m02` muestra el texto en un
`div` sin esa semantica. No usar lectura completa, mover foco al mensaje ni
explorarlo con el lector para provocar una lectura: se prueba el anuncio
**automatico** posterior al envio.

Conservar voz y foco desde antes del clic hasta finalizar la ventana de espera.
Registrar donde queda el foco tras el clic y mantener la misma condicion en ambos
lados. Los 200 ms del benchmark no son un limite de aprobacion de NVDA: un anuncio
polite puede esperar a que termine otra locucion. Si la base no anuncia de forma
reproducible, el resultado es **inconcluso**, no una regresion confirmada.

## 5. Prueba complementaria de teclado para `m01`

Esta prueba requiere recargas separadas. Sus identificadores K01-K06 **no** son
pasos nuevos de `scenario.steps`. Realizarla con NVDA apagado para aislar Tab y
la activacion nativa del navegador; no confundir cursor virtual con foco DOM.

| ID | Accion | Resultado y captura |
| --- | --- | --- |
| K01 | Abrir `base` limpia y repetir los cuatro Tabs de los pasos 1-4. | Foco en Contacto; FAQ cerrado. Iniciar registro de teclas/foco. |
| K02 | Presionar un quinto Tab. | Foco en la primera pregunta del FAQ. Capturar `base__k02__faq-foco.png`. |
| K03 | Presionar Enter. | Aparece la respuesta y el foco permanece en el boton. Capturar `base__k03__faq-abierto.png`. |
| K04 | Presionar Espacio. | Respuesta cerrada, foco en el mismo boton. Capturar `base__k04__faq-cerrado.png`. |
| K05 | Abrir `m01` limpia. Repetir los cuatro Tabs y luego un quinto Tab. Despues presionar Shift+Tab. | El quinto Tab llega al correo, saltando las tres preguntas; Shift+Tab vuelve a Contacto. Capturar `m01-kbd-activation__k05__correo-foco.png` antes de retroceder y registrar ambos movimientos. No presionar Enter sobre correo como si activara el FAQ. |
| K06 | Solo despues de guardar la falla de teclado, hacer clic en la primera pregunta de `m01`. | La respuesta abre con raton. Capturar `m01-kbd-activation__k06__faq-clic.png`. |

Repetir K01-K04 con cada control usando su URL e identificador en los nombres:
`m03` y `n01` deben conservar la operacion. Si la base falla, investigar el entorno
y marcar inconcluso. Una captura del campo de correo no demuestra por si sola
que el FAQ fue saltado: adjuntar secuencia de foco o grabacion.

## 6. Comparaciones sin regresion y criterios de decision

- **`m01`:** confirmar WCAG 2.1.1 solo si la base permite K02-K04 y el mutante
  falla K05, aunque K06 funcione. Relacionar el hallazgo con el paso declarado 5.
- **`m02`:** confirmar WCAG 4.1.3 solo si la base anuncia tras el paso 10 y el
  mutante no, bajo las mismas condiciones. La validacion del paso 8 debe seguir
  funcionando. Adjuntar ambas transcripciones, no solamente imagenes iguales.
- **`m03`:** comparar capturas de FAQ abierto, error y envio con la base;
  comprobar tambien foco y voz. El contenedor adicional del refactor no implica
  por si mismo una regresion.
- **`n01`:** comparar las capturas de Servicios del estado S00. Se esperan
  titulos y descripciones distintos, pero conservar niveles de encabezados,
  navegacion y operacion de FAQ/formulario. Revisar encabezados en una pasada
  aparte con el lector o panel de accesibilidad y registrar la observacion.
- Si no aparece la falla esperada, registrar **no reproducida** con evidencia.
  Si el entorno o la base no permiten decidir, registrar **inconcluso**.
  Para controles, usar **sin regresion observada en los flujos probados**;
  esto no certifica toda la accesibilidad de la pagina.

## 7. Informe y lista de cierre

Completar el informe en la carpeta de evidencia, en espanol, sin sustituir los
resultados reales por las etiquetas esperadas. Registrar para cada par las dos
URLs completas, estado inicial, acciones, resultado antes/despues, WCAG cuando
aplique, condiciones de foco/voz, ventana de observacion y limitaciones.
Enlazar los archivos reales con rutas relativas al informe.

| Par base contra | Paso esperado | Observado antes/despues | Teclado | Anuncio | Archivos | Veredicto |
| --- | --- | --- | --- | --- | --- | --- |
| `m01-kbd-activation` | 5 + K01-K06 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| `m02-status-silent` | 10 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| `m03-neutral-refactor` | No aplica | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| `n01-benign-rewording` | No aplica | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

- [ ] Entorno, revision y cambios locales registrados.
- [ ] Recorrido 1-11 completado desde estado limpio en las cinco variantes.
- [ ] Capturas S00, S04, S05, S08, S10 y S11 guardadas por variante.
- [ ] Antes/despues de Servicios guardado para el cambio benigno.
- [ ] Prueba K01-K06 con secuencia de foco y capturas adjunta.
- [ ] Teclado de ambos controles comparado con la base.
- [ ] Voz de base/mutantes y controles delimitada y guardada.
- [ ] Diferencia entre el clic del paso 5 y la prueba de teclado explicada.
- [ ] Veredictos respaldados por archivos; limites e inconclusos declarados.

## 8. Verificacion automatizada complementaria

Opcional para contrastar la evidencia manual con las trazas del benchmark. En
otra terminal del anfitrion, desde la raiz del repositorio, ejecutar:

```powershell
docker compose run --rm lab bash
```

Dentro de ese contenedor, con el build de la seccion 2 ya generado:

```bash
pnpm --filter @a11y-lab/benchmark verify-gt a01-landing
```

El verificador inicia su propio servidor interno. Guardar la salida completa y
version del navegador en el informe. Se esperan cuatro pares verificados, ruido
base nulo, divergencia en `m01`, `m02` y `n01`, y ninguna en `m03`. La divergencia
benigna de `n01` es esperada y no significa regresion. La comprobacion tambien
valida metadatos y evidencia en los pasos declarados; no sustituye escuchar NVDA.

Las mediciones citables usan el Chromium fijado por el contenedor. No desactivar
su control de version. Las observaciones en Chrome/Edge de Windows son evidencia
manual complementaria, con sus versiones declaradas, no mediciones equivalentes.
Una pasada estatica sin hallazgos tampoco descarta estas regresiones dinamicas.

Si se necesitan trazas persistentes, ejecutar dentro del contenedor:

```bash
pnpm --filter @a11y-lab/benchmark capture-all a01-landing
```

Guarda JSON en `packages/benchmark/data/traces/a01-landing/<variante>.json`,
**no capturas de pantalla**. Los archivos existentes se omiten; no usar `--force`
sin decidir expresamente regenerarlos. Registrar si una traza ya existia para no
atribuirla a la sesion actual. Ningun comando de esta guia implica que las pruebas
ya hayan sido ejecutadas.