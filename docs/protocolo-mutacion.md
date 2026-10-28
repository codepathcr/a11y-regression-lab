# Protocolo de mutación — Instrumento 1

Define, para cada operador, la transformación exacta que aplica, el criterio
WCAG que compromete y el oráculo que determina la verdad de terreno del caso.
Su función es garantizar que cada par base-mutante del benchmark tenga una
etiqueta justificada y reproducible, y no una clasificación asignada a juicio de
quien construyó el caso.

Corresponde al Instrumento 1 de la sección 3.6 del documento, y debe estar
cerrado antes de ejecutar el benchmark completo.

---

## Criterios de admisión de una mutación

Una mutación entra al benchmark solo si cumple las cuatro condiciones. No son
formalidades: cada una descarta casos que parecen válidos y no lo son.

**1. Un solo módulo.** La variante mutante sustituye exactamente un componente
del mapa de partes de la app. La composición de la app nunca cambia. Así el diff
entre base y mutante es un módulo, igual que en un Pull Request real.

**2. Invisible al análisis estático.** La variante mutante debe pasar axe-core
**sin hallazgos**. No es un descuido: es la premisa del estudio. Si un validador
estático encuentra el defecto, el caso no sirve, porque ya está resuelto sin
necesidad de trazas ni de modelos de lenguaje. Un hallazgo de axe en un mutante
significa que la mutación está mal diseñada.

**3. Observable en la traza.** La transformación debe producir alguna diferencia
en la traza normalizada. Si no la produce, el defecto es real pero queda fuera
del alcance de cualquier método basado en trazas, y pertenece a la sección de
limitaciones y no al benchmark.

**4. Alcanzable por el escenario.** El recorrido de interacción de la app debe
visitar el lugar donde el defecto se manifiesta. Una mutación correcta en una
zona que el escenario no recorre produce cero diferencias por razones de
cobertura, no de evidencia.

La versión **base** debe pasar axe-core sin hallazgos por su cuenta: no se puede
medir una regresión contra una referencia ya rota.

---

## Las tres razones por las que una mutación puede no detectarse

La distinción importa porque las tres se ven igual en una tabla de resultados
—un cero— y significan cosas por completo distintas.

| Razón | Qué indica | Cómo se reconoce |
| --- | --- | --- |
| La evidencia no lleva la señal | Límite del modelo de traza | El diff da cero con cualquier escenario |
| El escenario no visita el defecto | Límite de la cobertura del recorrido | El diff da cero, pero da señal al extender el recorrido |
| El modelo no aprovecha la evidencia | Límite del modelo o de la consulta | El diff da señal y la estrategia falla |

El **mutation score**, definido como la proporción de mutantes que producen
alguna diferencia observable, mide las dos primeras **juntas**: acota el método
tal como está configurado, con este modelo de evidencia y estos escenarios, y no
el método en principio. Separarlas exige variar el escenario sobre el mismo
mutante. Conviene declararlo así y no presentar el mutation score como una
propiedad del enfoque.

---

## Operadores procedentes de Ma11y

Tres operadores tomados de Tafreshipour et al. (2024). El paper los define por
**nombre y categoría**, no por procedimiento: no detalla la transformación de
ninguno de los tres. La operacionalización que sigue es por tanto propia de este
estudio, y se declara como tal para no atribuir a Ma11y decisiones que no tomó.

### CTO — Change Tab Index Order

- **Categoría en el paper:** Operable / Navigable, falla F44
- **Criterio:** 2.4.3 Focus Order
- **Transformación:** se asigna `tabindex="-1"` a un enlace de la navegación,
  retirándolo del orden de tabulación. Sigue visible, sigue siendo un enlace y
  sigue funcionando con el ratón; deja de ser alcanzable por teclado.
- **Oráculo:** el enlace no aparece en la secuencia de foco de la traza, y el
  recorrido por teclado tiene una parada menos que en la base.
