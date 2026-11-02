#!/usr/bin/env python3
"""Analisis confirmatorio del capitulo 3 (version 25 del documento).

    python3 analysis/confirmatorio.py            # bloque full

Complementa a analyze.py, que conserva el reporte descriptivo agregado. Este
script implementa lo que 3.7.1 declara como confirmatorio:

  * Cada modelo se analiza POR SEPARADO. No se combinan registros de modelos
    distintos como si fueran unidades independientes.
  * H0-1 y H0-2: acierto binario por par, McNemar exacto bilateral, alfa 0,05,
    sin ajuste (una comparacion preespecificada por familia). Analisis principal
    sobre los 58 pares en los que el modelo decide; complementario sobre los 76.
  * H0-3 (falsos positivos, 16 pares) y H0-4 (deteccion y localizacion exacta,
    42 positivos): Q de Cochran como filtro previo y, si es significativa,
    McNemar por pares con Holm sobre las tres comparaciones.
  * H0-6: deteccion y categoria correctas sobre los 42 positivos, cada
    estrategia contra un clasificador constante (siempre la categoria mas
    frecuente), McNemar exacto unilateral, Holm sobre las tres comparaciones.
  * ED-1: evaluacion descriptiva de los seis pares con defecto preexistente,
    con conteos e intervalo de Wilson. Sin contraste.
  * Analisis de sensibilidad que excluye los seis positivos AAA (criterio 3.2.5).
  * Intervalos de la diferencia de aciertos: por par y por conglomerado
    (aplicaciones). El de conglomerado es solo sensibilidad.

Regla de fallos (3.7.2): un fallo de procesamiento o una respuesta no
interpretable permanece en el denominador. En un positivo cuenta como deteccion
no lograda; en un par sin regresion cuenta como acierto no obtenido (resultado
no resuelto), nunca como decision negativa imputada. En H0-3 un fallo no es ni
falso positivo ni verdadero negativo: se usa el caso completo y se declara
cuantos pares se excluyen.

Escribe analysis/out/confirmatorio-full.txt y .json.
"""

from __future__ import annotations

import argparse
import collections
import json
import math
from pathlib import Path

import stats as st
from analyze import STRATEGIES, load_ground_truth, load_rows

OUT = Path(__file__).resolve().parent / "out"
ALPHA = 0.05
PAIRS_OF = [("static", "state-diff"), ("state-diff", "trace-diff"), ("static", "trace-diff")]


# ---------------------------------------------------------------------------
# Indicadores por fila
# ---------------------------------------------------------------------------


def hit_detection(r: dict) -> bool:
    """Decision correcta. Fallo o respuesta ilegible: no hay acierto."""
    s = r.get("score")
    return bool(s and s["detection"])


def hit_localization(r: dict) -> bool:
    s = r.get("score")
    return bool(s and s["outcome"] == "true-positive" and s["transition"] is True)


def hit_category(r: dict) -> bool:
    s = r.get("score")
    return bool(s and s["outcome"] == "true-positive" and s["category"] is True)


def false_positive(r: dict):
    """True/False si hay veredicto; None si fallo o respuesta ilegible."""
    s = r.get("score")
    if not s:
        return None
    return s["outcome"] == "false-positive"


# ---------------------------------------------------------------------------
# Estadistica auxiliar
# ---------------------------------------------------------------------------


def one_sided(only_s: int, only_r: int) -> float:
    """McNemar exacto unilateral: la estrategia acierta mas que la referencia."""
    n = only_s + only_r
    if n == 0:
        return 1.0
    return sum(math.comb(n, i) for i in range(only_s, n + 1)) / 2**n


def wilson(k: int, n: int, z: float = 1.959964) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def diff_ci(items: list[tuple[str, bool, bool]]) -> dict:
    """Diferencia de proporciones de acierto (b menos a) con dos intervalos."""
    def stat(rows):
        return (sum(b for _, _, b in rows) - sum(a for _, a, _ in rows)) / len(rows)

    by_pair = {str(i): [it] for i, it in enumerate(items)}
    by_app: dict[str, list] = collections.defaultdict(list)
    for it in items:
        by_app[it[0]].append(it)
    pair_level = st.cluster_bootstrap(by_pair, stat)
    cluster = st.cluster_bootstrap(dict(by_app), stat)
    return {
        "diff": pair_level.observed,
        "ci_pair": [pair_level.low, pair_level.high],
        "ci_cluster": [cluster.low, cluster.high],
    }


