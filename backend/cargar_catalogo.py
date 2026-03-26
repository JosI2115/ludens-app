import sys
import os
import json
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models.catalogo import ProgramaCatalogo

URLS_DRIVE = {
  "L1A": "https://drive.google.com/drive/u/0/folders/1y_B0MLXJZxoIvqiU6QHXs0tabq6SzI3M",
  "L1B": "https://drive.google.com/drive/u/0/folders/1ICd6D--jDgGhfE-mcyiiXqjGap1Sdmki",
  "L1C": "https://drive.google.com/drive/u/0/folders/1O_QerUpEr5vAoX_ZtI5D2-_bZ7iki8bd",
  "L1D": "https://drive.google.com/drive/u/0/folders/1FgPzpIRQUJ-vHQpyZF3-dt3djV2sfkRm",
  "L1E": "https://drive.google.com/drive/u/0/folders/1smEXISP2ziBTxJospM76R43YeX9tspAu",
  "L1R": "https://drive.google.com/drive/u/0/folders/1t2jyNrv_0Blo32MM3frSkcDbLZkU7Yco",
  "L2A": "https://drive.google.com/drive/u/0/folders/18Sx4lzm8zCvcjrYqB74kAm7HV5fkLYMb",
  "L2B": "https://drive.google.com/drive/u/0/folders/105qy1UA3QRF1yvBIiqgLtnMF9HT7HqiE",
  "L2C": "https://drive.google.com/drive/u/0/folders/1VjfwSwY0RdgfWB45sz3rvmXj5q5ti4Yb",
  "L2D": "https://drive.google.com/drive/u/0/folders/1AwHD37I2wSzFGrEmpogi0Tih6Ayp9j5P",
  "L2E": "https://drive.google.com/drive/u/0/folders/12NCHuUpJrNg1qvd7lZiv1eEyHkX_WZE8",
  "L2R": "https://drive.google.com/drive/u/0/folders/15-j3ZXXIbwx5Aovy0UmfCc-YQNATyZN0",
  "LPREEA": "https://drive.google.com/drive/u/0/folders/1_3n9e4Ns6kBhLXeYSBbUhWHCZNtvuhr5",
  "LPREEB": "https://drive.google.com/drive/u/0/folders/1UD9CXn3j7TCoKCjtVhczkhkY71MhL57s",
  "LPREEC": "https://drive.google.com/drive/u/0/folders/19aldlvYsxbQhBUKr-0lZCBFNPFy8lx7V",
  "LPREED": "https://drive.google.com/drive/u/0/folders/1Wd8PesGD1ciPM-bcKjPjQiaqnIFyx8_e",
  "LPREER": "https://drive.google.com/drive/u/0/folders/1njMLus3Kmtqcy_yfQifupeEhveva3v1b",
}

db = SessionLocal()

# Limpiar tabla primero
db.query(ProgramaCatalogo).delete()
db.commit()

print("Cargando catálogo de programas...")

catalogo_path = os.path.join(os.path.dirname(__file__), "catalogo_completo.json")
catalogo_data = json.loads(open(catalogo_path, encoding="utf-8").read())

# Deduplicar por nomenclatura
vistos = set()
registros = []

for prog_name, prog_data in catalogo_data.items():
    drive_url = URLS_DRIVE.get(prog_name) or prog_data.get("url")
    for act in prog_data["activities"]:
        nom = act["nomenclatura"]
        if nom in vistos:
            continue
        vistos.add(nom)
        registros.append(ProgramaCatalogo(
            programa=prog_name,
            nomenclatura=nom,
            actividad=act["actividad"],
            semana=act["semana"],
            drive_url=drive_url
        ))

# Insertar en lotes de 500
batch_size = 500
for i in range(0, len(registros), batch_size):
    db.bulk_save_objects(registros[i:i+batch_size])
    db.commit()
    print(f"  Cargados {min(i+batch_size, len(registros))}/{len(registros)}...")

print(f"✓ {len(registros)} actividades únicas cargadas")
db.close()