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
    semana: Optional[str] = None
    es_personalizado: Optional[bool] = False
    actividad: Optional[str] = None
    programa: Optional[str] = None
    nomenclatura_nueva: Optional[str] = None

@router.get("/alumno/{alumno_id}")
def get_bitacora_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    db.refresh(alumno)
    print(f"DEBUG refresh: pers_lec={alumno.programa_personalizado_lectura} pers_mat={alumno.programa_personalizado_matematicas}")

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
                1 if ('EX' in (x.nomenclatura or '').upper()) else 0,
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

    programas_ya = [p['programa'] for p in programas]

    if alumno.programa_personalizado_lectura and 'Personalizado Lectura' not in programas_ya:
        bitacoras_personalizado_lec = db.query(Bitacora).filter(
            Bitacora.alumno_id == alumno_id,
            Bitacora.programa == 'Personalizado Lectura'
        ).all()
        programas.append({
            "programa": "Personalizado Lectura",
            "es_personalizado": True,
            "actividades": [{
                "id": str(b.id),
                "nomenclatura": b.nomenclatura,
                "actividad": b.actividad,
                "semana": b.semana,
                "fecha": str(b.fecha) if b.fecha else None,
                "estado": b.estado,
                "comentario": b.comentario,
                "ejercicios": b.ejercicios,
                "registrado_por_nombre": b.registrado_por_nombre,
            } for b in bitacoras_personalizado_lec]
        })

    if alumno.programa_personalizado_matematicas and 'Personalizado Matematicas' not in programas_ya:
        bitacoras_personalizado_mat = db.query(Bitacora).filter(
            Bitacora.alumno_id == alumno_id,
            Bitacora.programa == 'Personalizado Matematicas'
        ).all()
        programas.append({
            "programa": "Personalizado Matematicas",
            "es_personalizado": True,
            "actividades": [{
                "id": str(b.id),
                "nomenclatura": b.nomenclatura,
                "actividad": b.actividad,
                "semana": b.semana,
                "fecha": str(b.fecha) if b.fecha else None,
                "estado": b.estado,
                "comentario": b.comentario,
                "ejercicios": b.ejercicios,
                "registrado_por_nombre": b.registrado_por_nombre,
            } for b in bitacoras_personalizado_mat]
        })

    print(f"DEBUG alumno={alumno.nombre} pers_lec={alumno.programa_personalizado_lectura} pers_mat={alumno.programa_personalizado_matematicas} programas={[p['programa'] for p in programas]}")

    return {
        "alumno_id": alumno_id,
        "nombre": f"{alumno.nombre} {alumno.apellido}",
        "objetivo": alumno.objetivos,
        "programas_historial_lectura": json.loads(alumno.programas_lectura_historial or '[]'),
        "programas_historial_matematicas": json.loads(alumno.programas_matematicas_historial or '[]'),
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

    if data.es_personalizado:
        if not registro:
            registro = Bitacora(
                alumno_id=alumno_id,
                programa=data.programa or 'Personalizado',
                nomenclatura=nomenclatura,
                actividad=data.actividad or '',
                registrado_por=current_user.id
            )
            db.add(registro)
        elif data.actividad is not None:
            registro.actividad = data.actividad
        if registro and data.nomenclatura_nueva and data.nomenclatura_nueva != nomenclatura:
            registro.nomenclatura = data.nomenclatura_nueva
    else:
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

    if data.semana is not None:
        registro.semana = data.semana
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
    from app.models.usuario_sucursal import UsuarioSucursal
    from sqlalchemy import or_

    if current_user.rol == 'directora' or current_user.es_encargada_general:
        if sucursal_id:
            query = query.filter(Alumno.sucursal_id == sucursal_id)
    elif current_user.es_global:
        query = query.filter(
            or_(
                Alumno.maestra_id == current_user.id,
                Alumno.maestra_lectura_id == current_user.id,
                Alumno.maestra_matematicas_id == current_user.id
            )
        )
    elif current_user.rol in ["maestra", "encargada", "recepcionista"]:
        if current_user.sucursal_id:
            query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
        else:
            query = query.filter(
                or_(
                    Alumno.maestra_id == current_user.id,
                    Alumno.maestra_lectura_id == current_user.id,
                    Alumno.maestra_matematicas_id == current_user.id
                )
            )

    alumnos = query.order_by(Alumno.nombre).all()

    resultado = []
    for alumno in alumnos:
        resultado.append({
            "id": str(alumno.id),
            "nombre": f"{alumno.nombre} {alumno.apellido}",
            "programa_lectura": alumno.programa_lectura,
            "programa_matematicas": alumno.programa_matematicas,
            "maestra_id": str(alumno.maestra_id) if alumno.maestra_id else None,
            "maestra_lectura_id": str(alumno.maestra_lectura_id) if alumno.maestra_lectura_id else None,
            "maestra_matematicas_id": str(alumno.maestra_matematicas_id) if alumno.maestra_matematicas_id else None,
            "grado": alumno.grado,
            "programa_personalizado_lectura": alumno.programa_personalizado_lectura or False,
            "programa_personalizado_matematicas": alumno.programa_personalizado_matematicas or False,
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
    from sqlalchemy import or_

    if current_user.rol == 'maestra':
        try:
            alumnos_ids = db.query(Alumno.id).filter(
                or_(
                    Alumno.maestra_id == current_user.id,
                    Alumno.maestra_lectura_id == current_user.id,
                    Alumno.maestra_matematicas_id == current_user.id
                )
            ).all()
        except:
            alumnos_ids = db.query(Alumno.id).filter(
                Alumno.maestra_id == current_user.id
            ).all()
        alumnos_ids = [a.id for a in alumnos_ids]
        bitacoras = db.query(Bitacora).filter(
            Bitacora.estado == 'Imprimir',
            Bitacora.alumno_id.in_(alumnos_ids)
        ).all()
    elif current_user.rol not in ['directora'] and not current_user.es_encargada_general:
        alumnos_ids = [a.id for a in db.query(Alumno.id).filter(
            Alumno.sucursal_id == current_user.sucursal_id
        ).all()]
        bitacoras = db.query(Bitacora).filter(
            Bitacora.estado == 'Imprimir',
            Bitacora.alumno_id.in_(alumnos_ids)
        ).all()
    else:
        bitacoras = db.query(Bitacora).filter(Bitacora.estado == 'Imprimir').all()

    resultado = {}
    for reg in bitacoras:
        alumno = db.query(Alumno).filter(Alumno.id == reg.alumno_id).first()
        if not alumno:
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

@router.delete("/alumno/{alumno_id}/programa/{programa}")
def eliminar_programa_bitacora(
    alumno_id: str,
    programa: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from urllib.parse import unquote
    from app.models.alumno import Alumno

    programa_decoded = unquote(programa)

    db.query(Bitacora).filter(
        Bitacora.alumno_id == alumno_id,
        Bitacora.programa == programa_decoded
    ).delete()

    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if alumno:
        if 'Personalizado Lectura' in programa_decoded or alumno.programa_lectura == programa_decoded:
            if 'Personalizado' in programa_decoded:
                alumno.programa_personalizado_lectura = False
            else:
                alumno.programa_lectura = None
        elif 'Personalizado Matematicas' in programa_decoded or alumno.programa_matematicas == programa_decoded:
            if 'Personalizado' in programa_decoded:
                alumno.programa_personalizado_matematicas = False
            else:
                alumno.programa_matematicas = None

        import json
        historial_lec = json.loads(alumno.programas_lectura_historial or '[]')
        historial_mat = json.loads(alumno.programas_matematicas_historial or '[]')

        if programa_decoded in historial_lec:
            historial_lec.remove(programa_decoded)
            alumno.programas_lectura_historial = json.dumps(historial_lec)

        if programa_decoded in historial_mat:
            historial_mat.remove(programa_decoded)
            alumno.programas_matematicas_historial = json.dumps(historial_mat)

    db.commit()
    return {"mensaje": f"Programa {programa_decoded} eliminado"}

@router.put("/alumno/{alumno_id}/cambiar-programa")
def cambiar_programa(
    alumno_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    import json

    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    tipo = data.get('tipo')
    nuevo_programa = data.get('programa')
    es_personalizado = data.get('es_personalizado', False)

    if tipo == 'lectura':
        historial = json.loads(alumno.programas_lectura_historial or '[]')
        if alumno.programa_lectura and alumno.programa_lectura not in historial:
            historial.append(alumno.programa_lectura)
        alumno.programas_lectura_historial = json.dumps(historial)
        if es_personalizado:
            alumno.programa_personalizado_lectura = True
            alumno.programa_lectura = None
        else:
            alumno.programa_lectura = nuevo_programa
            alumno.programa_personalizado_lectura = False
    elif tipo == 'matematicas':
        historial = json.loads(alumno.programas_matematicas_historial or '[]')
        if alumno.programa_matematicas and alumno.programa_matematicas not in historial:
            historial.append(alumno.programa_matematicas)
        alumno.programas_matematicas_historial = json.dumps(historial)
        if es_personalizado:
            alumno.programa_personalizado_matematicas = True
            alumno.programa_matematicas = None
        else:
            alumno.programa_matematicas = nuevo_programa
            alumno.programa_personalizado_matematicas = False

    db.commit()
    return {"mensaje": "Programa actualizado"}