def f(x, d=3):
    return "n/d" if x is None else f"{x:.{d}f}"


def pfmt(p):
    return f"{p:.2e}" if p < 0.001 else f"{p:.4f}"


# ---------------------------------------------------------------------------
# Construccion de la tabla de pares
# ---------------------------------------------------------------------------


def build(rows: list[dict]) -> dict:
    table: dict[tuple, dict] = collections.defaultdict(dict)
    for r in rows:
        table[(r["model"], r["app"], r["variant"])][r["strategy"]] = r
    incomplete = [k for k, v in table.items() if set(v) != set(STRATEGIES)]
    if incomplete:
        raise SystemExit(f"Pares sin las tres estrategias: {incomplete[:3]} ... ({len(incomplete)})")
    return table


def label_of(cell: dict) -> str:
    return next(iter(cell.values()))["label"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--block", default="full", choices=["full"])
    args = parser.parse_args()

    rows = load_rows(args.block)
    truth = load_ground_truth()
    configs = {json.dumps(r.get("config", {}), sort_keys=True) for r in rows}
    if len(configs) != 1:
        raise SystemExit("La bitacora mezcla configuraciones: no se analiza.")
    config = json.loads(next(iter(configs)))
    table = build(rows)
    models = sorted({k[0] for k in table})

    lines: list[str] = []
    report: dict = {"block": args.block, "config": config, "models": models}

    def say(text: str = "") -> None:
        lines.append(text)
        print(text)

    wcag = {key: meta["wcag"] for key, meta in truth.items()}
    cat_truth = {key: meta["category"] for key, meta in truth.items()}
    positives = {(a, v) for (_, a, v), cell in table.items() if label_of(cell) == "positive"}
    freq = collections.Counter(cat_truth[k] for k in positives)
    most, most_n = freq.most_common(1)[0]
    aaa = {k for k in positives if "3.2.5" in wcag.get(k, [])}

    say(f"ANALISIS CONFIRMATORIO · bloque {args.block} · {len(rows)} filas · {len(models)} modelos")
    say(f"Configuracion: systemHash {config.get('systemHash')} · numCtx {config.get('numCtx')} · "
        f"temperatura {config.get('temperature')} · semilla {config.get('seed')}")
    say()
    say("Cada modelo se analiza por separado. Alfa 0,05. Los ajustes NO controlan la")
    say("multiplicidad entre los cuatro modelos: los hallazgos se leen dentro de cada modelo.")
    say(f"Positivos: {len(positives)} · categoria mas frecuente: \"{most}\" ({most_n}/{len(positives)}) · "
        f"positivos AAA (3.2.5): {len(aaa)}")
    say()

    # --- fallos ------------------------------------------------------------
    say("=" * 78)
    say("FALLOS Y RESPUESTAS NO INTERPRETABLES (permanecen en el denominador)")
    say("=" * 78)
    say()
    say("  modelo           estrategia     fallos  ilegibles  sobre pares positivos")
    report["failures"] = {}
    for m in models:
        for s in STRATEGIES:
            sub = [c[s] for k, c in table.items() if k[0] == m]
            fail = [r for r in sub if r.get("error")]
            ill = [r for r in sub if r.get("score") is None and not r.get("error")]
            if fail or ill:
                onpos = sum(1 for r in fail + ill if r["label"] == "positive")
                say(f"  {m:<15} {s:<13} {len(fail):>6}  {len(ill):>9}  {onpos:>6}")
                report["failures"][f"{m}|{s}"] = {"failed": len(fail), "illegible": len(ill), "on_positive": onpos}
    if not report["failures"]:
        say("  ninguno")
    say()

    # --- H0-1 y H0-2 ---------------------------------------------------------
    def detection_block(title: str, keep, tag: str, exclude=frozenset()) -> None:
        say(f"  {title}")
        say("  modelo          hip.  comparacion              n   aciertos a/b    solo a  solo b      p       decision   dif. [IC por par] [IC conglomerado]")
        report.setdefault(tag, {})
        for m in models:
            for hip, (a, b) in zip(["H0-1", "H0-2"], PAIRS_OF[:2]):
                items, pairs_ = [], []
                for (mm, app, var), cell in sorted(table.items()):
                    if mm != m or (app, var) in exclude or not keep(label_of(cell)):
                        continue
                    ha, hb = hit_detection(cell[a]), hit_detection(cell[b])
                    pairs_.append((ha, hb))
                    items.append((app, ha, hb))
                mc = st.mcnemar_exact(pairs_)
                ci = diff_ci(items)
                ha_n, hb_n = sum(x for x, _ in pairs_), sum(y for _, y in pairs_)
                decision = "RECHAZA" if mc.p_value < ALPHA else "no rechaza"
                say(
                    f"  {m:<15} {hip:<5} {a+' vs '+b:<24} {len(pairs_):>3}   {ha_n:>3}/{hb_n:<3}        "
                    f"{mc.only_a:>5}   {mc.only_b:>5}   {pfmt(mc.p_value):>9}   {decision:<10} "
                    f"{ci['diff']:+.3f} [{ci['ci_pair'][0]:+.3f},{ci['ci_pair'][1]:+.3f}] [{ci['ci_cluster'][0]:+.3f},{ci['ci_cluster'][1]:+.3f}]"
                )
                report[tag][f"{m}|{hip}"] = {
                    "n": len(pairs_), "hits_a": ha_n, "hits_b": hb_n, "only_a": mc.only_a, "only_b": mc.only_b,
                    "p": mc.p_value, "decision": decision, **ci,
                }
        say()

    say("=" * 78)
    say("H0-1 y H0-2: ACIERTO BINARIO DE DETECCION POR PAR")
    say("=" * 78)
    say()
    say("  Acierto = decision correcta (positivo detectado, o par sin regresion no marcado).")
    say("  'solo a' y 'solo b': pares que acierta unicamente la primera o la segunda condicion.")
    say("  Una sola comparacion preespecificada por hipotesis: sin ajuste, alfa 0,05.")
    say("  El intervalo por conglomerado remuestrea las 10 aplicaciones y es solo sensibilidad.")
    say()
    detection_block("ANALISIS PRINCIPAL: 58 pares (positivos, divergencia benigna, defecto preexistente)",
                    lambda lab: lab != "negative", "h01_h02_main")
    detection_block("ANALISIS COMPLEMENTARIO: 76 pares (incluye los 18 resueltos por la compuerta)",
                    lambda lab: True, "h01_h02_full")

    # --- familias con Q de Cochran ------------------------------------------
    def cochran_family(hip: str, title: str, keep, indicator, tag: str, exclude=frozenset(), quiet=False) -> None:
        if not quiet:
            say("=" * 78)
            say(f"{hip}: {title}")
            say("=" * 78)
            say()
        report.setdefault(tag, {})
        for m in models:
            cases = []
            excluded = 0
            for (mm, app, var), cell in sorted(table.items()):
                if mm != m or (app, var) in exclude or not keep(label_of(cell)):
                    continue
                vals = [indicator(cell[s]) for s in STRATEGIES]
                if any(v is None for v in vals):
                    excluded += 1
                    continue
                cases.append(vals)
            q = st.cochran_q(cases)
            raw, names = {}, {}
            mcs = {}
            for a, b in PAIRS_OF:
                ia, ib = STRATEGIES.index(a), STRATEGIES.index(b)
                mc = st.mcnemar_exact([(c[ia], c[ib]) for c in cases])
                key = f"{a} vs {b}"
                raw[key] = mc.p_value
                mcs[key] = mc
            holm = st.holm(raw)
            gate = q.p_value < ALPHA
            say(f"  {m}: n={q.n} pares" + (f" ({excluded} excluidos por fallo)" if excluded else "")
                + f" · {'falsos positivos' if hip == 'H0-3' else 'aciertos'} {dict(zip(STRATEGIES, q.hits))} · Q={q.q:.2f} gl={q.df} p={pfmt(q.p_value)}"
                + ("" if gate else "  -> Q no significativa: comparaciones por pares NO interpretables"))
            report[tag][m] = {"n": q.n, "excluded": excluded, "hits": dict(zip(STRATEGIES, q.hits)),
                              "q": q.q, "q_p": q.p_value, "pairs": {}}
            for key, mc in mcs.items():
                sig = holm[key] < ALPHA
                verdict = ("SIGNIFICATIVA tras Holm" if sig else "no significativa") if gate else "no interpretable"
                say(f"      {key:<24} solo a {mc.only_a:>3} solo b {mc.only_b:>3}  p={pfmt(raw[key]):>9}  Holm={pfmt(holm[key]):>9}  {verdict}")
                report[tag][m]["pairs"][key] = {"only_a": mc.only_a, "only_b": mc.only_b, "p": raw[key],
                                                "p_holm": holm[key], "interpretable": gate, "significant": gate and sig}
        say()

    cochran_family("H0-3", "TASA DE FALSOS POSITIVOS (16 pares: divergencia benigna y defecto preexistente)",
                   lambda lab: lab in ("benign-divergent", "preexisting"), false_positive, "h03")
    cochran_family("H0-4", "DETECCION Y LOCALIZACION EXACTA DE EXTREMO A EXTREMO (42 positivos)",
                   lambda lab: lab == "positive", hit_localization, "h04")

    # --- H0-6 ----------------------------------------------------------------
    def h06(exclude=frozenset(), quiet=False) -> dict:
        pos = positives - set(exclude)
        c = collections.Counter(cat_truth[k] for k in pos)
        top, top_n = c.most_common(1)[0]
        out = {}
        if not quiet:
            say("=" * 78)
            say("H0-6: DETECCION Y CATEGORIA CORRECTAS CONTRA LA REFERENCIA CONSTANTE")
            say("=" * 78)
            say()
            say(f"  Referencia: predice siempre regresion y la categoria \"{top}\": {top_n}/{len(pos)} = {top_n/len(pos):.3f}")
            say("  Prueba: McNemar exacto unilateral (estrategia mejor que la referencia), Holm sobre 3.")
            say()
        for m in models:
            raw, det = {}, {}
            for s in STRATEGIES:
                only_s = only_r = both = 0
                hits = 0
                for (mm, app, var), cell in table.items():
                    if mm != m or (app, var) not in pos:
                        continue
                    hs = hit_category(cell[s])
                    hr = cat_truth[(app, var)] == top
                    hits += hs
                    if hs and not hr:
                        only_s += 1
                    elif hr and not hs:
                        only_r += 1
                raw[s] = one_sided(only_s, only_r)
                det[s] = (hits, only_s, only_r)
            holm = st.holm(raw)
            out[m] = {}
            for s in STRATEGIES:
                hits, only_s, only_r = det[s]
                better = only_s > only_r
                rej = holm[s] < ALPHA and better
                out[m][s] = {"hits": hits, "only_s": only_s, "only_ref": only_r, "p": raw[s],
                             "p_holm": holm[s], "reject": rej, "ref_hits": top_n, "n": len(pos)}
                if not quiet:
                    say(f"  {m:<15} {s:<11} aciertos {hits:>2}/{len(pos)} (ref {top_n})  solo estrategia {only_s:>2}  "
                        f"solo ref {only_r:>2}  p={pfmt(raw[s]):>9}  Holm={pfmt(holm[s]):>9}  "
                        + ("RECHAZA H0-6" if rej else "no rechaza"))
        if not quiet:
            say()
        return out

    report["h06"] = h06()

    # --- ED-1 ------------------------------------------------------------------
    say("=" * 78)
    say("ED-1 (DESCRIPTIVA): FALSOS POSITIVOS EN LOS 6 PARES CON DEFECTO PREEXISTENTE")
    say("=" * 78)
    say()
    say("  Sin contraste: con 6 discordancias en una direccion el McNemar exacto bilateral")
    say("  da p=0,03125 y no supera el primer umbral de Holm de una familia de 3 (0,0167).")
    say("  Intervalo de Wilson del 95 %. Los fallos no cuentan como falso positivo.")
    say()
    say("  modelo           " + "".join(f"{s:>26}" for s in STRATEGIES))
    report["ed1"] = {}
    pooled = {s: [0, 0] for s in STRATEGIES}
    for m in models:
        cells = []
        for s in STRATEGIES:
            k = n = 0
            for (mm, app, var), cell in table.items():
                if mm != m or label_of(cell) != "preexisting":
                    continue
                n += 1
                fp = false_positive(cell[s])
                k += 1 if fp else 0
            lo, hi = wilson(k, n)
            cells.append(f"{k}/{n} [{lo:.2f},{hi:.2f}]")
            pooled[s][0] += k
            pooled[s][1] += n
            report["ed1"].setdefault(m, {})[s] = {"fp": k, "n": n, "wilson": [lo, hi]}
        say(f"  {m:<15}  " + "".join(f"{c:>26}" for c in cells))
    cells = []
    for s in STRATEGIES:
        lo, hi = wilson(*pooled[s])
        cells.append(f"{pooled[s][0]}/{pooled[s][1]} [{lo:.2f},{hi:.2f}]")
    say(f"  {'4 modelos (desc.)':<15}  " + "".join(f"{c:>26}" for c in cells))
    say("  El agregado de los cuatro modelos es solo descriptivo: sus 24 observaciones no son independientes.")
    say()

    # --- sensibilidad AAA ------------------------------------------------------------
    say("=" * 78)
    say("SENSIBILIDAD: EXCLUIR LOS SEIS POSITIVOS AAA (3.2.5, operador CCB)")
    say("=" * 78)
    say()
    say("  Se recalculan H0-1, H0-2, H0-4 y H0-6 sin esos pares y se compara la decision.")
    say()
    base_det = report["h01_h02_main"]
    sens_det = {}
    for m in models:
        for hip, (a, b) in zip(["H0-1", "H0-2"], PAIRS_OF[:2]):
            pairs_ = [(hit_detection(c[a]), hit_detection(c[b])) for (mm, app, var), c in table.items()
                      if mm == m and (app, var) not in aaa and label_of(c) != "negative"]
            mc = st.mcnemar_exact(pairs_)
            sens_det[f"{m}|{hip}"] = (len(pairs_), mc.only_a, mc.only_b, mc.p_value)
    say("  H0-1 y H0-2 (52 pares)")
    say("  modelo          hip.   n   solo a  solo b      p     decision      decision con 58   cambia")
    changed = []
    for key, (n, oa, ob, p) in sens_det.items():
        m, hip = key.split("|")
        dec = "RECHAZA" if p < ALPHA else "no rechaza"
        was = base_det[key]["decision"]
        flag = "SI" if dec != was else "no"
        if flag == "SI":
            changed.append(key)
        say(f"  {m:<15} {hip:<5} {n:>3}   {oa:>5}   {ob:>5}  {pfmt(p):>9}   {dec:<12} {was:<16} {flag}")
        report.setdefault("sens_h01_h02", {})[key] = {"n": n, "only_a": oa, "only_b": ob, "p": p, "decision": dec, "changed": flag == "SI"}
    say()

    saved = (report["h04"],)
    cochran_family("H0-4", "", lambda lab: lab == "positive", hit_localization, "sens_h04", exclude=aaa, quiet=True)
    sens4 = report["sens_h04"]
    say("  H0-4 (36 positivos): Q de Cochran y comparaciones interpretables")
    for m in models:
        full_sig = {k for k, v in report["h04"][m]["pairs"].items() if v["significant"]}
        sens_sig = {k for k, v in sens4[m]["pairs"].items() if v["significant"]}
        diff = "sin cambios" if full_sig == sens_sig else f"CAMBIA: antes {sorted(full_sig)} ahora {sorted(sens_sig)}"
        say(f"    {m:<15} Q p={pfmt(sens4[m]['q_p'])} (42 pos: {pfmt(report['h04'][m]['q_p'])})  significativas tras Holm: {len(sens_sig)} de 3 · {diff}")
        if full_sig != sens_sig:
            changed.append(f"H0-4|{m}")
    say()
    sens6 = h06(exclude=aaa, quiet=True)
    report["sens_h06"] = sens6
    say("  H0-6 (36 positivos, referencia recalculada)")
    for m in models:
        for s in STRATEGIES:
            a, b = report["h06"][m][s], sens6[m][s]
            diff = "sin cambios" if a["reject"] == b["reject"] else "CAMBIA"
            if diff == "CAMBIA":
                changed.append(f"H0-6|{m}|{s}")
            say(f"    {m:<15} {s:<11} 42 pos: {'rechaza' if a['reject'] else 'no rechaza':<10} "
                f"36 pos: {'rechaza' if b['reject'] else 'no rechaza':<10} (ref {b['ref_hits']}/{b['n']}, Holm {pfmt(b['p_holm'])})  {diff}")
    say()
    say("  Resumen: " + ("la exclusion de los AAA NO cambia ninguna decision." if not changed
                         else f"la exclusion cambia {len(changed)} decision(es): " + ", ".join(changed)))
    report["sens_changed"] = changed
    say()

    OUT.mkdir(exist_ok=True)
    (OUT / f"confirmatorio-{args.block}.txt").write_text("\n".join(lines) + "\n", encoding="utf8")
    (OUT / f"confirmatorio-{args.block}.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf8")


if __name__ == "__main__":
    main()
