# @a11y-lab/ui

Primitivas atómicas accesibles con las que se construyen las aplicaciones del
benchmark.

## Por qué existe este paquete

No es solo para no repetir código. Una regresión introducida en una primitiva
compartida y manifestada en varias pantallas es **el escenario que justifica el
enfoque diferencial del estudio**: quien revisa el Pull Request ve un cambio de
tres líneas y no tiene forma de ver sus consecuencias, el validador estático no
reporta nada o reporta en el lugar equivocado, y la traza diferencial muestra la
manifestación en cada sitio de uso.

Ese caso solo existe si hay reutilización real. Con componentes copiados en cada
pantalla, el defecto queda local y el argumento se debilita.

## Requisito no negociable

Cada primitiva debe pasar **axe-core sin hallazgos** y ser operable por teclado
sin atributos adicionales. Son el instrumento de medición: una primitiva con un
defecto propio contamina todos los pares que la usan.

## Estado

Fase 0: el paquete existe vacío. La fase 1 define e implementa el conjunto de
primitivas.
