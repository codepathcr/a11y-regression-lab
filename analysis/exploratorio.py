#!/usr/bin/env python3
"""Calculos complementarios y analisis exploratorios del capitulo 4.

    python3 analysis/exploratorio.py            # bloque full

Reune en un solo script lo que el capitulo 4 presentaba como "calculo posterior
sobre la bitacora" y los analisis exploratorios pedidos en la revision del
capitulo. Nada de lo que produce este script es confirmatorio: las decisiones
sobre las hipotesis siguen saliendo de confirmatorio.py.

Parte A, calculos complementarios de tablas existentes:
  A1  composicion del benchmark por aplicacion y clase de par
  A2  F1 por estrategia y por modelo con intervalo por conglomerado
  A3  sensibilidad por estrato y por aplicacion
  A4  razon de momios pareada de H0-1 y H0-2
  A5  tokens de salida, latencia acumulada y percentil 95 por modelo

Parte B, analisis exploratorios:
  B1  referencias sin modelo (responder siempre que si; regla de la compuerta)
  B2  precision esperada segun la prevalencia de regresiones
  B3  proporcion de respuestas afirmativas por modelo y estrategia
  B4  acierto de la version modificada unicamente segun los tokens de entrada
  B5  pares sin regresion que los modelos marcan
  B6  regresion logistica mixta (aplicacion y par como efectos aleatorios)
      que usa los cuatro modelos a la vez. Requiere numpy y scipy; si no estan
      instalados, la seccion se omite y se avisa.
  B7  muestra de respuestas erroneas para la lectura cualitativa (semilla 7)
      y conteos de apoyo

Escribe analysis/out/exploratorio-full.txt y .json, y la muestra de la lectura
cualitativa en analysis/out/exploratorio-muestra-cualitativa.txt.
"""

from __future__ import annotations

import collections
import json
import math
import random
import re
import statistics
from pathlib import Path

import stats as st
from analyze import STRATEGIES, f1_of, load_rows

OUT = Path(__file__).resolve().parent / "out"
MODELS = ["llama31-8b", "mistral-nemo", "phi35", "qwen25-7b"]
PREVALENCES = [0.50, 0.20, 0.10, 0.05, 0.01]


def pair_of(r: dict) -> tuple[str, str]:
    return (r["app"], r["variant"])


def said_yes(r: dict):
    """True si el modelo declaro regresion, False si la nego, None sin veredicto."""
    s = r.get("score")
    if not s:
        return None
    return s["outcome"] in ("true-positive", "false-positive")


def correct(r: dict) -> bool:
    """Acierto de deteccion. Fallo o respuesta ilegible: no hay acierto."""
    s = r.get("score")
    return bool(s) and s["outcome"] in ("true-positive", "true-negative")


def percentile(values: list[float], q: float) -> float:
    v = sorted(values)
    k = (len(v) - 1) * q
    lo, hi = math.floor(k), math.ceil(k)
    return v[lo] + (v[hi] - v[lo]) * (k - lo)


def prf(tp: int, fp: int, tn: int, fn: int) -> dict:
    precision = tp / (tp + fp) if tp + fp else float("nan")
    recall = tp / (tp + fn) if tp + fn else float("nan")
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else float("nan")
    fpr = fp / (fp + tn) if fp + tn else float("nan")
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn, "precision": precision, "recall": recall, "f1": f1, "fpr": fpr}


