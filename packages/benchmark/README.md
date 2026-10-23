# @a11y-lab/benchmark

El aporte de datos del estudio: las aplicaciones de prueba, sus pares
base-mutante, y el harness que las sirve al framework.

## Composición prevista

Sesenta pares base-mutante repartidos por complejidad de la traza, para poder
reportar cómo se degrada cada estrategia a medida que la traza se alarga:

| Estrato | Apps | Mutaciones por app | Pares |
| --- | --- | --- | --- |
| Grandes | 2 | 10 | 20 |
| Medianas | 4 | 7 | 28 |
| Pequeñas | 4 | 3 | 12 |
| **Total** | **10** | | **60** |

Un tercio de los pares son **controles negativos**: modifican el código sin
deteriorar la accesibilidad. Sin ellos no existen verdaderos negativos y no
puede calcularse la tasa de falsos positivos.

## Nota estadística que no hay que perder de vista

Los pares **no son independientes**: comparten app, componentes y piso de
ruido. Sesenta pares salidos de diez aplicaciones son diez conglomerados, no
sesenta observaciones libres. El análisis de la sección 3.7 debe usar bootstrap
por conglomerados o un modelo de efectos mixtos con la app como efecto
aleatorio. Un intervalo de confianza calculado como si los sesenta pares fueran
independientes sale más angosto de lo que corresponde.

## Harness

Una sola aplicación que monta cualquier app del benchmark en cualquiera de sus
dos variantes, mediante parámetros de la URL:

```
/?app=a01-landing&variant=base
/?app=a01-landing&variant=m01-kbd-activation
```

Cada variante es un módulo de entrada propio bajo `apps/<app>/variants/`. La
base compone la app con sus partes reales; un mutante compone la misma app
sustituyendo **exactamente una parte**, de modo que el diff entre base y
mutante es un solo módulo, igual que en un Pull Request real. El armado de la
app (`App.tsx`) nunca cambia.

Los metadatos de cada app y de cada variante —operador aplicado, criterio WCAG,
verdad de terreno y si el defecto es detectable de forma estática— viven en
`apps/<app>/app.json`.

Un único `vite build` produce todo con carga diferida. La medición se hace
siempre sobre el build estático; ver `docs/arquitectura.md`.

## Estado

Fase 0: el paquete existe con su harness sin implementar. La fase 2 construye la
primera app completa; la fase 8 escala al benchmark completo.
