# Correr el framework en GitHub Actions

Esta guía explica cómo dejar el framework corriendo en un Pull Request, elegir
qué modelo usa (o ninguno) y recibir el reporte como comentario.

**Nada de esto cambia las mediciones del estudio.** Las cifras del documento se
obtienen con `analysis.config.json` y los cuatro modelos locales, y ese camino
no se toca. Lo que sigue es una vía opcional, activada solo si defines las
variables que se describen abajo.

## Qué hace el workflow

En cada Pull Request que toque `packages/benchmark/apps/`, `packages/ui/` o
`packages/framework/`:

1. Hace dos checkouts: la base del Pull Request y el cambio.
2. Compila los dos lados y corre el mismo escenario de interacción en cada uno.
3. Normaliza, alinea y compara las trazas.
4. Si no hay diferencias, la compuerta determinista resuelve sin consultar nada.
5. Si hay diferencias, construye la evidencia y, según el modo, pide un veredicto
   a un modelo.
6. Publica **un solo comentario** en el Pull Request, que se actualiza en cada
   empuje, con el reporte.

El paso termina con error solo si hay una regresión o si la comprobación no se
pudo completar. Un cambio con diferencias que el modelo juzga inocuas no rompe
el pipeline: la decisión final queda en la revisión humana.

El workflow es `.github/workflows/a11y-regression.yml`.

## Los tres modos

| Modo | Dónde corre | Quién da el veredicto | Qué necesitas |
| --- | --- | --- | --- |
| **A. Original** | Ejecutor propio con GPU | Un modelo local en Ollama, de `analysis.config.json` | Un ejecutor autoalojado con etiqueta `a11y-lab` y Ollama |
| **B. Con API** | Ejecutor de GitHub (o propio) | El modelo que tú indiques: OpenAI, Anthropic, Groq, OpenRouter, un Ollama remoto, etc. | 2 a 4 variables y un secreto |
| **C. Sin modelo** | Ejecutor de GitHub | Nadie: el reporte localiza los pasos con diferencias, sin veredicto | 2 variables |

Si no defines ninguna variable, el workflow funciona como el modo A, igual que
antes.

## Configuración, paso a paso

Todo se configura en el repositorio de GitHub, en **Settings > Secrets and
variables > Actions**. Las **variables** van en la pestaña *Variables* y la clave
de la API en la pestaña *Secrets*. No hay que editar el archivo del workflow.

### Modo C: sin modelo (el más rápido para probar)

Variables:

| Nombre | Valor |
| --- | --- |
| `A11Y_RUNS_ON` | `["ubuntu-22.04"]` |
| `A11Y_PLAYWRIGHT_DEPS` | `true` |
| `A11Y_MODE` | `no-model` |

Abre un Pull Request que modifique una app de `packages/benchmark/apps/` y el
comentario aparece con las transiciones donde difieren los dos lados.

### Modo B: con un modelo por API

Además de `A11Y_RUNS_ON` y `A11Y_PLAYWRIGHT_DEPS` (iguales que en el modo C, y
**sin** `A11Y_MODE`), define las variables del modelo. Todas empiezan con
`A11Y_LLM_`.

| Variable | Obligatoria | Qué es | Por omisión |
| --- | --- | --- | --- |
| `A11Y_LLM_PROVIDER` | Sí | `openai`, `anthropic` u `ollama` | (ninguno: se usa el modo A) |
| `A11Y_LLM_MODEL` | Sí | Nombre del modelo tal como lo pide la API | |
| `A11Y_LLM_BASE_URL` | No | Raíz de la API, sin barra final | La oficial de cada proveedor |
| `A11Y_LLM_LABEL` | No | Nombre que aparece en el reporte | El modelo |
| `A11Y_LLM_ID` | No | Identificador interno | El modelo |
| `A11Y_LLM_TIMEOUT_MS` | No | Tope por consulta | `120000` |
| `A11Y_LLM_MAX_TOKENS` | No | Tope de la respuesta | `2048` |
| `A11Y_LLM_TEMPERATURE` | No | Número, o `omit` para no enviarla | `0` |
| `A11Y_LLM_JSON_MODE` | No | `true` activa `response_format: json_object` (solo `openai`) | `false` |
| `A11Y_LLM_NUM_CTX` | No | Ventana de contexto (solo `ollama`) | `26624` |

