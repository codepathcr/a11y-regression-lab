"""Pruebas estadísticas de la sección 3.7, sin dependencias externas.

Se implementan a mano en lugar de importar SciPy por una razón de
reproducibilidad: el análisis tiene que poder recalcularse dentro del mismo
contenedor que produjo los datos, sin instalar nada y sin que una versión
distinta de una biblioteca cambie una cifra del capítulo 4. Son cuatro
funciones; la dependencia no se paga.

Cada una devuelve lo necesario para reportar el contraste completo, no solo el
valor p: los conteos que lo producen, porque un p sin sus conteos no se puede
interpretar ni verificar.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Distribución chi cuadrado
# ---------------------------------------------------------------------------


def _gamma_upper_regularized(s: float, x: float) -> float:
    """Q(s, x), la función gamma incompleta superior regularizada.

    Serie para x pequeño y fracción continua de Lentz para x grande, que es el
    reparto habitual: la serie converge mal cuando x supera s + 1.
    """
    if x < 0 or s <= 0:
        raise ValueError("argumentos fuera de dominio")
    if x == 0:
        return 1.0

    log_gamma = math.lgamma(s)

    if x < s + 1:
        # Serie de P(s, x), y Q = 1 - P.
        term = 1.0 / s
        total = term
        for n in range(1, 1000):
            term *= x / (s + n)
            total += term
            if abs(term) < abs(total) * 1e-15:
                break
        return 1.0 - total * math.exp(-x + s * math.log(x) - log_gamma)

    # Fracción continua de Q(s, x).
    tiny = 1e-300
    b = x + 1.0 - s
    c = 1.0 / tiny
    d = 1.0 / b
    h = d
    for i in range(1, 1000):
        an = -i * (i - s)
        b += 2.0
        d = an * d + b
        if abs(d) < tiny:
            d = tiny
        c = b + an / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 1e-15:
            break
    return h * math.exp(-x + s * math.log(x) - log_gamma)


def chi2_sf(x: float, df: int) -> float:
    """Cola superior de la chi cuadrado: P(X > x) con df grados de libertad."""
    if x <= 0:
        return 1.0
    return _gamma_upper_regularized(df / 2.0, x / 2.0)


# ---------------------------------------------------------------------------
# McNemar exacto
# ---------------------------------------------------------------------------


@dataclass
class McNemar:
    """Resultado de un McNemar sobre observaciones pareadas dicotómicas."""

    only_b: int
    """Casos que solo la segunda condición acierta."""
    only_a: int
    """Casos que solo la primera condición acierta."""
    concordant: int
    p_value: float

    @property
    def discordant(self) -> int:
        return self.only_a + self.only_b


def mcnemar_exact(pairs: list[tuple[bool, bool]]) -> McNemar:
    """McNemar en su forma exacta, por la binomial.

    Se usa la forma exacta y no la aproximación chi cuadrado con corrección de
    continuidad porque el número de pares discordantes de este estudio es
    pequeño —entre quince y sesenta según el contraste— y en ese rango la
    aproximación es poco fiable. La exacta no tiene supuestos de tamaño.
    """
    only_a = sum(1 for a, b in pairs if a and not b)
    only_b = sum(1 for a, b in pairs if b and not a)
    concordant = len(pairs) - only_a - only_b
    n = only_a + only_b

    if n == 0:
        return McNemar(only_b, only_a, concordant, 1.0)

    lower = min(only_a, only_b)
    tail = sum(math.comb(n, i) for i in range(lower + 1)) / (2**n)
    return McNemar(only_b, only_a, concordant, min(1.0, 2 * tail))


# ---------------------------------------------------------------------------
# Q de Cochran
# ---------------------------------------------------------------------------


@dataclass
class CochranQ:
    q: float
    df: int
    p_value: float
    hits: list[int]
    n: int


def cochran_q(blocks: list[list[bool]]) -> CochranQ:
    """Q de Cochran: extiende McNemar a más de dos condiciones pareadas.

    `blocks` es una lista de casos, cada uno con el acierto de cada condición en
    el mismo orden.
    """
    if not blocks:
        raise ValueError("sin casos")
    k = len(blocks[0])
    if any(len(b) != k for b in blocks):
        raise ValueError("todos los casos deben tener las mismas condiciones")

    hits = [sum(1 for b in blocks if b[j]) for j in range(k)]
    row_totals = [sum(1 for v in b if v) for b in blocks]

    numerator = (k - 1) * (k * sum(h * h for h in hits) - sum(hits) ** 2)
    denominator = k * sum(row_totals) - sum(r * r for r in row_totals)
    q = numerator / denominator if denominator else 0.0
    return CochranQ(q, k - 1, chi2_sf(q, k - 1), hits, len(blocks))


# ---------------------------------------------------------------------------
# Corrección de Holm
# ---------------------------------------------------------------------------


def holm(p_values: dict[str, float]) -> dict[str, float]:
    """Ajuste de Holm, declarado en 3.7.3 antes de ver los datos.

    Controla el error de tipo I de la familia de comparaciones sin ser tan
    conservador como Bonferroni. Devuelve los valores ajustados, monótonos.
    """
    items = sorted(p_values.items(), key=lambda kv: kv[1])
    m = len(items)
    adjusted: dict[str, float] = {}
    running = 0.0
    for index, (name, p) in enumerate(items):
        value = min(1.0, (m - index) * p)
        running = max(running, value)
        adjusted[name] = running
    return adjusted


# ---------------------------------------------------------------------------
# Bootstrap por conglomerado
# ---------------------------------------------------------------------------


@dataclass
class Bootstrap:
    observed: float
    low: float
    high: float
    draws: int
    clusters: int

    @property
    def excludes_zero(self) -> bool:
        return self.low > 0 or self.high < 0


def cluster_bootstrap(
    clusters: dict[str, list],
    statistic,
    draws: int = 4000,
    seed: int = 7,
) -> Bootstrap:
    """Intervalo de confianza remuestreando CONGLOMERADOS completos.

    Los pares del benchmark no son independientes: proceden de diez
    aplicaciones, y los de una misma aplicación comparten escenario, componentes
    y estilo de marcado. Remuestrear pares individuales trataría setenta y seis
    observaciones como independientes, subestimaría el error estándar y
    produciría intervalos demasiado estrechos. Lo que se remuestrea con
    reemplazo son las aplicaciones.

    El precio es que la potencia efectiva la fija el número de conglomerados, que
    son diez, y eso se declara junto al resultado.
    """
    names = sorted(clusters)
    rng = random.Random(seed)
    observed = statistic([row for name in names for row in clusters[name]])

    values = []
    for _ in range(draws):
        picked = [rng.choice(names) for _ in names]
        sample = [row for name in picked for row in clusters[name]]
        values.append(statistic(sample))
    values.sort()

    return Bootstrap(
        observed=observed,
        low=values[int(0.025 * len(values))],
        high=values[int(0.975 * len(values))],
        draws=draws,
        clusters=len(names),
    )


# ---------------------------------------------------------------------------
# Delta de Cliff
# ---------------------------------------------------------------------------


def cliffs_delta(a: list[float], b: list[float]) -> float:
    """Magnitud del efecto para dos muestras continuas, sin supuesto de forma.

    Devuelve la diferencia entre la probabilidad de que un valor de `a` supere a
    uno de `b` y la inversa. Cero es ausencia de efecto; uno, separación total.
    """
    if not a or not b:
        return float("nan")
    b_sorted = sorted(b)
    n = len(b_sorted)
    greater = 0
    less = 0
    for value in a:
        # Posiciones por bisección: cuántos de b son menores y cuántos mayores.
        lo, hi = 0, n
        while lo < hi:
            mid = (lo + hi) // 2
            if b_sorted[mid] < value:
                lo = mid + 1
            else:
                hi = mid
        below = lo
        lo, hi = 0, n
        while lo < hi:
            mid = (lo + hi) // 2
            if b_sorted[mid] <= value:
                lo = mid + 1
            else:
                hi = mid
        at_or_below = lo
        greater += below
        less += n - at_or_below
    total = len(a) * n
    return (greater - less) / total


def fleiss_kappa(tables: list[tuple[int, ...]]) -> dict | None:
    """Kappa de Fleiss para k evaluadores por item y categorias fijas.

    tables: un conteo por item, (n_cat0, n_cat1, ...), todos con la misma suma k.
    Aqui los "evaluadores" son las repeticiones de una misma consulta, de modo que
    kappa mide el acuerdo entre ejecuciones de la misma condicion.

    Devuelve los componentes y no solo el coeficiente, porque un kappa sin su
    acuerdo observado y su acuerdo esperado no se puede interpretar: cuando todas
    las respuestas caen en una sola categoria, el acuerdo esperado vale 1 y kappa
    queda indefinido aunque el acuerdo observado sea perfecto.
    """
    items = [t for t in tables if sum(t) > 1]
    if not items:
        return None
    k = sum(items[0])
    if any(sum(t) != k for t in items):
        return None
    n = len(items)
    ncat = len(items[0])
    p_i = [(sum(c * c for c in t) - k) / (k * (k - 1)) for t in items]
    p_bar = sum(p_i) / n
    p_j = [sum(t[j] for t in items) / (n * k) for j in range(ncat)]
    p_e = sum(x * x for x in p_j)
    kappa = None if abs(1.0 - p_e) < 1e-12 else (p_bar - p_e) / (1.0 - p_e)
    return {"kappa": kappa, "acuerdo_observado": p_bar, "acuerdo_esperado": p_e,
            "items": n, "evaluadores": k, "marginales": p_j}


# ---------------------------------------------------------------------------
# Potencia del contraste pareado
# ---------------------------------------------------------------------------
#
# Existe porque la seccion 3.5 justifica el tamano de la muestra con cifras de
# potencia, y una cifra que el repositorio no puede recalcular no es verificable.
# El metodo es el de Connor (1987) para proporciones pareadas, en la forma
# asintotica que usan las calculadoras estandar:
#
#   n = [ (z_{1-a/2} * sqrt(pd) + z_{1-b} * sqrt(pd - d^2)) / d ]^2
#   potencia = Phi[ (|d| * sqrt(n) - z_{1-a/2} * sqrt(pd)) / sqrt(pd - d^2) ]
#
# donde `d` es la diferencia entre las dos proporciones marginales y `pd` la
# tasa de discordancia, es decir la proporcion de casos en que las dos
# condiciones difieren. La implementacion se comprobo contra el ejemplo publicado
# de la calculadora de referencia: con p01=0,45, p10=0,05, alfa=0,05 y potencia
# 0,80 devuelve 23 pares.
#
# La dependencia de `pd` no es un detalle tecnico: con la misma diferencia y el
# mismo tamano, la potencia cambia de forma apreciable segun cuanto discrepen las
# dos condiciones, y el diseno no puede fijar ese valor de antemano. Por eso la
# funcion lo exige en lugar de asumirlo.


def norm_cdf(x: float) -> float:
    """Funcion de distribucion normal estandar, por la funcion error de la
    biblioteca estandar. Sin dependencias externas, como el resto del modulo."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def norm_ppf(p: float) -> float:
    """Cuantil de la normal estandar, por biseccion sobre `norm_cdf`.

    La biseccion basta y se prefiere a una aproximacion racional porque es
    evidentemente correcta: converge a la precision de la maquina en doscientas
    iteraciones y no hay coeficientes que verificar.
    """
    if not 0.0 < p < 1.0:
        raise ValueError(f"p debe estar en (0,1), llego {p}")
    low, high = -40.0, 40.0
    for _ in range(300):
        mid = (low + high) / 2.0
        if norm_cdf(mid) < p:
            low = mid
        else:
            high = mid
    return (low + high) / 2.0


