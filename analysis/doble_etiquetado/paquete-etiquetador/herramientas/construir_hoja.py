#!/usr/bin/env python3
"""Construye la hoja de etiquetado (.xlsx) a partir de datos/muestra-ciega.json.

Solo hace falta correrlo si cambia la muestra. La hoja ya construida está en
hoja/hoja-etiquetado.xlsx; quien etiqueta NO necesita Python.

  pip install -r herramientas/requirements.txt
  python herramientas/construir_hoja.py
"""
import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

RAIZ = Path(__file__).resolve().parents[1]

REGRESION = ["sí", "no", "no interpretable"]
CATEGORIAS = [
    "orden y continuidad del foco",
    "operación mediante teclado",
    "cambios inesperados de contexto",
    "comunicación accesible de actualizaciones dinámicas",
    "ninguna o ausente",
    "otra (no es una de las cuatro)",
    "no aplica",
]


def main() -> int:
    datos = json.loads((RAIZ / "datos" / "muestra-ciega.json").read_text(encoding="utf8"))
    respuestas = datos["respuestas"]
    n = len(respuestas)

    libro = Workbook()
    hoja = libro.active
    hoja.title = "Hoja"
    opciones = libro.create_sheet("Opciones")
    resumen = libro.create_sheet("Resumen")

    for i, valor in enumerate(REGRESION, start=1):
        opciones.cell(row=i, column=1, value=valor)
    for i, valor in enumerate(CATEGORIAS, start=1):
        opciones.cell(row=i, column=2, value=valor)
    opciones["A1"].comment = None
    opciones.sheet_properties.tabColor = "999999"

    encabezados = ["id", "respuesta", "regresion", "categoria", "paso", "notas", "estado"]
    for col, texto in enumerate(encabezados, start=1):
        celda = hoja.cell(row=1, column=col, value=texto)
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="2F5496")
        celda.alignment = Alignment(vertical="center")

    entrada = PatternFill("solid", fgColor="FFF2CC")
    for fila, item in enumerate(respuestas, start=2):
        hoja.cell(row=fila, column=1, value=item["id"]).font = Font(bold=True)
        celda = hoja.cell(row=fila, column=2, value=item["respuesta"])
        celda.alignment = Alignment(wrap_text=True, vertical="top")
        for col in (3, 4, 5, 6):
            c = hoja.cell(row=fila, column=col)
            c.fill = entrada
            c.alignment = Alignment(wrap_text=True, vertical="top")
        hoja.cell(row=fila, column=1).alignment = Alignment(vertical="top")
        hoja.cell(row=fila, column=7, value=(
            f'=IF(C{fila}="","falta",'
            f'IF(C{fila}="no interpretable",'
            f'IF(AND(D{fila}="no aplica",E{fila}="no aplica"),"completa","revisar: debe ser no aplica"),'
            f'IF(OR(D{fila}="",E{fila}=""),"falta","completa")))'
        )).alignment = Alignment(vertical="top")

    ultima = n + 1
    dv_reg = DataValidation(type="list", formula1=f"=Opciones!$A$1:$A${len(REGRESION)}", allow_blank=True,
                            showErrorMessage=True, errorTitle="Valor no válido", error="Elige una opción de la lista.")
    dv_cat = DataValidation(type="list", formula1=f"=Opciones!$B$1:$B${len(CATEGORIAS)}", allow_blank=True,
                            showErrorMessage=True, errorTitle="Valor no válido", error="Elige una opción de la lista.")
    dv_paso = DataValidation(type="custom", formula1='=OR(AND(ISNUMBER(E2),E2>=0,E2=INT(E2)),E2="ninguno",E2="no aplica")',
                             allow_blank=True, showErrorMessage=True, errorTitle="Valor no válido",
                             error='Escribe un número entero (0 o más), "ninguno" o "no aplica".')
    for dv, col in ((dv_reg, "C"), (dv_cat, "D"), (dv_paso, "E")):
        hoja.add_data_validation(dv)
        dv.add(f"{col}2:{col}{ultima}")

    hoja.column_dimensions["A"].width = 7
    hoja.column_dimensions["B"].width = 90
    hoja.column_dimensions["C"].width = 18
    hoja.column_dimensions["D"].width = 34
    hoja.column_dimensions["E"].width = 12
    hoja.column_dimensions["F"].width = 40
    hoja.column_dimensions["G"].width = 26
    hoja.freeze_panes = "C2"

    resumen["A1"] = "Avance"
    resumen["A1"].font = Font(bold=True, size=14)
    resumen["A3"] = "Filas completas"
    resumen["B3"] = f'=COUNTIF(Hoja!G2:G{ultima},"completa")'
    resumen["A4"] = "Total"
    resumen["B4"] = n
    resumen["A5"] = "Faltan"
    resumen["B5"] = "=B4-B3"
    resumen["A7"] = "Cuando 'Faltan' sea 0, guarda el archivo y entrégalo. No cambies las columnas id ni respuesta."
    resumen.column_dimensions["A"].width = 22

    destino = RAIZ / "hoja" / "hoja-etiquetado.xlsx"
    destino.parent.mkdir(parents=True, exist_ok=True)
    libro.save(destino)
    print(f"Escrito {destino} con {n} respuestas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