Secreto (pestaña *Secrets*):

| Nombre | Qué es |
| --- | --- |
| `A11Y_LLM_API_KEY` | La clave de la API. Obligatoria para `anthropic` y para `openai` salvo que apuntes a un servidor propio sin clave |

El valor `openai` significa "API con formato Chat Completions de OpenAI", así
que sirve para cualquier servicio compatible, no solo OpenAI.

#### Ejemplos

**OpenAI**

```
A11Y_LLM_PROVIDER = openai
A11Y_LLM_MODEL    = <nombre del modelo>
secret A11Y_LLM_API_KEY = <tu clave>
```

**Anthropic**

```
A11Y_LLM_PROVIDER = anthropic
A11Y_LLM_MODEL    = <nombre del modelo>
secret A11Y_LLM_API_KEY = <tu clave>
```

**Otro servicio compatible con OpenAI** (Groq, Together, OpenRouter, Mistral,
DeepSeek, Azure OpenAI, etc.): el mismo `openai`, cambiando la URL.

```
A11Y_LLM_PROVIDER = openai
A11Y_LLM_BASE_URL = <raíz de la API del servicio, normalmente termina en /v1>
A11Y_LLM_MODEL    = <nombre del modelo en ese servicio>
secret A11Y_LLM_API_KEY = <tu clave>
```

**Un Ollama tuyo, accesible por red** (por ejemplo, un servidor con GPU):

```
A11Y_LLM_PROVIDER = ollama
A11Y_LLM_BASE_URL = http://mi-servidor:11434
A11Y_LLM_MODEL    = llama3.1:8b
```

El ejecutor de GitHub tiene que poder alcanzar esa dirección. Si el servidor
está en tu red privada, usa un ejecutor propio (modo A) o expón el servicio de
forma segura.

**Un servidor propio sin clave** (vLLM, LM Studio): `openai` con
`A11Y_LLM_BASE_URL` y sin secreto.

### Modo A: ejecutor propio con GPU (el original)

1. Instala Ollama en el equipo y descarga el modelo (`ollama pull llama3.1:8b`).
2. Registra el equipo como ejecutor autoalojado del repositorio (Settings >
   Actions > Runners) con la etiqueta `a11y-lab`.
3. No definas ninguna variable. Opcionales: `A11Y_OLLAMA_URL` (por omisión
   `http://127.0.0.1:11434`) y `A11Y_PR_MODEL` (por omisión `llama31-8b`, uno de
   los ids de `analysis.config.json`).

## Probar la conexión antes de abrir un Pull Request

Para no descubrir una clave mal puesta en mitad de una revisión, el repositorio
trae una comprobación que hace una sola consulta pequeña al modelo configurado:

```bash
A11Y_LLM_PROVIDER=openai \
A11Y_LLM_MODEL=<modelo> \
A11Y_LLM_API_KEY=<clave> \
  pnpm --filter @a11y-lab/benchmark llm-check
```

Imprime el proveedor, la latencia, los tokens y el veredicto que obtuvo, y
termina con `La conexión funciona.` si todo está bien. Nunca imprime la clave.
Dentro del contenedor del proyecto, antepón
`docker compose run --rm -e A11Y_LLM_PROVIDER -e A11Y_LLM_MODEL -e A11Y_LLM_API_KEY lab`.

Para comprobar el código de los proveedores sin red ni claves reales:

```bash
pnpm --filter @a11y-lab/analysis check:providers
```

