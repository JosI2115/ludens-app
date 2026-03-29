from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.bitacora import Bitacora
from app.models.catalogo import ProgramaCatalogo
from app.models.alumno import Alumno
from app.auth.dependencies import get_current_user
from app.models.usuario import Usuario

router = APIRouter(prefix="/bitacoras", tags=["bitacoras"])

class BitacoraUpdate(BaseModel):
    fecha: Optional[str] = None
    ejercicios: Optional[int] = None
    comentario: Optional[str] = None
    estado: Optional[str] = None
    registrado_por_nombre: Optional[str] = None

@router.get("/alumno/{alumno_id}")
def get_bitacora_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    import json
    programas = []

    # Construir lista de programas: historial + actual
    progs_lectura = []
    progs_mat = []

    if alumno.programas_lectura_historial:
        try:
            progs_lectura = json.loads(alumno.programas_lectura_historial)
        except:
            pass
    if alumno.programa_lectura:
        if alumno.programa_lectura not in progs_lectura:
            progs_lectura.append(alumno.programa_lectura)

    if alumno.programas_matematicas_historial:
        try:
            progs_mat = json.loads(alumno.programas_matematicas_historial)
        except:
            pass
    if alumno.programa_matematicas:
        if alumno.programa_matematicas not in progs_mat:
            progs_mat.append(alumno.programa_matematicas)

    todos_programas = (
        [{"nombre": p, "tipo": "lectura"} for p in progs_lectura] +
        [{"nombre": p, "tipo": "matematicas"} for p in progs_mat]
    )

    for prog_info in todos_programas:
        prog_nombre = prog_info["nombre"]

        actividades_catalogo = db.query(ProgramaCatalogo).filter(
            ProgramaCatalogo.programa == prog_nombre
        ).order_by(ProgramaCatalogo.semana).all()

        actividades_catalogo = sorted(
            actividades_catalogo,
            key=lambda x: (
                x.semana or 0,
                x.nomenclatura.split('.')[-2] if len(x.nomenclatura.split('.')) > 2 else '',
                int(x.nomenclatura.split('.')[-1]) if x.nomenclatura.split('.')[-1].isdigit() else 0
            )
        )

        actividades = []
        for act_cat in actividades_catalogo:
            registro = db.query(Bitacora).filter(
                Bitacora.alumno_id == alumno_id,
                Bitacora.nomenclatura == act_cat.nomenclatura
            ).first()
            actividades.append({
                "id": str(registro.id) if registro else None,
                "nomenclatura": act_cat.nomenclatura,
                "actividad": act_cat.actividad,
                "semana": act_cat.semana,
                "drive_url": act_cat.drive_url,
                "fecha": registro.fecha if registro else None,
                "ejercicios": registro.ejercicios if registro else None,
                "comentario": registro.comentario if registro else None,
                "estado": registro.estado if registro else None,
                "registrado_por_nombre": registro.registrado_por_nombre if registro else None,
            })

        if actividades_catalogo:
            programas.append({
                "programa": prog_nombre,
                "tipo": prog_info["tipo"],
                "drive_url": actividades_catalogo[0].drive_url if actividades_catalogo else None,
                "actividades": actividades
            })

    return {
        "alumno_id": alumno_id,
        "nombre": f"{alumno.nombre} {alumno.apellido}",
        "objetivo": alumno.objetivos,
        "programas": programas
    }

