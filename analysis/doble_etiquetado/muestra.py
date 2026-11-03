#!/usr/bin/env python3
"""Muestra del doble etiquetado (Instrumento 4, sección 5 de docs/rubrica-clasificacion.md).

Saca 60 respuestas de modelo de la campaña principal, 5 por cada combinación de
modelo y estrategia (4 x 3 = 12 celdas), de forma reproducible, y escribe dos
archivos:

  muestra-ciega.json   Solo el identificador (R01..R60) y el texto de la
                       respuesta, en orden mezclado. Es lo único que ven las
                       personas que etiquetan: ni modelo, ni estrategia, ni
                       aplicación, ni clase del par, ni puntuación automática.

  clave-muestra.json   Qué es cada identificador y qué puntuó la rúbrica
                       automática. Se queda con quien coordina. Sirve para
                       comparar DESPUÉS de que las dos personas terminen.

Elegibles: filas resueltas por el modelo (no por la compuerta determinista) con
texto de respuesta. Las respuestas no interpretables SÍ son elegibles: son parte
de lo que la rúbrica debe poder clasificar.

Solo usa la biblioteca estándar.

  python3 analysis/doble_etiquetado/muestra.py
  python3 analysis/doble_etiquetado/muestra.py --resultados <full.jsonl> --salida <carpeta>
"""
import argparse
import hashlib
import json
import random
import sys
from pathlib import Path

SEMILLA = 20261102
POR_CELDA = 5

RAIZ = Path(__file__).resolve().parents[2]


def sha256(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def cargar_filas(ruta: Path) -> list[dict]:
    with ruta.open(encoding="utf8") as f:
        return [json.loads(linea) for linea in f if linea.strip()]


def verdad_de_terreno(app: str, variante: str, etiqueta: str) -> dict:
    """Lo que declara el manifiesto de la aplicación para esa variante."""
    manifiesto = RAIZ / "packages" / "benchmark" / "apps" / app / "app.json"
    declarada = {}
    if manifiesto.exists():
        datos = json.loads(manifiesto.read_text(encoding="utf8"))
        for v in datos.get("variants", []):
            if v.get("id") == variante:
                declarada = v.get("groundTruth") or {}
    return {
        "regresion": bool(declarada.get("regression", etiqueta == "positive")),
        "categoria": declarada.get("category"),
        "paso": declarada.get("expectedStep"),
    }


def resultado_automatico(fila: dict) -> str:
    """Celda de la matriz de confusión que dio la rúbrica automática."""
    puntuacion = fila.get("score")
    if not puntuacion:
        return "no-interpretable"
    return puntuacion.get("outcome") or "no-interpretable"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--resultados", default=str(RAIZ / "packages" / "benchmark" / "data" / "results" / "full.jsonl"))
    ap.add_argument("--salida", default=str(Path(__file__).resolve().parent))
    args = ap.parse_args()

    ruta = Path(args.resultados)
    filas = cargar_filas(ruta)
    elegibles = [f for f in filas if f.get("resolvedBy") == "model" and (f.get("raw") or "").strip()]

    celdas: dict[tuple[str, str], list[dict]] = {}
    for f in elegibles:
        celdas.setdefault((f["model"], f["strategy"]), []).append(f)

    rng = random.Random(SEMILLA)
    elegidas: list[dict] = []
    for celda in sorted(celdas):
        # Orden determinista antes de sortear: el resultado no depende del orden del archivo.
        pool = sorted(celdas[celda], key=lambda f: (f["app"], f["variant"], f.get("repetition", 1)))
        if len(pool) < POR_CELDA:
            print(f"La celda {celda} tiene solo {len(pool)} respuestas elegibles", file=sys.stderr)
            return 1
        elegidas.extend(rng.sample(pool, POR_CELDA))

    rng.shuffle(elegidas)
    if len(elegidas) != POR_CELDA * len(celdas):
        print("Tamaño de muestra inesperado", file=sys.stderr)
        return 1

    ciega = {
        "version": 1,
        "semilla": SEMILLA,
        "total": len(elegidas),
        "respuestas": [{"id": f"R{i:02d}", "respuesta": f["raw"]} for i, f in enumerate(elegidas, start=1)],
    }
    clave = {
        "version": 1,
        "semilla": SEMILLA,
        "por_celda": POR_CELDA,
        "fuente": str(ruta.name),
        "fuente_sha256": sha256(ruta),
        "aviso": "Archivo del coordinador. No compartir con quienes etiquetan antes de que terminen.",
        "filas": [
            {
                "id": f"R{i:02d}",
                "modelo": f["model"],
                "estrategia": f["strategy"],
                "app": f["app"],
                "variante": f["variant"],
                "clase": f["label"],
                "automatico": resultado_automatico(f),
                # Solo definidos en verdaderos positivos (ver score.ts).
                "automatico_categoria_correcta": (f.get("score") or {}).get("category"),
                "automatico_paso_exacto": (f.get("score") or {}).get("transition"),
                "esperado": verdad_de_terreno(f["app"], f["variant"], f["label"]),
            }
            for i, f in enumerate(elegidas, start=1)
        ],
    }

    salida = Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "muestra-ciega.json").write_text(json.dumps(ciega, ensure_ascii=False, indent=2), encoding="utf8")
    (salida / "clave-muestra.json").write_text(json.dumps(clave, ensure_ascii=False, indent=2), encoding="utf8")

    print(f"Elegibles: {len(elegibles)} de {len(filas)} filas · celdas: {len(celdas)} · muestra: {len(elegidas)}")
    print(f"Semilla {SEMILLA} · fuente {ruta.name} sha256 {clave['fuente_sha256'][:12]}")
    print(f"Escrito en {salida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