## Qué verás en el Pull Request

Un comentario con la marca `a11y-regresiones-dinamicas` que se actualiza en
cada empuje. Incluye, por aplicación afectada: si no hubo diferencias, cuáles
fueron los pasos que difieren, y, en los modos A y B, el veredicto del modelo con
su categoría, el paso y la evidencia. El reporte también indica qué modelo lo
produjo.

## Seguridad y costos

- La clave vive solo como **secreto** de GitHub. El código la redacta de
  cualquier mensaje de error, de modo que no aparece en el registro de la corrida.
- Los Pull Requests desde **forks** no reciben los secretos del repositorio. En
  ese caso la consulta al modelo fallará por falta de clave; usa el modo C o
  revisa el cambio desde una rama del propio repositorio.
- Los proveedores `openai` y `anthropic` **cobran por uso**. Cada aplicación
  afectada con diferencias hace una consulta, y un cambio en `packages/ui/`
  alcanza a todas las apps. Un solo modelo por corrida mantiene el costo bajo; el
  límite de 45 minutos del workflow acota el peor caso.
- `concurrency` cancela la corrida anterior cuando llega un empuje nuevo al mismo
  Pull Request.

## Resolución de problemas

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El job no arranca y queda "Waiting for a runner" | `A11Y_RUNS_ON` sin definir y no hay ejecutor `a11y-lab` | Define `A11Y_RUNS_ON` con `["ubuntu-22.04"]` o registra un ejecutor propio |
| Falla `playwright install` por librerías del sistema | Falta `A11Y_PLAYWRIGHT_DEPS` en un ejecutor de GitHub | Define `A11Y_PLAYWRIGHT_DEPS=true` |
| La medición aborta por versión de Chromium | El navegador instalado no es el fijado en `environment.json` (130.0.6723.31) | No actualices Playwright; el repo fija la versión a propósito |
| `Configuración del modelo inválida: ...` | Falta una variable o tiene un valor no válido | El mensaje dice cuál; revisa la tabla de variables |
| `La API respondió 401` | Clave incorrecta o sin permisos | Revisa el secreto `A11Y_LLM_API_KEY` |
| `La API respondió 404` | Modelo o URL incorrectos | Revisa `A11Y_LLM_MODEL` y `A11Y_LLM_BASE_URL` |
| `se cortó por longitud` | La respuesta no cabe en el tope | Sube `A11Y_LLM_MAX_TOKENS` |
| `La API respondió 400` con un modelo nuevo | El modelo no acepta `temperature` | Define `A11Y_LLM_TEMPERATURE=omit` |
| El reporte dice que no completó | La comparación no produjo reporte | Mira el registro de la corrida, paso "Comparación diferencial" |

## Usarlo en otro repositorio

El framework **no se copia** al repositorio nuevo. Ese repositorio mantiene solo
dos cosas suyas y llama al workflow reutilizable de este (`a11y-reusable.yml`),
que descarga el framework durante la corrida:

```
tu-repositorio/
├── a11y-lab.json                          # tus recorridos (Paso 1)
└── .github/workflows/accesibilidad.yml    # el llamador de ~25 líneas (Paso 2)
```

En cada Pull Request el workflow compila la base y el cambio con tus comandos,
corre tus recorridos sobre las dos compilaciones, compara con el mismo motor y la
misma compuerta del estudio, y comenta el resultado. Con `mode: no-model` no
consulta ningún modelo.

### Paso 1: `a11y-lab.json`

Un ejemplo completo está en [`ejemplos/a11y-lab.json`](ejemplos/a11y-lab.json).

