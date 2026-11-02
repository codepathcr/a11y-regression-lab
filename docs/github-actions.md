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

## Límites que conviene tener presentes

- **Las cifras del documento no se pueden comparar con las de otros modelos.**
  Los resultados del estudio corresponden a cuatro modelos locales con
  parámetros fijos. Un modelo por API puede dar otros resultados, y por eso esta
  vía sirve para revisar cambios, no para reproducir las mediciones.
- **El workflow trabaja sobre la estructura de este repositorio.** Compila las
  apps de `packages/benchmark/apps/`, cada una con su `app.json` y su escenario de
  interacción. Usarlo en un repositorio con otra estructura exige llevar esas
  piezas (el framework y el formato de aplicación) a ese repositorio. Hoy no está
  empaquetado como acción reutilizable.
- El veredicto de un modelo no es un oráculo: la decisión sobre el hallazgo queda
  en la persona que revisa.