def mixed_logit(div, idx, strategies):
    """Regresion logistica con interceptos aleatorios de aplicacion y de par.

    Maxima verosimilitud con cuadratura de Gauss-Hermite anidada (21 nodos por
    nivel). Efectos fijos: estrategia (segunda frente a primera) y modelo.
    """
    import numpy as np
    from scipy.optimize import minimize
    from scipy.stats import chi2, norm

    gx, gw = np.polynomial.hermite_e.hermegauss(21)
    gw = gw / gw.sum()

    def build(interaction: bool):
        data: dict = {}
        for p in div:
            X, y = [], []
            for m in MODELS:
                for s in strategies:
                    x = [1.0, 1.0 if s == strategies[1] else 0.0] + [1.0 if m == k else 0.0 for k in MODELS[1:]]
                    if interaction:
                        x += [1.0 if (s == strategies[1] and m == k) else 0.0 for k in MODELS[1:]]
                    X.append(x)
                    y.append(1.0 if correct(idx[(p, m, s)]) else 0.0)
            data.setdefault(p[0], []).append((np.array(X), np.array(y)))
        return data

    def nll(theta, data, k, fixed):
        b = theta[:k].copy()
        if fixed is not None:
            b[fixed] = 0.0
        sd_app, sd_pair = np.exp(theta[k]), np.exp(theta[k + 1])
        total = 0.0
        for blocks in data.values():
            la = np.zeros(len(gx))
            for X, y in blocks:
                e = (X @ b)[None, None, :] + sd_app * gx[:, None, None] + sd_pair * gx[None, :, None]
                ll = (y * e - np.logaddexp(0, e)).sum(2)
                mx = ll.max(1, keepdims=True)
                la += mx[:, 0] + np.log((np.exp(ll - mx) * gw[None, :]).sum(1))
            mx = la.max()
            total += mx + np.log((np.exp(la - mx) * gw).sum())
        return -total

    def fit(data, k, fixed=None):
        best = None
        for start in (0.0, -1.0):
            r = minimize(nll, np.r_[np.zeros(k), start, start], args=(data, k, fixed), method="BFGS", options={"gtol": 1e-5})
            if best is None or r.fun < best.fun:
                best = r
        return best

    def hessian(fun, x, h=1e-4):
        n = len(x)
        H = np.zeros((n, n))
        for i in range(n):
            for j in range(i, n):
                ei, ej = np.eye(n)[i] * h, np.eye(n)[j] * h
                H[i, j] = H[j, i] = (fun(x + ei + ej) - fun(x + ei - ej) - fun(x - ei + ej) + fun(x - ei - ej)) / (4 * h * h)
        return H

    k = 5
    data = build(False)
    full = fit(data, k)
    se = float(np.sqrt(np.diag(np.linalg.inv(hessian(lambda t: nll(t, data, k, None), full.x))))[1])
    null = fit(data, k, fixed=[1])
    lrt = 2 * (null.fun - full.fun)
    inter = fit(build(True), 8)
    lrt_inter = 2 * (full.fun - inter.fun)
    beta = float(full.x[1])
    return {
        "observations": int(sum(len(y) for blocks in data.values() for _, y in blocks)),
        "beta": beta, "se": se, "or": math.exp(beta),
        "or_low": math.exp(beta - 1.959964 * se), "or_high": math.exp(beta + 1.959964 * se),
        "p_wald": float(2 * (1 - norm.cdf(abs(beta / se)))),
        "lrt": float(lrt), "p_lrt": float(chi2.sf(lrt, 1)),
        "sd_app": float(math.exp(full.x[k])), "sd_pair": float(math.exp(full.x[k + 1])),
        "lrt_interaction": float(lrt_inter), "p_interaction": float(chi2.sf(lrt_inter, 3)),
    }