def mcnemar_power(pairs: int, difference: float, discordance: float, alpha: float = 0.05) -> float | None:
    """Potencia del contraste pareado bilateral.

    `difference` es la diferencia entre las proporciones marginales de las dos
    condiciones; `discordance`, la proporcion de casos en que difieren. Devuelve
    None cuando los dos valores son incompatibles, porque la diferencia entre
    proporciones marginales no puede exceder la tasa de discordancia.
    """
    if discordance <= difference * difference:
        return None
    z_alpha = norm_ppf(1.0 - alpha / 2.0)
    numerator = abs(difference) * math.sqrt(pairs) - z_alpha * math.sqrt(discordance)
    return norm_cdf(numerator / math.sqrt(discordance - difference * difference))


def mcnemar_pairs(difference: float, discordance: float, power: float = 0.80, alpha: float = 0.05) -> int | None:
    """Pares necesarios para alcanzar la potencia pedida. Redondea hacia arriba."""
    if discordance <= difference * difference:
        return None
    z_alpha = norm_ppf(1.0 - alpha / 2.0)
    z_beta = norm_ppf(power)
    root = (z_alpha * math.sqrt(discordance) + z_beta * math.sqrt(discordance - difference * difference))
    return math.ceil((root / difference) ** 2)


def mcnemar_min_detectable(
    pairs: int, discordance: float, power: float = 0.80, alpha: float = 0.05
) -> float | None:
    """Diferencia minima detectable con el tamano y la discordancia dados.

    Es la lectura que corresponde a un estudio cuyo tamano de muestra ya esta
    fijado: no cuantos casos harian falta, sino que diferencia podria verse con
    los que hay.
    """
    low, high = 1e-6, min(discordance - 1e-12, 0.999999)
    if high <= low:
        return None
    if (mcnemar_power(pairs, high, discordance, alpha) or 0.0) < power:
        return None
    for _ in range(300):
        mid = (low + high) / 2.0
        achieved = mcnemar_power(pairs, mid, discordance, alpha)
        if achieved is None or achieved < power:
            low = mid
        else:
            high = mid
    return (low + high) / 2.0