@router.put("/registro/{alumno_id}/{nomenclatura}")
def actualizar_registro(
    alumno_id: str,
    nomenclatura: str,
    data: BitacoraUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    registro = db.query(Bitacora).filter(
        Bitacora.alumno_id == alumno_id,
        Bitacora.nomenclatura == nomenclatura
    ).first()

    act_cat = db.query(ProgramaCatalogo).filter(
        ProgramaCatalogo.nomenclatura == nomenclatura
    ).first()

    if not act_cat:
        raise HTTPException(status_code=404, detail="Actividad no encontrada en catálogo")

    if not registro:
        registro = Bitacora(
            alumno_id=alumno_id,
            programa=act_cat.programa,
            nomenclatura=nomenclatura,
            actividad=act_cat.actividad,
            semana=act_cat.semana,
            drive_url=act_cat.drive_url,
            registrado_por=current_user.id
        )
        db.add(registro)

    if data.fecha is not None:
        registro.fecha = data.fecha
    if data.ejercicios is not None:
        registro.ejercicios = data.ejercicios
    if data.comentario is not None:
        registro.comentario = data.comentario
    if data.estado is not None:
        registro.estado = data.estado
    if data.registrado_por_nombre is not None:
        registro.registrado_por_nombre = data.registrado_por_nombre
    else:
        registro.registrado_por_nombre = current_user.nombre
    registro.registrado_por = current_user.id

    db.commit()
    db.refresh(registro)
    return registro

@router.get("/programas")
def get_programas_catalogo(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    programas = db.query(ProgramaCatalogo.programa, ProgramaCatalogo.drive_url).distinct().all()
    result = {}
    for prog, url in programas:
        prefix = "lectura" if "MAT" not in prog else "matematicas"
        result.setdefault(prefix, []).append({"programa": prog, "drive_url": url})
    return result

@router.get("/vista-maestra")
def get_vista_maestra(
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(["activo", "pendiente", "en_riesgo"])
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)

    alumnos = query.order_by(Alumno.nombre).all()

    resultado = []
    for alumno in alumnos:
        resultado.append({
            "id": str(alumno.id),
            "nombre": f"{alumno.nombre} {alumno.apellido}",
            "programa_lectura": alumno.programa_lectura,
            "programa_matematicas": alumno.programa_matematicas,
            "maestra_id": str(alumno.maestra_id) if alumno.maestra_id else None,
            "grado": alumno.grado,
        })

    return resultado

@router.post("/admin/cargar-catalogo")
def cargar_catalogo_produccion(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.catalogo import ProgramaCatalogo
    import json
    import os

    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora puede hacer esto")

    count = db.query(ProgramaCatalogo).count()
    if count > 0:
        return {"mensaje": f"Catálogo ya existe con {count} actividades"}

    catalogo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "catalogo_completo.json")

    if not os.path.exists(catalogo_path):
        raise HTTPException(status_code=404, detail="Archivo catalogo_completo.json no encontrado")

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

    catalogo_data = json.loads(open(catalogo_path, encoding="utf-8").read())

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

    batch_size = 500
    for i in range(0, len(registros), batch_size):
        db.bulk_save_objects(registros[i:i+batch_size])
        db.commit()

    return {"mensaje": f"✓ {len(registros)} actividades cargadas exitosamente"}

@router.get("/imprimir")
def get_pendientes_impresion(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno

    query = db.query(Bitacora).filter(
        Bitacora.estado == "Imprimir"
    ).all()

    resultado = {}
    for reg in query:
        alumno = db.query(Alumno).filter(Alumno.id == reg.alumno_id).first()
        if not alumno:
            continue

        if current_user.rol in ["maestra", "encargada"] and alumno.sucursal_id != current_user.sucursal_id:
            continue

        maestra_nombre = reg.registrado_por_nombre or "Sin asignar"
        if maestra_nombre not in resultado:
            resultado[maestra_nombre] = []

        resultado[maestra_nombre].append({
            "alumno": f"{alumno.nombre} {alumno.apellido}",
            "alumno_id": str(alumno.id),
            "nomenclatura": reg.nomenclatura,
            "programa": reg.programa,
            "drive_url": reg.drive_url,
            "actividad": reg.actividad,
        })

    return resultado


@router.get("/programas/lista")
def get_programas_lista(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from sqlalchemy import func
    programas = db.query(
        ProgramaCatalogo.programa,
        ProgramaCatalogo.drive_url
    ).distinct(ProgramaCatalogo.programa).order_by(ProgramaCatalogo.programa).all()

    return [{"programa": p.programa, "drive_url": p.drive_url} for p in programas]


@router.put("/programas/{programa}/url")
def actualizar_url_programa(
    programa: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora")

    db.query(ProgramaCatalogo).filter(
        ProgramaCatalogo.programa == programa
    ).update({"drive_url": data.get("drive_url")})
    db.commit()
    return {"mensaje": f"URL actualizada para {programa}"}
