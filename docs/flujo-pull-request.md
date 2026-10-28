# Flujo de Pull Requests — OE4

Verificación del prototipo en su contexto de uso previsto: un cambio propuesto,
dos versiones, el mismo escenario sobre las dos y un veredicto en la revisión.

Hay **un solo motor** y **dos frentes**. El motor, `scripts/pr-core.ts`, recibe
dos directorios ya compilados y no sabe de dónde salieron. Los frentes se
diferencian únicamente en cómo consiguen esos dos directorios:

| Frente | Cómo obtiene los dos lados | Para qué sirve |
| --- | --- | --- |
| Simulador local, `scripts/pr-check.ts` | `git archive` de dos referencias a directorios temporales, o el árbol de trabajo tal como está | Mientras se escribe el cambio, sin depender de GitHub |
| Workflow, `.github/workflows/a11y-regression.yml` | Dos checkouts, base y modificado | Revisión real sobre un Pull Request |

Esa separación es deliberada: si cada frente tuviera su propia lógica de
medición, los dos reportes podrían diferir y ninguno sería evidencia de nada.

## Qué hace, en orden

1. Resuelve qué aplicaciones toca el cambio a partir de la lista de archivos
   modificados. Un cambio en `packages/ui/` alcanza a todas, porque es base
   común.
2. Compila los dos lados y los sirve en dos puertos a la vez.
3. Ejecuta el mismo escenario sobre cada lado y captura las dos trazas.
4. Normaliza, alinea y compara.
5. Si no hay divergencia, la compuerta determinista resuelve sin consultar al
   modelo.
6. Si hay divergencia, construye la evidencia de la estrategia diferencial de
   trazas y pide un veredicto.
7. Emite un reporte en Markdown, idéntico por los dos caminos.

## Tres controles sin los cuales el flujo miente

**La aplicación no existe en el lado base.** Es nueva: no hay con qué comparar y
se reporta como tal. Sin este control, toda aplicación agregada por un Pull
Request aparecería como una regresión.

**El cambio alteró el escenario.** La comparación se **rechaza**. La
equivalencia del recorrido entre los dos lados es la condición que hace
comparables las dos trazas; sin ella, cualquier diferencia observada es
indistinguible de un cambio de recorrido. Es el único caso en que el flujo se
niega a dar un veredicto en lugar de darlo con reservas.

**El cambio toca el framework de captura.** Lo que cambió es el instrumento de
medición y no la aplicación, de modo que una diferencia de trazas no es una
regresión del producto. Se reporta como advertencia junto al resultado.

## Código de salida

Vale 1 solo cuando hay una regresión o cuando la revisión no se pudo completar.
Un cambio con diferencias que el modelo juzga inocuas **no** rompe el pipeline:
el método no es un oráculo, y bloquear integraciones por un juicio con la
precisión medida en el Capítulo 4 lo volvería inservible en la práctica. La
decisión de qué hacer con el hallazgo queda en la revisión humana, que es la
posición que el estudio le asigna al enfoque.

## Por qué el workflow exige ejecutor autoalojado

Los cuatro modelos del estudio corren localmente sobre la tarjeta gráfica del
equipo de medición, de modo que un ejecutor alojado por GitHub no puede
consultarlos. Todo lo demás sí correría en cualquier ejecutor: compilar,
capturar, normalizar, comparar y la compuerta determinista. Para esa variante,
agregar `--sin-modelo` y quitar las variables de Ollama; el reporte pierde el
veredicto y conserva la localización de las transiciones con diferencias.

Variables del ejecutor: `A11Y_OLLAMA_URL` y `A11Y_PR_MODEL`, ambas con valor por
omisión en el workflow. El modelo es uno solo y no cuatro: comparar familias es
objeto del experimento, no de la verificación de un cambio.

## Uso local

```bash
# El cambio que estoy escribiendo, contra el último commit
pnpm --filter @a11y-lab/benchmark build
pnpm --filter @a11y-lab/benchmark pr-check

# Dos referencias entre sí, sin consultar modelos
pnpm --filter @a11y-lab/benchmark pr-check --base main --head mi-rama --sin-modelo

# Con un modelo concreto
pnpm --filter @a11y-lab/benchmark pr-check --model phi35
```

El modo por omisión compara `HEAD~1` contra el árbol de trabajo ya compilado,
que es el caso de quien está escribiendo el cambio. Pasar `--head <ref>` compara
dos referencias entre sí, que es el caso de la revisión.

`git archive` se usa en lugar de `git worktree` a propósito: no escribe nada
dentro de `.git` y por tanto no deja metadatos que limpiar. En una carpeta donde
el borrado está restringido, un `worktree remove` que falla deja el repositorio
con referencias a árboles que ya no existen.