- **Por qué es invisible al análisis estático:** `tabindex="-1"` es marcado
  válido y de uso legítimo en muchos patrones, de modo que axe-core no lo
  reporta.

**Dos operacionalizaciones descartadas**, y el motivo de cada descarte es
material del protocolo:

- **`tabindex` positivo para invertir el orden.** axe-core la reporta como
  violación de gravedad seria: *"Elements should not have tabindex greater than
  zero"*. Incumple el criterio de admisión 2. Se descubrió al correr el chequeo
  de axe sobre la variante, no por revisión manual.
- **Reordenar visualmente con CSS conservando el orden del DOM.** Es invisible
  para axe-core, pero también para la traza: la traza registra la secuencia de
  foco y no la posición visual, de modo que el orden de tabulación no cambia y
  no hay diferencia que observar. Incumple el criterio 3. Queda anotada como
  **limitación conocida del modelo de evidencia**, y como posible línea de
  trabajo futuro si se incorporara posición visual a la traza.

### CCB — Change Context on Blur

- **Categoría en el paper:** Understandable / Predictable, falla F9
- **Criterio:** 3.2.1 On Focus
- **Transformación:** al abandonar un campo del formulario se inserta, **por
  encima de él**, un bloque de opciones con controles tabulables que antes no
  existía.
- **Oráculo:** altas de nodos interactivos y reordenamiento de la secuencia de
  foco inmediatamente después del `blur` del campo, ausentes en la base.
- **Por qué es invisible al análisis estático:** el marcado resultante es válido
  en todo momento; lo indebido es que el cambio ocurra sin que la persona lo
  pida.

### CCS — Change Context on Selection

- **Categoría en el paper:** Understandable / Predictable, falla F37
- **Criterio:** 3.2.2 On Input
- **Transformación:** seleccionar un valor en el combo de filtrado deja de
  filtrar la lista y pasa a navegar a otra vista.
- **Oráculo:** reemplazo completo del contenido y movimiento de foco asociado
  tras la selección, y divergencia del escenario en los pasos siguientes.
- **Por qué es invisible al análisis estático:** el marcado es válido en todo
  momento. Es el caso que el criterio 3.2.2 describe literalmente: cambiar el
  ajuste de un control no debe cambiar el contexto sin advertencia previa.

---

## Operadores propios

Los tres que la propuesta aprobada define como operadores nuevos.

### Eliminación de activación mediante teclado

- **Criterio:** 2.1.1 Keyboard
- **Transformación:** el disparador de un componente deja de ser un `<button>` y
  pasa a ser un `<div>` con manejador de clic, **sin atributos ARIA**.
- **Oráculo:** ausencia del evento de foco y del cambio de `aria-expanded` al
  intentar activar el control por teclado.
- **Nota de diseño:** la ausencia de ARIA es deliberada. Un `div` con
  `aria-expanded` y sin rol es ARIA inválido y un validador estático lo
  reportaría, lo que incumpliría el criterio de admisión 2.

### Pérdida de foco después de una actualización dinámica

- **Criterio:** 2.4.3 Focus Order
- **Transformación:** se elimina el efecto que mueve el foco al encabezado de la
  vista nueva cuando la vista cambia sin que la URL cambie.
- **Oráculo:** ausencia del movimiento de foco al encabezado tras cada cambio de
  vista.
- **Nota de diseño:** para que esta lógica sea mutable tuvo que vivir en una
  parte intercambiable y no en la composición de la app. En código real es la
  línea que alguien elimina por considerarla un efecto innecesario.

### Eliminación del anuncio accesible de un mensaje de estado

- **Criterio:** 4.1.3 Status Messages
- **Transformación:** el contenedor que recibe un mensaje de estado pierde
  `role="status"` y `aria-live`, y pasa a ser un `<div>` sin semántica.
