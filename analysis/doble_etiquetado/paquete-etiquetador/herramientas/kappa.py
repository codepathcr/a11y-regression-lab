#!/usr/bin/env python3
"""Concordancia entre dos personas que etiquetaron la misma hoja.

Calcula, campo por campo, el acuerdo observado y la kappa de Cohen, y lista los
desacuerdos para la sesión de resolución. Con --clave compara además cada
lectura humana con la rúbrica automática.

  pip install -r herramientas/requirements.txt
  python herramientas/kappa.py --a hoja-monika.xlsx --b hoja-victor.xlsx
  python herramientas/kappa.py --a ... --b ... --clave clave-muestra.json --informe informe.md

Reglas del procedimiento (docs/rubrica-clasificacion.md, sección 5; documento
de investigación, sección de validación del Instrumento 4):
  · la kappa se calcula sobre las clasificaciones independientes, ANTES de
    resolver los desacuerdos;
  · el umbral previsto es 0,80.

La kappa de Cohen sin ponderar se define así, con po el acuerdo observado y pe el
acuerdo esperado por azar (suma, sobre cada valor, del producto de las
proporciones marginales de las dos personas):  kappa = (po - pe) / (1 - pe).
Si pe vale 1 (las dos personas usaron un solo valor en todo el campo) la kappa no
está definida y se informa solo el acuerdo observado.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook

UMBRAL = 0.80
REGRESION = {"sí", "no", "no interpretable"}
CATEGORIAS = {
    "orden y continuidad del foco",
    "operación mediante teclado",
    "cambios inesperados de contexto",
    "comunicación accesible de actualizaciones dinámicas",
    "ninguna o ausente",
    "otra (no es una de las cuatro)",
    "no aplica",
}
CAMPOS = ["regresion", "categoria", "paso"]


def normalizar_paso(valor) -> str | None:
    """'5', 5 y 5.0 son el mismo paso. Devuelve None si no es válido."""
    if valor is None:
        return None
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return str(int(valor)) if float(valor).is_integer() and valor >= 0 else None
    texto = str(valor).strip().lower()
    if texto in ("ninguno", "no aplica"):
        return texto
    if texto.isdigit():
        return str(int(texto))
    return None


def leer_hoja(ruta: Path) -> tuple[dict[str, dict[str, str]], list[str]]:
    """Devuelve {id: {regresion, categoria, paso, notas}} y la lista de problemas."""
    libro = load_workbook(ruta, data_only=True)
    if "Hoja" not in libro.sheetnames:
        return {}, [f"{ruta.name}: no tiene la pestaña 'Hoja'"]
    hoja = libro["Hoja"]
    encabezado = [str(c.value).strip().lower() if c.value is not None else "" for c in hoja[1]]
    try:
        col = {nombre: encabezado.index(nombre) for nombre in ("id", "regresion", "categoria", "paso", "notas")}
    except ValueError as error:
        return {}, [f"{ruta.name}: falta una columna del encabezado ({error})"]

    filas: dict[str, dict[str, str]] = {}
    problemas: list[str] = []
    for fila in hoja.iter_rows(min_row=2, values_only=True):
        id_ = fila[col["id"]]
        if id_ is None or str(id_).strip() == "":
            continue
        id_ = str(id_).strip()
        regresion = (str(fila[col["regresion"]]).strip().lower() if fila[col["regresion"]] is not None else "")
        categoria = (str(fila[col["categoria"]]).strip().lower() if fila[col["categoria"]] is not None else "")
        paso = normalizar_paso(fila[col["paso"]])
        notas = str(fila[col["notas"]]).strip() if fila[col["notas"]] is not None else ""
        if regresion == "si":
            regresion = "sí"
        if regresion not in REGRESION:
            problemas.append(f"{ruta.name} {id_}: 'regresion' vacía o no válida ({regresion!r})")
        if categoria not in CATEGORIAS:
            problemas.append(f"{ruta.name} {id_}: 'categoria' vacía o no válida ({categoria!r})")
        if paso is None:
            problemas.append(f"{ruta.name} {id_}: 'paso' vacío o no válido ({fila[col['paso']]!r})")
        if regresion == "no interpretable" and (categoria != "no aplica" or paso != "no aplica"):
            problemas.append(f"{ruta.name} {id_}: si no es interpretable, categoría y paso deben ser 'no aplica'")
        filas[id_] = {"regresion": regresion, "categoria": categoria, "paso": paso or "", "notas": notas}
    return filas, problemas


def kappa_cohen(a: list[str], b: list[str]) -> tuple[float, float | None]:
    """(acuerdo observado, kappa). La kappa es None si no está definida."""
    n = len(a)
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    ca, cb = Counter(a), Counter(b)
    pe = sum((ca[v] / n) * (cb[v] / n) for v in set(ca) | set(cb))
    if pe >= 1.0:
        return po, None
    return po, (po - pe) / (1 - pe)


def resultado_humano(regresion: str, esperado_regresion: bool) -> str:
    """Celda de la matriz de confusión que resulta de la lectura de una persona."""
    if regresion == "no interpretable":
        return "no-interpretable"
    dijo_si = regresion == "sí"
    if dijo_si:
        return "true-positive" if esperado_regresion else "false-positive"
    return "false-negative" if esperado_regresion else "true-negative"


def comparar_con_clave(nombre: str, hoja: dict, clave: dict) -> list[str]:
    lineas = [f"#### {nombre} contra la rúbrica automática", ""]
    por_id = {f["id"]: f for f in clave["filas"]}
    celda = cat = pas = 0
    cat_n = pas_n = 0
    dif: list[str] = []
    for id_, lectura in sorted(hoja.items()):
        f = por_id.get(id_)
        if f is None:
            continue
        humano = resultado_humano(lectura["regresion"], f["esperado"]["regresion"])
        if humano == f["automatico"]:
            celda += 1
        else:
            dif.append(f"- {id_}: persona {humano}, automática {f['automatico']}")
        if humano == "true-positive" and f["automatico"] == "true-positive":
            cat_n += 1
            pas_n += 1
            cat += int((lectura["categoria"] == (f["esperado"]["categoria"] or "")) == bool(f["automatico_categoria_correcta"]))
            pas += int((lectura["paso"] == str(f["esperado"]["paso"])) == bool(f["automatico_paso_exacto"]))
    total = len(hoja)
    lineas.append(f"- Celda de la matriz de confusión: coincide en {celda} de {total}.")
    lineas.append(f"- En los verdaderos positivos que ambas lecturas comparten ({cat_n}): categoría coincide en {cat}, paso exacto coincide en {pas}.")
    if dif:
        lineas.append("")
        lineas.append("Diferencias de celda:")
        lineas.extend(dif)
    lineas.append("")
    return lineas


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--a", required=True, help="hoja de la primera persona (.xlsx)")
    ap.add_argument("--b", required=True, help="hoja de la segunda persona (.xlsx)")
    ap.add_argument("--nombre-a", default="Persona A")
    ap.add_argument("--nombre-b", default="Persona B")
    ap.add_argument("--clave", help="clave-muestra.json del coordinador (opcional)")
    ap.add_argument("--informe", help="escribir el informe también en este archivo (.md)")
    args = ap.parse_args()

    a, pa = leer_hoja(Path(args.a))
    b, pb = leer_hoja(Path(args.b))
    problemas = pa + pb
    if set(a) != set(b):
        problemas.append(f"Las hojas no tienen los mismos identificadores (A {len(a)}, B {len(b)}).")
    if problemas:
        print("Hay problemas en las hojas; la kappa no se calcula hasta corregirlos:")
        for p in problemas[:40]:
            print(f"  - {p}")
        if len(problemas) > 40:
            print(f"  ... y {len(problemas) - 40} más")
        return 2

    ids = sorted(a)
    n = len(ids)
    out: list[str] = [f"### Concordancia entre {args.nombre_a} y {args.nombre_b}", "", f"Respuestas etiquetadas por ambas: {n}.", ""]
    out += ["| Campo | Acuerdo observado | Kappa de Cohen | Desacuerdos | ¿Alcanza 0,80? |", "| --- | --- | --- | --- | --- |"]
    desacuerdos: list[str] = []
    for campo in CAMPOS:
        va = [a[i][campo] for i in ids]
        vb = [b[i][campo] for i in ids]
        po, k = kappa_cohen(va, vb)
        n_dif = sum(1 for x, y in zip(va, vb) if x != y)
        if k is None:
            kt, ok = "no definida (un solo valor)", "n/d" if n_dif else "sí (acuerdo total)"
        else:
            kt, ok = f"{k:.3f}", ("sí" if k >= UMBRAL else "no")
        out.append(f"| {campo} | {po:.3f} ({n - n_dif}/{n}) | {kt} | {n_dif} | {ok} |")
        for i, x, y in zip(ids, va, vb):
            if x != y:
                desacuerdos.append(f"| {i} | {campo} | {x} | {y} |")
    iguales = sum(1 for i in ids if all(a[i][c] == b[i][c] for c in CAMPOS))
    out += ["", f"Respuestas con los tres campos iguales: {iguales} de {n}.", ""]
    if desacuerdos:
        out += ["#### Desacuerdos (para la sesión de resolución)", "", f"| id | campo | {args.nombre_a} | {args.nombre_b} |", "| --- | --- | --- | --- |"] + desacuerdos + [""]
        out.append("Se resuelven ampliando la regla escrita en la rúbrica, no caso por caso.")
        out.append("")
    notas = [(i, a[i]["notas"], b[i]["notas"]) for i in ids if a[i]["notas"] or b[i]["notas"]]
    if notas:
        out += ["#### Notas escritas", ""]
        for i, na, nb in notas:
            out.append(f"- {i}: {args.nombre_a}: {na or '(vacío)'} · {args.nombre_b}: {nb or '(vacío)'}")
        out.append("")
    if args.clave:
        clave = json.loads(Path(args.clave).read_text(encoding="utf8"))
        out += comparar_con_clave(args.nombre_a, a, clave)
        out += comparar_con_clave(args.nombre_b, b, clave)

    texto = "\n".join(out)
    print(texto)
    if args.informe:
        Path(args.informe).write_text(texto + "\n", encoding="utf8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