| Campo | Obligatorio | Qué es |
|---|---|---|
| `apps[].id` | sí | Identificador estable (minúsculas, dígitos, `.`, `-`, `_`). Une el recorrido de la base con el del cambio. |
| `apps[].title` | no | Nombre legible para el reporte. |
| `apps[].path` | no | Ruta inicial en la compilación; por omisión `/`. Puede llevar hash: `/#/cuenta`. |
| `apps[].watch` | no | Prefijos de carpeta cuyo cambio afecta a esta aplicación. Sin `watch`, cualquier cambio no ignorado la afecta. |
| `apps[].scenario.steps` | sí | El recorrido: lista de pasos. |
| `ready` | no | Cómo se decide que la página está lista (ver abajo). |
| `ignore` | no | Cambios que no afectan a nada. `*.md` es una extensión; lo demás es un prefijo. Por omisión: `.github/`, `docs/`, `*.md`, `*.mdx`, `LICENSE`. |
| `readyTimeoutMs` | no | Espera máxima a la señal de listo. |

Los pasos son los del framework:

| `action` | Campos | Qué hace |
|---|---|---|
| `focus` | `selector` | Pone el foco en el elemento. |
| `fill` | `selector`, `value` | Escribe en un campo. |
| `click` | `selector` | Hace clic. |
| `press` | `key` | Pulsa una tecla del teclado (`Tab`, `Enter`, `Space`, `Escape`, ...). |
| `settle` | `ms` | Espera sin hacer nada. |

Todos aceptan `ms` para cambiar la pausa posterior (150 ms por omisión).

El archivo se valida al empezar: un campo mal escrito detiene la corrida con un
mensaje que dice cuál y por qué.

### Paso 2: el llamador

Copia [`ejemplos/a11y-llamador.yml`](ejemplos/a11y-llamador.yml) como
`.github/workflows/accesibilidad.yml` y ajusta los tres valores de tu
aplicación:

| Entrada (`with:`) | Por omisión | Para qué |
|---|---|---|
| `install-command` | `npm ci` | Instala las dependencias (`pnpm install --frozen-lockfile`, `yarn --immutable`, ...). |
| `build-command` | `npm run build` | Compila la aplicación. |
| `dist-dir` | `dist` | Carpeta de la compilación (`build`, `out`, ...). |
| `config-file` | `a11y-lab.json` | Ruta del archivo de recorridos. |
| `mode` | `model` | `model` o `no-model`. |
| `node-version` | `22` | Mínimo 20.11. |
| `runs-on` | `["ubuntu-22.04"]` | Ejecutor, como lista JSON. |
| `playwright-deps` | `true` | Dependencias del sistema de Chromium (déjalo en `true` en ejecutores de GitHub). |
| `fail-on-regression` | `true` | Falla la comprobación si se reporta una regresión. |
| `framework-ref` | `main` | Rama, etiqueta o commit del framework. Una etiqueta (por ejemplo `estudio-v1`) hace las corridas reproducibles. |

La aplicación debe compilarse para servirse desde la raíz (`/`). Si usa una ruta
base (por ejemplo `base: '/mi-repo/'` en Vite), compílala con la raíz en el
`build-command`.

### Paso 3: el modelo

