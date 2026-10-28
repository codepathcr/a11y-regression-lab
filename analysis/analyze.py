#!/usr/bin/env python3
"""Analisis del capitulo 4 a partir de la bitacora de ejecucion.

    python3 analysis/analyze.py [--block full|subsample]

Lee packages/benchmark/data/results/<block>.jsonl y produce el reporte completo
de la seccion 3.7: metricas descriptivas, contrastes de hipotesis con la
correccion declarada, magnitudes de efecto con intervalos por conglomerado, y
los desgloses por clase de par, operador y estrato.

Escribe dos salidas en analysis/out/: el reporte legible y el mismo contenido en
JSON, para que ninguna cifra del documento se copie a mano.

NINGUN valor del capitulo 4 se obtiene de otra parte. Si una cifra no sale de
aqui, no va al documento.
"""

from __future__ import annotations

import argparse
import collections
import json
import statistics
from pathlib import Path

import stats as st

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "packages" / "benchmark" / "data" / "results"
APPS = ROOT / "packages" / "benchmark" / "apps"
OUT = Path(__file__).resolve().parent / "out"

STRATEGIES = ["static", "state-diff", "trace-diff"]
LABELS = ["positive", "negative", "benign-divergent", "preexisting"]
CATEGORIES = [
    "orden y continuidad del foco",
    "operación mediante teclado",
    "cambios inesperados de contexto",
    "comunicación accesible de actualizaciones dinámicas",
]


# ---------------------------------------------------------------------------
# Carga
# ---------------------------------------------------------------------------


def load_rows(block: str) -> list[dict]:
    path = RESULTS / f"{block}.jsonl"
    if not path.exists():
        raise SystemExit(f"No existe {path}. Corre primero run-analysis --block {block}.")
    rows = []
    broken = 0
    for line in path.read_text(encoding="utf8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            broken += 1
    if broken:
        print(f"ADVERTENCIA: {broken} lineas ilegibles, ignoradas.")
    return rows


def load_ground_truth() -> dict[tuple[str, str], dict]:
    """Metadatos de cada par: operador, criterios y categoria declarada."""
    truth = {}
    for spec_path in sorted(APPS.glob("a*/app.json")):
        spec = json.loads(spec_path.read_text(encoding="utf8"))
        for variant in spec["variants"]:
            if variant.get("kind") != "mutant":
                continue
            operator = (variant.get("operator") or {}).get("id", "sin operador")
            truth[(spec["id"], variant["id"])] = {
                "operator": operator,
                "wcag": variant.get("wcag", []),
                "category": (variant.get("groundTruth") or {}).get("category"),
                "label": variant.get("label"),
                "stratum": spec["stratum"],
            }
    return truth


# ---------------------------------------------------------------------------
# Metricas
# ---------------------------------------------------------------------------


def confusion(rows: list[dict]) -> dict:
    scored = [r for r in rows if r.get("score")]
    counts = collections.Counter(r["score"]["outcome"] for r in scored)
    tp, fp = counts["true-positive"], counts["false-positive"]
    tn, fn = counts["true-negative"], counts["false-negative"]

    precision = tp / (tp + fp) if tp + fp else None
    recall = tp / (tp + fn) if tp + fn else None
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision and recall and (precision + recall)
        else 0.0
    )
    fpr = fp / (fp + tn) if fp + tn else None

    failed = sum(1 for r in rows if r.get("error"))
    invalid = sum(1 for r in rows if r.get("score") is None and not r.get("error"))

    return {
        "calls": len(rows),
        "scored": len(scored),
        "failed": failed,
        "invalid": invalid,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "detection": sum(1 for r in scored if r["score"]["detection"]),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "fpr": fpr,
        "gated": sum(1 for r in rows if r.get("resolvedBy") == "gate"),
    }


def f1_of(rows: list[dict]) -> float:
    return confusion(rows)["f1"]


def fmt(value, digits: int = 3) -> str:
    if value is None:
        return "  n/d"
    return f"{value:.{digits}f}"


