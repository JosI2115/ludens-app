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

    programas = []
    for prog_field in ['programa_lectura', 'programa_matematicas']:
        prog_nombre = getattr(alumno, prog_field)
        if not prog_nombre:
            continue

        actividades_catalogo = db.query(ProgramaCatalogo).filter(
            ProgramaCatalogo.programa == prog_nombre
        ).order_by(ProgramaCatalogo.semana, ProgramaCatalogo.nomenclatura).all()

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

        programas.append({
            "programa": prog_nombre,
            "tipo": "lectura" if "MAT" not in prog_nombre else "matematicas",
            "drive_url": actividades_catalogo[0].drive_url if actividades_catalogo else None,
            "actividades": actividades
        })

    return {
        "alumno_id": alumno_id,
        "nombre": f"{alumno.nombre} {alumno.apellido}",
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