def main() -> None:
    rows = load_rows("full")
    idx = {(pair_of(r), r["model"], r["strategy"]): r for r in rows}
    pairs = sorted({pair_of(r) for r in rows})
    label = {pair_of(r): r["label"] for r in rows}
    gate = {p for p in pairs if idx[(p, MODELS[0], "state-diff")]["resolvedBy"] != "model"}
    div = [p for p in pairs if p not in gate]
    positives = [p for p in pairs if label[p] == "positive"]
    apps = sorted({p[0] for p in pairs})

    lines: list[str] = []
    report: dict = {}

    def say(text: str = "") -> None:
        lines.append(text)

    def head(title: str) -> None:
        say("=" * 78)
        say(title)
        say("=" * 78)

    say("CALCULOS COMPLEMENTARIOS Y ANALISIS EXPLORATORIOS (bloque full)")
    say(f"{len(rows)} registros, {len(pairs)} pares, {len(div)} con divergencia, {len(positives)} positivos")
    say()

    # --- A1 -----------------------------------------------------------------
    head("A1. COMPOSICION DEL BENCHMARK POR APLICACION Y CLASE DE PAR")
    report["composition"] = {}
    for a in apps:
        c = collections.Counter(label[p] for p in pairs if p[0] == a)
        stratum = sorted({r["stratum"] for r in rows if r["app"] == a})[0]
        report["composition"][a] = {"stratum": stratum, **c, "total": sum(c.values())}
        say(f"  {a:14s} {stratum:7s} positivos {c['positive']:2d}  nula {c['negative']:2d}  benigna {c['benign-divergent']:2d}  preexistente {c['preexisting']:2d}  total {sum(c.values()):2d}")
    say()

    # --- A2 -----------------------------------------------------------------
    head("A2. F1 CON INTERVALO POR CONGLOMERADO (4 000 replicas, semilla 7)")
    report["f1"] = {}

    def f1_ci(name: str, keep) -> None:
        clusters: dict[str, list[dict]] = collections.defaultdict(list)
        for r in rows:
            if r.get("score") and keep(r):
                clusters[r["app"]].append(r)
        for s in STRATEGIES:
            boot = st.cluster_bootstrap(clusters, lambda sample, ss=s: f1_of([r for r in sample if r["strategy"] == ss]))
            report["f1"][f"{name}/{s}"] = {"observed": boot.observed, "low": boot.low, "high": boot.high}
            say(f"  {name:14s} {s:11s} F1 {boot.observed:.3f}  [{boot.low:.3f}; {boot.high:.3f}]")

    f1_ci("agregado", lambda r: True)
    for m in MODELS:
        f1_ci(m, lambda r, mm=m: r["model"] == mm)
    say()

    # --- A3 -----------------------------------------------------------------
    head("A3. SENSIBILIDAD POR ESTRATO Y POR APLICACION (respuestas puntuadas)")
    report["sensitivity"] = {}

    def sens(name: str, keep) -> None:
        out = []
        for s in STRATEGIES:
            sc = [r for r in rows if keep(r) and r["strategy"] == s and r["label"] == "positive" and r.get("score")]
            hit = sum(1 for r in sc if r["score"]["detection"])
            report["sensitivity"][f"{name}/{s}"] = {"hits": hit, "n": len(sc)}
            out.append(f"{s} {hit}/{len(sc)} = {hit / len(sc):.3f}" if sc else f"{s} sin datos")
        say(f"  {name:14s} " + "   ".join(out))

    for stratum in sorted({r["stratum"] for r in rows}):
        sens(stratum, lambda r, x=stratum: r["stratum"] == x)
    for a in apps:
        sens(a, lambda r, x=a: r["app"] == x)
    say()

    # --- A4 -----------------------------------------------------------------
    head("A4. RAZON DE MOMIOS PAREADA DE H0-1 Y H0-2 (58 pares)")
    say("  OR = pares que acierta solo b / pares que acierta solo a. IC 95 % exacto")
    say("  (Clopper-Pearson sobre la proporcion de discordantes a favor de b).")
    report["odds_ratio"] = {}

    def beta_inv(q: float, a: float, b: float) -> float:
        lo, hi = 0.0, 1.0
        for _ in range(200):
            mid = (lo + hi) / 2
            if betai(a, b, mid) < q:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    def betai(a: float, b: float, x: float) -> float:
        # binomial acumulada: I_x(a, b) con a, b enteros
        n = int(a + b - 1)
        return sum(math.comb(n, j) * x**j * (1 - x) ** (n - j) for j in range(int(a), n + 1))

    for m in MODELS:
        for hip, (sa, sb) in (("H0-1", ("static", "state-diff")), ("H0-2", ("state-diff", "trace-diff"))):
            only_b = sum(1 for p in div if correct(idx[(p, m, sb)]) and not correct(idx[(p, m, sa)]))
            only_a = sum(1 for p in div if correct(idx[(p, m, sa)]) and not correct(idx[(p, m, sb)]))
            n = only_a + only_b
            low = beta_inv(0.025, only_b, n - only_b + 1) if only_b else 0.0
            high = beta_inv(0.975, only_b + 1, n - only_b) if only_b < n else 1.0
            odds = lambda q: q / (1 - q) if q < 1 else float("inf")
            ratio = only_b / only_a if only_a else float("inf")
            report["odds_ratio"][f"{m}/{hip}"] = {"only_a": only_a, "only_b": only_b, "or": ratio, "low": odds(low), "high": odds(high)}
            say(f"  {m:14s} {hip}  solo a {only_a:2d}  solo b {only_b:2d}  OR {ratio:5.2f}  [{odds(low):.2f}; {odds(high):.2f}]")
    say()

    # --- A5 -----------------------------------------------------------------
    head("A5. TOKENS DE SALIDA, LATENCIA ACUMULADA Y PERCENTIL 95")
    model_rows = [r for r in rows if r["resolvedBy"] == "model"]
    report["efficiency"] = {"p95": {}}
    for s in STRATEGIES:
        done = [r for r in model_rows if r["strategy"] == s and not r.get("error")]
        say(f"  {s:11s} mediana de tokens de salida {statistics.median(r['completionTokens'] for r in done):.0f}")
    total = sum(r["latencyMs"] for r in model_rows) / 60000
    say(f"  latencia acumulada de las {len(model_rows)} consultas: {total:.1f} min")
    for m in MODELS:
        say(f"    {m:14s} {sum(r['latencyMs'] for r in model_rows if r['model'] == m) / 60000:.1f} min")
    report["efficiency"]["total_minutes"] = total
    try:
        sub = [r for r in load_rows("subsample") if r["resolvedBy"] == "model"]
        report["efficiency"]["subsample_minutes"] = sum(r["latencyMs"] for r in sub) / 60000
        say(f"  latencia acumulada de las {len(sub)} consultas del bloque de consistencia: {report['efficiency']['subsample_minutes']:.1f} min")
    except SystemExit:
        say("  bloque de consistencia no disponible")
    for name, keep in (("todas las llamadas", lambda r: True), ("sin las fallidas", lambda r: not r.get("error"))):
        a = [r["latencyMs"] for r in model_rows if r["strategy"] == "static" and keep(r)]
        b = [r["latencyMs"] for r in model_rows if r["strategy"] == "trace-diff" and keep(r)]
        delta = st.cliffs_delta(a, b)
        report["efficiency"][f"cliff/{name}"] = delta
        say(f"  delta de Cliff de la latencia, static frente a trace-diff ({name}): {delta:+.3f}")
    for m in MODELS:
        for s in STRATEGIES:
            v = [r["latencyMs"] / 1000 for r in model_rows if r["model"] == m and r["strategy"] == s and r.get("score")]
            p95 = percentile(v, 0.95)
            report["efficiency"]["p95"][f"{m}/{s}"] = {"n": len(v), "median": statistics.median(v), "p95": p95}
            say(f"  {m:14s} {s:11s} n {len(v):2d}  mediana {statistics.median(v):5.2f} s  p95 {p95:6.2f} s  {'cumple' if p95 <= 30 else 'NO cumple'}")
    say()

    # --- B1 -----------------------------------------------------------------
    head("B1. REFERENCIAS SIN MODELO")
    n_pos, n_div, n_all = len(positives), len(div), len(pairs)
    always = prf(n_pos, n_all - n_pos, 0, 0)
    rule = prf(n_pos, n_div - n_pos, len(gate), 0)
    report["baselines"] = {"always_yes_76": always, "gate_rule_76": rule, "always_yes_58_hits": n_pos, "always_yes_58_n": n_div}
    say(f"  Responder siempre que si, 76 pares:   precision {always['precision']:.3f}  recall 1,000  F1 {always['f1']:.3f}  TFP {always['fpr']:.3f}")
    say(f"  Regla de la compuerta, 76 pares:      precision {rule['precision']:.3f}  recall 1,000  F1 {rule['f1']:.3f}  TFP {rule['fpr']:.3f}")
    say("    (declara regresion siempre que la compuerta encuentra divergencia)")
    say(f"  Responder siempre que si, 58 pares:   {n_pos}/{n_div} aciertos = {n_pos / n_div:.3f}")
    say("  Aciertos de deteccion sobre los 58 pares por modelo y estrategia:")
    above = 0
    for m in MODELS:
        hits = [sum(1 for p in div if correct(idx[(p, m, s)])) for s in STRATEGIES]
        above += sum(1 for h in hits if h > n_pos)
        say(f"    {m:14s} " + "  ".join(f"{s} {h}/{n_div}" for s, h in zip(STRATEGIES, hits)))
    say(f"  Combinaciones que superan {n_pos}/{n_div}: {above} de {len(MODELS) * len(STRATEGIES)}")
    report["baselines"]["above_always_yes"] = above
    say()

    # --- B2 -----------------------------------------------------------------
    head("B2. PRECISION ESPERADA SEGUN LA PREVALENCIA (pares con divergencia)")
    say("  precision = S*pi / (S*pi + T*(1 - pi)); S = sensibilidad y T = tasa de falsos")
    say("  positivos, ambas sobre las respuestas puntuadas de los 58 pares con divergencia.")
    report["prevalence"] = {}

    def conditional(models: list[str], s: str) -> tuple[float, float]:
        rs = [idx[(p, m, s)] for p in div for m in models]
        P = [said_yes(r) for r in rs if r["label"] == "positive" and said_yes(r) is not None]
        N = [said_yes(r) for r in rs if r["label"] != "positive" and said_yes(r) is not None]
        return sum(P) / len(P), sum(N) / len(N)

    say("  " + "".ljust(28) + "S      T      " + "  ".join(f"pi={pi:.2f}" for pi in [n_pos / n_div] + PREVALENCES))
    for name, models in [("agregado", MODELS)] + [(m, [m]) for m in MODELS]:
        for s in STRATEGIES:
            S, T = conditional(models, s)
            ppv = {pi: (S * pi / (S * pi + T * (1 - pi)) if S * pi + T * (1 - pi) else float("nan")) for pi in [n_pos / n_div] + PREVALENCES}
            report["prevalence"][f"{name}/{s}"] = {"sensitivity": S, "fpr": T, "ppv": {f"{k:.3f}": v for k, v in ppv.items()}}
            say(f"  {name:14s} {s:11s}  {S:.3f}  {T:.3f}  " + "  ".join(f"{v:7.3f}" for v in ppv.values()))
    say("  Regla de la compuerta: precision igual a la prevalencia (" + ", ".join(f"{pi:.2f}" for pi in PREVALENCES) + ").")
    say()

    # --- B3 -----------------------------------------------------------------
    head("B3. PROPORCION DE RESPUESTAS AFIRMATIVAS (58 pares, respuestas puntuadas)")
    say(f"  Proporcion real de regresiones en los 58 pares: {n_pos}/{n_div} = {n_pos / n_div:.3f}")
    report["yes_rate"] = {}
    for m in MODELS:
        for s in STRATEGIES:
            sc = [idx[(p, m, s)] for p in div if said_yes(idx[(p, m, s)]) is not None]
            yes = sum(said_yes(r) for r in sc)
            yp = sum(said_yes(r) for r in sc if r["label"] == "positive")
            n_p = sum(1 for r in sc if r["label"] == "positive")
            report["yes_rate"][f"{m}/{s}"] = {"yes": yes, "n": len(sc), "yes_pos": yp, "n_pos": n_p, "yes_neg": yes - yp, "n_neg": len(sc) - n_p}
            say(f"  {m:14s} {s:11s} {yes:2d}/{len(sc)} = {yes / len(sc):.3f}   en positivos {yp}/{n_p}   en pares sin regresion {yes - yp}/{len(sc) - n_p}")
    say()

    # --- B4 -----------------------------------------------------------------
    head("B4. ACIERTO SEGUN LOS TOKENS DE ENTRADA DE LA VERSION MODIFICADA UNICAMENTE")
    tokens = {p: statistics.median(idx[(p, m, "static")]["promptTokens"] for m in MODELS if idx[(p, m, "static")]["promptTokens"]) for p in div}
    ordered = sorted(div, key=lambda p: tokens[p])
    cut = len(ordered) // 3
    groups = [ordered[:cut], ordered[cut : 2 * cut], ordered[2 * cut :]]
    report["tokens"] = []
    for i, g in enumerate(groups, 1):
        pos = [p for p in g if label[p] == "positive"]
        entry = {"tercile": i, "min": tokens[g[0]], "max": tokens[g[-1]], "pairs": len(g), "positives": len(pos)}
        text = []
        for s in STRATEGIES:
            hit = sum(1 for p in pos for m in MODELS if correct(idx[(p, m, s)]))
            acc = sum(1 for p in g for m in MODELS if correct(idx[(p, m, s)]))
            med = statistics.median(idx[(p, m, s)]["promptTokens"] for p in g for m in MODELS if idx[(p, m, s)]["promptTokens"])
            entry[s] = {"sens_hits": hit, "sens_n": len(pos) * len(MODELS), "acc_hits": acc, "acc_n": len(g) * len(MODELS), "median_tokens": med}
            text.append(f"{s}: sens {hit}/{len(pos) * len(MODELS)} = {hit / (len(pos) * len(MODELS)):.3f}, acierto {acc}/{len(g) * len(MODELS)}, tokens {med:.0f}")
        report["tokens"].append(entry)
        say(f"  tercil {i} ({tokens[g[0]]:.0f} a {tokens[g[-1]]:.0f} tokens; {len(g)} pares, {len(pos)} positivos)")
        for t in text:
            say("      " + t)
    say()

    # --- B5 -----------------------------------------------------------------
    head("B5. PARES SIN REGRESION CON DIVERGENCIA: MODELOS QUE DECLARAN REGRESION")
    say("  Una letra por modelo (llama, mistral, phi, qwen): S declara regresion,")
    say("  - la niega, ? sin veredicto.")
    report["flagged_negatives"] = {}
    for p in div:
        if label[p] == "positive":
            continue
        marks = {}
        for s in STRATEGIES:
            marks[s] = "".join("S" if said_yes(idx[(p, m, s)]) else ("-" if said_yes(idx[(p, m, s)]) is False else "?") for m in MODELS)
        total_yes = sum(v.count("S") for v in marks.values())
        report["flagged_negatives"]["/".join(p)] = {"label": label[p], **marks, "yes": total_yes}
        say(f"  {'/'.join(p):46s} {label[p]:17s} " + "  ".join(f"{s} {marks[s]}" for s in STRATEGIES) + f"   {total_yes}/12")
    say()

    # --- B6 -----------------------------------------------------------------
    head("B6. REGRESION LOGISTICA MIXTA CON LOS CUATRO MODELOS (EXPLORATORIO)")
    say("  Respuesta: acierto de deteccion en los 58 pares con divergencia.")
    say("  Efectos fijos: estrategia y modelo. Interceptos aleatorios: aplicacion y par.")
    report["mixed"] = {}
    try:
        for hip, strategies in (("H0-1", ["static", "state-diff"]), ("H0-2", ["state-diff", "trace-diff"])):
            r = mixed_logit(div, idx, strategies)
            report["mixed"][hip] = r
            say(f"  {hip}: {strategies[1]} frente a {strategies[0]}, {r['observations']} observaciones")
            say(f"      OR {r['or']:.2f}  IC 95 % [{r['or_low']:.2f}; {r['or_high']:.2f}]  p de Wald {r['p_wald']:.4f}")
            say(f"      razon de verosimilitudes {r['lrt']:.2f} (1 gl), p {r['p_lrt']:.4f}")
            say(f"      desviacion estandar: aplicacion {r['sd_app']:.3f}, par {r['sd_pair']:.3f}")
            say(f"      interaccion estrategia por modelo: {r['lrt_interaction']:.2f} (3 gl), p {r['p_interaction']:.4f}")
    except ImportError:
        say("  OMITIDO: requiere numpy y scipy (pip install numpy scipy).")
    only_t = sum(1 for p in div for m in MODELS if correct(idx[(p, m, "trace-diff")]) and not correct(idx[(p, m, "state-diff")]))
    only_s = sum(1 for p in div for m in MODELS if correct(idx[(p, m, "state-diff")]) and not correct(idx[(p, m, "trace-diff")]))
    pooled = st.mcnemar_exact([(correct(idx[(p, m, "state-diff")]), correct(idx[(p, m, "trace-diff")])) for p in div for m in MODELS])
    report["pooled_mcnemar_58"] = {"only_trace": only_t, "only_state": only_s, "p": pooled.p_value}
    say(f"  McNemar combinado sobre los 58 pares (no independiente): solo trazas {only_t}, solo estados {only_s}, p {pooled.p_value:.4f}")
    say()

    # --- B7 -----------------------------------------------------------------
    head("B7. LECTURA CUALITATIVA: MUESTRA Y CONTEOS DE APOYO")

    def parsed(r: dict) -> dict:
        try:
            value = json.loads(r["raw"])
            return value if isinstance(value, dict) else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def outcome(r: dict):
        return r["score"]["outcome"] if r.get("score") else None

    def generic(r: dict) -> bool:
        e = parsed(r).get("evidence")
        return e is None or bool(re.match(r"\s*(No se observ|El recorrido no|El árbol de accesibilidad no)", str(e)))

    report["qualitative"] = {"generic_fn": {}, "fp_categories": {}}
    say("  Falsos negativos con justificacion vacia o generica (niega sin citar pasos):")
    for m in MODELS:
        for s in STRATEGIES:
            fn = [r for r in rows if r["model"] == m and r["strategy"] == s and outcome(r) == "false-negative"]
            g = sum(1 for r in fn if generic(r))
            report["qualitative"]["generic_fn"][f"{m}/{s}"] = {"generic": g, "n": len(fn)}
            say(f"    {m:14s} {s:11s} {g}/{len(fn)}")
    say("  Categoria declarada en los falsos positivos de pares con divergencia:")
    for m in MODELS:
        for s in STRATEGIES:
            fp = [r for r in rows if r["model"] == m and r["strategy"] == s and outcome(r) == "false-positive" and r["label"] != "negative"]
            c = collections.Counter(str(parsed(r).get("category")) for r in fp)
            report["qualitative"]["fp_categories"][f"{m}/{s}"] = dict(c)
            say(f"    {m:14s} {s:11s} {len(fp):2d}  " + "; ".join(f"{k}: {v}" for k, v in c.most_common()))

    rng = random.Random(7)
    sample_lines = ["MUESTRA PARA LA LECTURA CUALITATIVA (semilla 7)", ""]
    groups_q = [
        ("Qwen 2.5, falsos negativos, version modificada unicamente", [r for r in rows if r["model"] == "qwen25-7b" and r["strategy"] == "static" and outcome(r) == "false-negative"], 9),
        ("Qwen 2.5, falsos negativos, estrategias diferenciales", [r for r in rows if r["model"] == "qwen25-7b" and r["strategy"] != "static" and outcome(r) == "false-negative"], 8),
        ("Llama 3.1, falsos positivos, estrategias diferenciales", [r for r in rows if r["model"] == "llama31-8b" and r["strategy"] != "static" and outcome(r) == "false-positive"], 11),
        ("Phi 3.5, falsos positivos, tres estrategias", [r for r in rows if r["model"] == "phi35" and outcome(r) == "false-positive"], 12),
    ]
    for title, pool, n in groups_q:
        rng.shuffle(pool)
        sample_lines += [title, "-" * len(title)]
        for r in pool[:n]:
            j = parsed(r)
            sample_lines.append(f"{r['app']}/{r['variant']} [{r['strategy']}] regresion={j.get('regression')} categoria={j.get('category')} paso={j.get('transitionStep')}")
            sample_lines.append(f"    {str(j.get('evidence')) if j else r['raw']}".replace("\n", " "))
        sample_lines.append("")
        say(f"  {title}: {n} de {len(pool)} respuestas")
    say("  La muestra completa esta en exploratorio-muestra-cualitativa.txt.")
    say()

    OUT.mkdir(exist_ok=True)
    (OUT / "exploratorio-muestra-cualitativa.txt").write_text("\n".join(sample_lines) + "\n", encoding="utf8")
    (OUT / "exploratorio-full.txt").write_text("\n".join(lines) + "\n", encoding="utf8")
    (OUT / "exploratorio-full.json").write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