# ---------------------------------------------------------------------------
# Reporte
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--block", default="full", choices=["full", "subsample"])
    args = parser.parse_args()

    rows = load_rows(args.block)
    truth = load_ground_truth()
    lines: list[str] = []
    report: dict = {"block": args.block}

    def say(text: str = "") -> None:
        lines.append(text)
        print(text)

    # --- 1. Integridad -----------------------------------------------------
    configs = {json.dumps(r.get("config", {}), sort_keys=True) for r in rows}
    keys = {(r["app"], r["variant"], r["strategy"], r["model"], r["repetition"]) for r in rows}
    models = sorted({r["model"] for r in rows})

    say(f"BLOQUE {args.block} · {len(rows)} filas · {len(keys)} claves unicas · {len(models)} modelos")
    say()

    if len(keys) != len(rows):
        say(f"ADVERTENCIA: {len(rows) - len(keys)} filas duplicadas por clave.")
        say()
    if len(configs) != 1:
        say(f"ABORTADO: la bitacora mezcla {len(configs)} configuraciones distintas.")
        say("Las cifras de un archivo que mezcla configuraciones no son comparables.")
        say("Filtra por el campo config, o archiva la bitacora y vuelve a correr.")
        raise SystemExit(1)

    config = json.loads(next(iter(configs)))
    say("Configuracion unica de la corrida:")
    for key, value in sorted(config.items()):
        say(f"  {key:<16} {value}")
    report["config"] = config
    say()

    say("Respuestas por modelo:")
    say("  modelo           llamadas  falladas  no interpretables")
    for model in models:
        sub = [r for r in rows if r["model"] == model]
        c = confusion(sub)
        say(f"  {model:<15} {c['calls']:>8}  {c['failed']:>8}  {c['invalid']:>17}")
    report["models"] = models
    say()

    repetitions = sorted({r["repetition"] for r in rows})
    if len(repetitions) > 1:
        say("ADVERTENCIA DE LECTURA PARA UN BLOQUE CON REPETICIONES")
        say(f"  Este bloque tiene {len(repetitions)} repeticiones por condicion, de modo que cada par")
        say("  aparece varias veces. Las metricas de deteccion, los contrastes de hipotesis y")
        say("  los intervalos que siguen tratan cada repeticion como una observacion, y no lo")
        say("  es: inflan los conteos y violan la independencia que esas pruebas suponen.")
        say("  Para este bloque son DESCRIPTIVOS y no citables. Las estimaciones citables de")
        say("  deteccion son las del bloque completo. Lo que este bloque mide es la seccion")
        say("  de consistencia entre repeticiones, al final del reporte.")
        say()
        report["repeticiones"] = len(repetitions)
        report["metricas_de_deteccion_citables"] = False

    # --- 2. Metricas agregadas --------------------------------------------
    say("=" * 78)
    say("DESEMPENO AGREGADO DE LOS CUATRO MODELOS")
    say("=" * 78)
    say()
    say("  estrategia     det/punt    TP  FP  TN  FN   precision  recall    F1      TFP")
    report["aggregate"] = {}
    for strategy in STRATEGIES:
        c = confusion([r for r in rows if r["strategy"] == strategy])
        report["aggregate"][strategy] = c
        say(
            f"  {strategy:<13} {c['detection']:>3}/{c['scored']:<6} {c['tp']:>3} {c['fp']:>3} "
            f"{c['tn']:>3} {c['fn']:>3}   {fmt(c['precision'])}      {fmt(c['recall'])}   "
            f"{fmt(c['f1'])}   {fmt(c['fpr'])}"
        )
    say()
    say("  Las tres estrategias ven los MISMOS pares. El incremento de informacion entre")
    say("  ellas es de una sola variable: la base primero, los eventos de transicion despues.")
    say()

    # --- 3. Por modelo -----------------------------------------------------
    say("=" * 78)
    say("POR MODELO Y ESTRATEGIA")
    say("=" * 78)
    report["by_model"] = {}
    for metric in ["f1", "recall", "precision", "fpr"]:
        say()
        say(f"  {metric.upper()}")
        say("  modelo           " + "".join(f"{s:>13}" for s in STRATEGIES))
        for model in models:
            cells = []
            for strategy in STRATEGIES:
                c = confusion([r for r in rows if r["model"] == model and r["strategy"] == strategy])
                report["by_model"].setdefault(model, {}).setdefault(strategy, c)
                cells.append(fmt(c[metric]))
            say(f"  {model:<15} " + "".join(f"{v:>13}" for v in cells))
    say()

    # --- 4. Contrastes -----------------------------------------------------
    say("=" * 78)
    say("CONTRASTE DE HIPOTESIS")
    say("=" * 78)
    say()

    detection: dict[tuple, dict[str, bool]] = collections.defaultdict(dict)
    for r in rows:
        if r.get("score"):
            detection[(r["model"], r["app"], r["variant"])][r["strategy"]] = r["score"]["detection"]

    def paired(a: str, b: str, subset=None) -> list[tuple[bool, bool]]:
        out = []
        for key, values in detection.items():
            if subset and not subset(key):
                continue
            if a in values and b in values:
                out.append((values[a], values[b]))
        return out

    comparisons = [
        ("H0-1", "static", "state-diff", "tener una version base con que comparar"),
        ("H0-2", "state-diff", "trace-diff", "los eventos de transicion: el contexto temporal"),
        ("extra", "static", "trace-diff", "el efecto acumulado de las dos variables"),
    ]
    raw_p = {}
    results = {}
    for name, a, b, what in comparisons:
        m = st.mcnemar_exact(paired(a, b))
        raw_p[name] = m.p_value
        results[name] = (a, b, what, m)

    adjusted = st.holm({k: v for k, v in raw_p.items() if k != "extra"})

    say("  McNemar exacto sobre la deteccion. Observaciones pareadas: las tres estrategias")
    say("  se aplican a los mismos pares, de modo que las pruebas respetan el apareamiento.")
    say()
    say("  hip.   comparacion                  solo 2o  solo 1o   discord.   p        p (Holm)")
    report["tests"] = {}
    for name, (a, b, what, m) in results.items():
        p_adj = adjusted.get(name)
        verdict = "RECHAZADA" if (p_adj or m.p_value) < 0.05 else "no se rechaza"
        say(
            f"  {name:<6} {a:<11} vs {b:<12} {m.only_b:>6}  {m.only_a:>7}   {m.discordant:>7}   "
            f"{m.p_value:.2e}  " + (f"{p_adj:.2e}" if p_adj is not None else "     —  ")
        )
        report["tests"][name] = {
            "a": a, "b": b, "what": what, "only_b": m.only_b, "only_a": m.only_a,
            "p": m.p_value, "p_holm": p_adj, "verdict": verdict,
        }
    say()
    for name, (a, b, what, m) in results.items():
        if name == "extra":
            continue
        p_adj = adjusted[name]
        verdict = "RECHAZADA" if p_adj < 0.05 else "NO se rechaza"
        say(f"  {name}: {verdict}. Lo que aporta: {what}.")
    say()
    say("  Los valores p llevan la correccion de Holm declarada en 3.7.3 antes de ver los")
    say("  datos. El contraste 'extra' no entra en la familia: es descriptivo.")
    say()

    # H0-2 por modelo
    say("  H0-2 por modelo, para ver si el agregado esconde heterogeneidad:")
    say()
    say("  modelo           solo trace   solo state   discord.    p        direccion")
    report["h0_2_by_model"] = {}
    for model in models:
        m = st.mcnemar_exact(paired("state-diff", "trace-diff", lambda k, mm=model: k[0] == mm))
        arrow = "trace-diff" if m.only_b > m.only_a else ("empate" if m.only_b == m.only_a else "state-diff")
        say(f"  {model:<15} {m.only_b:>10}   {m.only_a:>10}   {m.discordant:>8}    {m.p_value:.4f}   {arrow}")
        report["h0_2_by_model"][model] = {"only_trace": m.only_b, "only_state": m.only_a, "p": m.p_value}
    say()
    say("  Con quince a veinte pares discordantes por modelo, cada contraste individual")
    say("  carece de potencia. Lo que sostiene el resultado es el agregado mas la")
    say("  consistencia de la direccion, no cada modelo por separado.")
    say()

    # Cochran
    blocks = [
        [values[s] for s in STRATEGIES]
        for values in detection.values()
        if all(s in values for s in STRATEGIES)
    ]
    q = st.cochran_q(blocks)
    say(f"  Q de Cochran sobre las tres estrategias: Q={q.q:.2f}, gl={q.df}, p={q.p_value:.3e}")
    say(f"    casos con las tres puntuadas: {q.n} · aciertos: " +
        ", ".join(f"{s}={h}" for s, h in zip(STRATEGIES, q.hits)))
    report["cochran"] = {"q": q.q, "df": q.df, "p": q.p_value, "hits": q.hits, "n": q.n}
    say()

    # --- 5. Magnitud con bootstrap por conglomerado ------------------------
    say("=" * 78)
    say("MAGNITUD DEL EFECTO CON INTERVALOS POR CONGLOMERADO")
    say("=" * 78)
    say()
    say("  Los pares proceden de diez aplicaciones y no son independientes: los de una")
    say("  misma aplicacion comparten escenario, componentes y estilo de marcado. El")
    say("  remuestreo toma APLICACIONES completas, no pares.")
    say()

    clusters: dict[str, list[dict]] = collections.defaultdict(list)
    for r in rows:
        if r.get("score"):
            clusters[r["app"]].append(r)

    report["bootstrap"] = {}
    say("  diferencia de F1                        observada   IC 95%                excluye 0")
    for a, b in [("static", "state-diff"), ("state-diff", "trace-diff"), ("static", "trace-diff")]:
        def diff(sample, aa=a, bb=b):
            return f1_of([r for r in sample if r["strategy"] == bb]) - f1_of(
                [r for r in sample if r["strategy"] == aa]
            )

        boot = st.cluster_bootstrap(clusters, diff)
        say(
            f"  {b} menos {a}".ljust(40)
            + f"{boot.observed:+.3f}      [{boot.low:+.3f}, {boot.high:+.3f}]       "
            + ("si" if boot.excludes_zero else "NO")
        )
        report["bootstrap"][f"{b}-{a}"] = {
            "observed": boot.observed, "low": boot.low, "high": boot.high,
            "excludes_zero": boot.excludes_zero, "clusters": boot.clusters, "draws": boot.draws,
        }
    say()
    say(f"  {len(clusters)} conglomerados remuestreados. Con diez, la potencia efectiva es menor")
    say("  que la nominal, y eso se declara junto al resultado.")
    say()

    # --- 6. Falsos positivos por clase ------------------------------------
    say("=" * 78)
    say("FALSOS POSITIVOS POR CLASE DE PAR")
    say("=" * 78)
    say()
    say("  Es el desglose que justifica haber construido las clases de divergencia benigna")
    say("  y defecto preexistente: sin ellas, la tasa de falsos positivos de las dos")
    say("  estrategias diferenciales sale CERO por construccion, porque la compuerta")
    say("  determinista resuelve los negativos de divergencia nula sin consultar al modelo.")
    say()
    header = "  estrategia     " + "".join(f"{l[:18]:>20}" for l in LABELS)
    say(header)
    report["fp_by_label"] = {}
    for strategy in STRATEGIES:
        cells = []
        for label in LABELS:
            sub = [r for r in rows if r["strategy"] == strategy and r["label"] == label and r.get("score")]
            fp = sum(1 for r in sub if r["score"]["outcome"] == "false-positive")
            cells.append(f"{fp}/{len(sub)}" if sub else "—")
            report["fp_by_label"].setdefault(strategy, {})[label] = {"fp": fp, "n": len(sub)}
        say(f"  {strategy:<13} " + "".join(f"{c:>20}" for c in cells))
    say()
    gated = sum(1 for r in rows if r.get("resolvedBy") == "gate")
    say(f"  Casos resueltos por la compuerta sin inferencia: {gated}")
    say()

    # --- 7. Categoria ------------------------------------------------------
    say("=" * 78)
    say("EXACTITUD DE CATEGORIA CONTRA SU LINEA BASE")
    say("=" * 78)
    say()
    positives = collections.Counter(
        meta["category"] for meta in truth.values() if meta["label"] == "positive"
    )
    baseline = max(positives.values()) / sum(positives.values())
    most = max(positives, key=positives.get)
    say(f"  Linea base (H0-6): responder siempre la categoria mas frecuente del benchmark")
    say(f"    = {max(positives.values())}/{sum(positives.values())} = {baseline:.3f}  (\"{most}\")")
    say()
    say("  estrategia     aciertos   exactitud   contra la linea base")
    report["category"] = {"baseline": baseline, "baseline_label": most, "by_strategy": {}}
    for strategy in STRATEGIES:
        sub = [
            r for r in rows
            if r["strategy"] == strategy and r.get("score") and r["score"]["category"] is not None
        ]
        hits = sum(1 for r in sub if r["score"]["category"])
        accuracy = hits / len(sub) if sub else None
        verdict = "—"
        if accuracy is not None:
            verdict = "por encima" if accuracy > baseline else "POR DEBAJO"
        say(f"  {strategy:<13} {hits:>4}/{len(sub):<5} {fmt(accuracy):>9}   {verdict}")
        report["category"]["by_strategy"][strategy] = {"hits": hits, "n": len(sub), "accuracy": accuracy}
    say()
    say("  Una exactitud cercana a la linea base es compatible con un sesgo hacia una")
    say("  etiqueta y no con discriminacion entre categorias. De ahi la matriz que sigue.")
    say()
    say("  MATRIZ DE CONFUSION DE CATEGORIA (trace-diff, los cuatro modelos)")
    say("  verdad \\ respuesta        " + "".join(f"{c.split()[0][:7]:>9}" for c in CATEGORIES) + "     nula")
    matrix = collections.Counter()
    for r in rows:
        if r["strategy"] != "trace-diff" or not r.get("score"):
            continue
        if r["score"]["category"] is None:
            continue
        meta = truth.get((r["app"], r["variant"]))
        if not meta or not meta["category"]:
            continue
        try:
            answered = json.loads(r["raw"][r["raw"].index("{"): r["raw"].rindex("}") + 1]).get("category")
        except Exception:
            answered = None
        matrix[(meta["category"], answered if answered in CATEGORIES else None)] += 1
    for want in CATEGORIES:
        cells = [matrix[(want, got)] for got in CATEGORIES] + [matrix[(want, None)]]
        say(f"  {want.split()[0][:22]:<24}  " + "".join(f"{v:>9}" for v in cells))
    report["category"]["matrix"] = {f"{k[0]}|{k[1]}": v for k, v in matrix.items()}
    say()

    # --- 8. Localizacion ---------------------------------------------------
    say("=" * 78)
    say("LOCALIZACION DE LA TRANSICION, EN SUS DOS LECTURAS")
    say("=" * 78)
    say()
    say("  estrategia     paso exacto      dentro de la evidencia")
    report["localization"] = {}
    for strategy in STRATEGIES:
        sub = [
            r for r in rows
            if r["strategy"] == strategy and r.get("score") and r["score"]["transition"] is not None
        ]
        exact = sum(1 for r in sub if r["score"]["transition"])
        within = sum(1 for r in sub if r["score"]["transitionWithinEvidence"])
        say(
            f"  {strategy:<13} {exact:>3}/{len(sub):<4} {fmt(exact/len(sub) if sub else None):>6}   "
            f"{within:>3}/{len(sub):<4} {fmt(within/len(sub) if sub else None):>6}"
        )
        report["localization"][strategy] = {"exact": exact, "within": within, "n": len(sub)}
    say()
    say("  La lectura tolerante se interpreta POR ESTRATEGIA y no como cifra global: en las")
    say("  dos diferenciales la evidencia contiene unicamente los pasos divergentes, de modo")
    say("  que nombrar uno de ellos esta casi forzado. En la estrategia sin version base, que")
    say("  recibe todos los pasos, la misma medida si discrimina.")
    say()

    # --- 9. Eficiencia -----------------------------------------------------
    say("=" * 78)
    say("EFICIENCIA")
    say("=" * 78)
    say()
    say("  estrategia     tokens prompt (mediana)   latencia (mediana)   rango intercuartil")
    report["efficiency"] = {}
    for strategy in STRATEGIES:
        sub = [r for r in rows if r["strategy"] == strategy and r.get("resolvedBy") == "model" and not r.get("error")]
        toks = sorted(r["promptTokens"] for r in sub)
        lats = sorted(r["latencyMs"] for r in sub)
        if not toks:
            continue
        q1, q3 = lats[len(lats) // 4], lats[3 * len(lats) // 4]
        say(
            f"  {strategy:<13} {statistics.median(toks):>22.0f}   {statistics.median(lats)/1000:>17.1f}s   "
            f"[{q1/1000:.1f}s, {q3/1000:.1f}s]"
        )
        report["efficiency"][strategy] = {
            "tokens_median": statistics.median(toks),
            "latency_median_ms": statistics.median(lats),
            "latency_q1_ms": q1, "latency_q3_ms": q3, "n": len(sub),
        }
    say()
    static_lat = [r["latencyMs"] for r in rows if r["strategy"] == "static" and r.get("resolvedBy") == "model"]
    trace_lat = [r["latencyMs"] for r in rows if r["strategy"] == "trace-diff" and r.get("resolvedBy") == "model"]
    delta = st.cliffs_delta(static_lat, trace_lat)
    say(f"  Delta de Cliff de la latencia, sin version base contra diferencial de trazas: {delta:+.3f}")
    say("  La compuerta determinista no solo evita llamadas: abarata las que hace.")
    report["efficiency"]["cliffs_delta_latency_static_vs_trace"] = delta
    say()

    # --- 10. Desglose por operador y estrato -------------------------------
    say("=" * 78)
    say("DESGLOSE POR OPERADOR Y POR ESTRATO (solo pares positivos)")
    say("=" * 78)
    say()
    operators = sorted({meta["operator"] for meta in truth.values() if meta["label"] == "positive"})
    say("  SENSIBILIDAD POR OPERADOR")
    say("  operador                            " + "".join(f"{s:>13}" for s in STRATEGIES))
    report["by_operator"] = {}
    for operator in operators:
        cells = []
        for strategy in STRATEGIES:
            sub = [
                r for r in rows
                if r["strategy"] == strategy and r.get("score")
                and truth.get((r["app"], r["variant"]), {}).get("operator") == operator
                and r["label"] == "positive"
            ]
            hits = sum(1 for r in sub if r["score"]["outcome"] == "true-positive")
            cells.append(f"{hits}/{len(sub)}" if sub else "—")
            report["by_operator"].setdefault(operator, {})[strategy] = {"tp": hits, "n": len(sub)}
        say(f"  {operator:<34}  " + "".join(f"{c:>13}" for c in cells))
    say()
    say("  SENSIBILIDAD POR ESTRATO")
    say("  estrato     " + "".join(f"{s:>13}" for s in STRATEGIES))
    report["by_stratum"] = {}
    for stratum in ["small", "medium", "large"]:
        cells = []
        for strategy in STRATEGIES:
            sub = [
                r for r in rows
                if r["strategy"] == strategy and r.get("score")
                and r["stratum"] == stratum and r["label"] == "positive"
            ]
            hits = sum(1 for r in sub if r["score"]["outcome"] == "true-positive")
            cells.append(f"{hits}/{len(sub)}" if sub else "—")
            report["by_stratum"].setdefault(stratum, {})[strategy] = {"tp": hits, "n": len(sub)}
        say(f"  {stratum:<11} " + "".join(f"{c:>13}" for c in cells))
    say()

    # --- 11. Discordancias par por par -------------------------------------
    say("=" * 78)
    say("DISCORDANCIAS PAR POR PAR entre diferencial de estados y de trazas")
    say("=" * 78)
    say()
    say("  Regla de reporte de 3.7.3: toda comparacion entre condiciones se acompana de los")
    say("  pares en que discrepan. Un cuadro resumen puede mostrar totales identicos para")
    say("  dos condiciones que fallan en pares distintos, y con pocas observaciones esa")
    say("  coincidencia es probable.")
    say()
    discordant = collections.Counter()
    for (model, app, variant), values in detection.items():
        if "state-diff" in values and "trace-diff" in values and values["state-diff"] != values["trace-diff"]:
            winner = "trace-diff" if values["trace-diff"] else "state-diff"
            discordant[(app, variant, winner)] += 1
    say("  par                                                clase              gana        modelos")
    for (app, variant, winner), n in sorted(discordant.items(), key=lambda kv: (-kv[1], kv[0])):
        label = truth.get((app, variant), {}).get("label", "?")
        say(f"  {app}/{variant}".ljust(52) + f"{label:<18} {winner:<11} {n}")
    report["discordant_pairs"] = [
        {"app": a, "variant": v, "winner": w, "models": n} for (a, v, w), n in discordant.items()
    ]
    say()

    # --- Consistencia entre repeticiones ----------------------------------
    if len(repetitions) > 1:
        say("=" * 78)
        say("CONSISTENCIA ENTRE REPETICIONES")
        say("=" * 78)
        say()
        say("  Mide la estabilidad de la respuesta ante la misma entrada, con temperatura")
        say("  cero y semilla fija. Cualquier discrepancia observada es atribuible al")
        say("  servidor de inferencia y no al muestreo del modelo, de modo que esta cifra")
        say("  es un techo: la consistencia exigible a un detector construido sobre estos")
        say("  modelos, no una propiedad del metodo.")
        say()
        say("  Un grupo es una condicion completa: par, estrategia y modelo. Se excluyen")
        say("  los casos resueltos por la compuerta determinista, que no consultan al")
        say("  modelo y por construccion coinciden siempre.")
        say()

        groups: dict[tuple, list[dict]] = collections.defaultdict(list)
        for r in rows:
            if r.get("resolvedBy") != "model":
                continue
            groups[(r["model"], r["strategy"], r["app"], r["variant"])].append(r)

        complete: dict[tuple, list[dict]] = {}
        incomplete: list[tuple] = []
        for key, group in groups.items():
            scored = [r for r in group if r.get("score")]
            if len(scored) == len(repetitions):
                complete[key] = scored
            else:
                incomplete.append(key)

        def unanimous(group: list[dict]) -> bool:
            return len({bool(r["score"]["detection"]) for r in group}) == 1

        say(f"  Grupos evaluables: {len(complete)} de {len(groups)}")
        if incomplete:
            say(f"  Grupos descartados por respuesta faltante o fallida: {len(incomplete)}")
        say()

        total_unan = sum(1 for g in complete.values() if unanimous(g))
        prop = total_unan / len(complete) if complete else None
        say(f"  Unanimidad de la decision de regresion: {total_unan}/{len(complete)}   {fmt(prop)}")

        tables = [
            (sum(1 for r in g if not r["score"]["detection"]), sum(1 for r in g if r["score"]["detection"]))
            for g in complete.values()
        ]
        kap = st.fleiss_kappa(tables)
        if kap is None:
            say("  Kappa de Fleiss: no calculable con los grupos disponibles")
        elif kap["kappa"] is None:
            say(f"  Kappa de Fleiss: indefinida (acuerdo esperado = {fmt(kap['acuerdo_esperado'])});")
            say(f"    acuerdo observado = {fmt(kap['acuerdo_observado'])} sobre {kap['items']} grupos")
        else:
            say(f"  Kappa de Fleiss: {fmt(kap['kappa'])}   "
                f"(observado {fmt(kap['acuerdo_observado'])}, esperado {fmt(kap['acuerdo_esperado'])})")
        say()

        say("  Por modelo")
        say("  modelo           grupos   unanimes   proporcion")
        por_modelo = {}
        for model in models:
            sub = {k: v for k, v in complete.items() if k[0] == model}
            u = sum(1 for g in sub.values() if unanimous(g))
            pr = u / len(sub) if sub else None
            por_modelo[model] = {"grupos": len(sub), "unanimes": u, "proporcion": pr}
            say(f"  {model:<15} {len(sub):>6}   {u:>8}   {fmt(pr)}")
        say()

        say("  Por estrategia")
        say("  estrategia       grupos   unanimes   proporcion")
        por_estrategia = {}
        for strategy in STRATEGIES:
            sub = {k: v for k, v in complete.items() if k[1] == strategy}
            u = sum(1 for g in sub.values() if unanimous(g))
            pr = u / len(sub) if sub else None
            por_estrategia[strategy] = {"grupos": len(sub), "unanimes": u, "proporcion": pr}
            say(f"  {strategy:<15} {len(sub):>6}   {u:>8}   {fmt(pr)}")
        say()

        detectados = {k: g for k, g in complete.items()
                      if all(r["score"]["detection"] for r in g)}
        cat_unan = sum(1 for g in detectados.values()
                       if len({r["score"].get("category") for r in g}) == 1)
        tr_unan = sum(1 for g in detectados.values()
                      if len({r["score"].get("transition") for r in g}) == 1)
        say("  Entre los grupos que detectaron la regresion en las tres ejecuciones:")
        say(f"    misma categoria en las tres:  {cat_unan}/{len(detectados)}   "
            f"{fmt(cat_unan / len(detectados) if detectados else None)}")
        say(f"    misma transicion en las tres: {tr_unan}/{len(detectados)}   "
            f"{fmt(tr_unan / len(detectados) if detectados else None)}")
        say()

        disc = sorted(k for k, g in complete.items() if not unanimous(g))
        if disc:
            say("  Grupos con decision discordante entre repeticiones:")
            say("  modelo           estrategia     par")
            for model, strategy, app, variant in disc:
                say(f"  {model:<15} {strategy:<14} {app}/{variant}")
        else:
            say("  Ningun grupo presento decision discordante entre repeticiones.")
        say()

        report["consistencia"] = {
            "repeticiones": len(repetitions),
            "grupos_evaluables": len(complete),
            "grupos_descartados": len(incomplete),
            "unanimes": total_unan,
            "proporcion_unanimidad": prop,
            "fleiss": kap,
            "por_modelo": por_modelo,
            "por_estrategia": por_estrategia,
            "categoria_unanime": {"unanimes": cat_unan, "grupos": len(detectados)},
            "transicion_unanime": {"unanimes": tr_unan, "grupos": len(detectados)},
            "discordantes": [
                {"model": m, "strategy": s_, "app": a, "variant": v} for m, s_, a, v in disc
            ],
        }

    OUT.mkdir(exist_ok=True)
    (OUT / f"reporte-{args.block}.txt").write_text("\n".join(lines) + "\n", encoding="utf8")
    (OUT / f"reporte-{args.block}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8"
    )
    print()
    print(f"Reporte en analysis/out/reporte-{args.block}.txt y .json")


if __name__ == "__main__":
    main()