Es el mismo mecanismo de [Modo B](#modo-b-con-un-modelo-por-api) y
[Modo C](#modo-c-sin-modelo-el-más-rápido-para-probar). En el repositorio nuevo,
en Settings > Secrets and variables > Actions:

- Variables: `A11Y_LLM_PROVIDER`, `A11Y_LLM_MODEL`, y las que necesite
  (`A11Y_LLM_BASE_URL`, ...). Cada una también puede pasarse como entrada
  (`llm-provider`, `llm-model`, ...), que tiene prioridad sobre la variable.
- Secreto: `A11Y_LLM_API_KEY`, que el llamador reenvía en `secrets:`.
- O `mode: no-model` (o la variable `A11Y_MODE=no-model`) para no usar ninguno.

Con `model`, antes de comparar se hace una consulta mínima de prueba
(`llm-check`): si la clave o la URL están mal, la corrida falla en un minuto y
con un mensaje claro, no después de compilar y capturar todo.

### Paso 4: si el framework es un repositorio privado

Dos cosas, y las dos hacen falta:

1. En el repositorio del framework: Settings > Actions > General > Access, para
   permitir que otros repositorios de la organización usen sus workflows.
2. Un secreto `FRAMEWORK_TOKEN` en el repositorio nuevo, con un token (fine-grained)
   que tenga permiso de lectura de contenido (*Contents: Read*) sobre el
   repositorio del framework. El token de la corrida solo alcanza al repositorio
   que la dispara, de modo que no puede descargar el framework.

Si el framework es público, no hace falta nada de esto.

### Cómo se decide que la página está lista

Las aplicaciones del benchmark avisan al framework poniendo
`data-harness-ready="true"` en `<html>`. Una aplicación ajena no lo hace, así
que el servidor que sirve la compilación inyecta un script mínimo que lo pone
cuando la página terminó de cargar, existe el elemento de `ready.selector` (si lo
indicas) y el DOM estuvo quieto `ready.quietMs` (300 ms por omisión). No cambia
tu marcado ni instrumenta nada.

```json
"ready": { "selector": "#root > *", "quietMs": 300, "timeoutMs": 10000 }
```

Pon un `selector` si tu aplicación tarda en montar o carga datos. Si prefieres que
la propia aplicación señale cuándo está lista, usa `"ready": { "mode": "app" }`
y haz que ponga `data-harness-ready="true"` (o `data-harness-error="motivo"` si
falla).

### Cómo se eligen las aplicaciones afectadas

El workflow calcula los archivos modificados entre la base y el cambio. Se
descartan los de `ignore`. Una aplicación se evalúa si cambió algún archivo bajo
sus prefijos `watch` (o cualquiera, si no los declaró). Si lo que cambió es el
propio `a11y-lab.json`, se evalúan todas las aplicaciones, de modo que un
recorrido modificado se reporte como tal.

Cada lado trae su propia copia del archivo. Si el cambio altera el recorrido de
una aplicación, no se comparan trazas (serían de recorridos distintos) y el
reporte dice **No comparable**. En el primer Pull Request que agrega el archivo,
las aplicaciones aparecen como **Nueva**: aún no hay base con qué comparar.

### Cómo escribir buenos recorridos

- Usa selectores estables (`[data-testid=...]`, roles, ids) y no clases generadas.
- Haz que el recorrido visite el lugar donde puede estar el defecto: un recorrido
  que no pasa por un componente no puede detectar su regresión.
- Evita contenido que cambie solo entre corridas (fechas, aleatorios, animaciones
  largas): aparece como diferencia sin ser una regresión.
- La compilación se sirve de forma estática: lo que dependa de un servidor o de
  una sesión iniciada no se verá.

## Límites que conviene tener presentes

- **Las cifras del documento no se pueden comparar con las de otros modelos.**
  Los resultados del estudio corresponden a cuatro modelos locales con
  parámetros fijos. Un modelo por API puede dar otros resultados, y por eso esta
  vía sirve para revisar cambios, no para reproducir las mediciones.
- **El workflow `a11y-regression.yml` trabaja sobre la estructura de este
  repositorio** (las aplicaciones de `packages/benchmark/apps/`). Para otro
  repositorio se usa el workflow reutilizable, descrito en "Usarlo en otro
  repositorio". Eso no es una acción publicada en el Marketplace: se llama por
  su ruta y su rama o etiqueta.
- **El modo para otros repositorios sirve compilaciones estáticas.** No levanta
  tu backend ni inicia sesiones, y exige que la aplicación se sirva desde `/`.
- **Un cambio que es solo de estilos o de datos puede no aparecer.** Se evalúa
  lo que cambia en la estructura y los eventos de accesibilidad, no el aspecto.
- El veredicto de un modelo no es un oráculo: la decisión sobre el hallazgo queda
  en la persona que revisa.