- **Oráculo:** ausencia del evento de anuncio que la base sí produce en ese paso.
- **Nota de diseño:** el contenedor del mensaje se renderiza siempre, incluso
  vacío, tanto en la base como en el mutante. Una región live insertada junto
  con su contenido no se anuncia de forma fiable, y si la base dependiera de eso
  el par no mediría lo que dice medir.

---

## Controles negativos

Treinta y cuatro de los setenta y seis pares del benchmark no contienen una
regresión nueva, el 45% del conjunto, repartidos en tres clases: dieciocho
negativos de divergencia nula, diez de divergencia benigna y seis de defecto
preexistente. Sin ellos no existen verdaderos negativos y no puede calcularse la
tasa de falsos positivos comprometida en el objetivo específico cinco. Las tres
clases no son intercambiables: los de divergencia nula miden el instrumento,
porque la comparación determinista los resuelve antes de llegar al modelo; los
otros dieciséis son los únicos sobre los que la tasa de falsos positivos de las
estrategias diferenciales mide algo del modelo.

Un control negativo no es un cambio trivial. El que se construyó para
`a01-landing` extrae la validación a una función pura y envuelve los campos en
un contenedor de maquetación: cero cambio semántico, y sin embargo el contenedor
**desplaza la ruta en el DOM** de todo lo que envuelve. Con identidad
estructural produce casi 40% de divergencia falsa; con identidad semántica,
cero. Fue lo que decidió la regla de normalización.

Un control negativo que no toca la estructura no pone a prueba nada.

---

## Cobertura

| Criterio WCAG | Operadores que lo comprometen |
| --- | --- |
| 2.1.1 Keyboard | Eliminación de activación mediante teclado |
| 2.4.3 Focus Order | CTO · Pérdida de foco tras actualización dinámica |
| 3.2.1 On Focus | CCB |
| 3.2.2 On Input | CCS |
| 4.1.3 Status Messages | Eliminación del anuncio de mensaje de estado |

Los cinco criterios del alcance quedan cubiertos. Dos operadores comparten el
2.4.3, lo que permite comparar el desempeño entre dos defectos del mismo
criterio con manifestaciones distintas.

**Cumplido en el benchmark completo:** cada operador quedó representado entre
cuatro y nueve veces, sobre componentes anfitriones distintos y en aplicaciones
distintas, de modo que el resultado de un operador no es indistinguible del
comportamiento de un único componente. El reparto es: anuncio de estado 9, CTO 8,
pérdida de foco tras actualización 8, activación por teclado 7, CCB 6 y CCS 4.

---

## Referencia

Tafreshipour, M., Deshpande, A., Mehralian, F., Ahmed, I., & Malek, S. (2024).
Ma11y: A mutation framework for web accessibility testing. *Proceedings of the
33rd ACM SIGSOFT International Symposium on Software Testing and Analysis
(ISSTA '24)*, 100–111. https://doi.org/10.1145/3650212.3652113

> La tabla de operadores se consultó en la copia de los autores
> (https://seal.ics.uci.edu/publications/2024_ISSTA.pdf). **Verificado el 27 de
> octubre de 2026:** el artículo define 25 operadores y entre ellos figuran
> CTO (Change Tab Index Order, Operable / Navigable, falla F44), CCB (Change
> Context on Blur, Understandable / Predictable, falla F9) y CCS (Change Context
> on Selection, Understandable / Predictable, falla F37), con esos nombres
> exactos. Lo que el artículo NO da es el procedimiento ni el criterio de éxito:
> clasifica cada operador por pauta y por falla documentada de WCAG. La
> transformación concreta de los tres y la asignación de criterio de este
> protocolo son por tanto propias de este estudio.
>
> **Punto abierto:** CCB actúa al abandonar un campo, y este protocolo le asigna
> el criterio 3.2.1 Al recibir el foco, que regula lo que ocurre cuando un
> componente RECIBE el foco. La asignación es defendible —el bloque insertado
> aparece en el momento en que el foco pasa al componente siguiente— pero hay que
> escribir esa justificación aquí o remapear el operador.
