from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date
from app.database import get_db
from app.models.asistencia import Asistencia
from app.models.alumno import Alumno
from app.auth.dependencies import get_current_user
from app.models.usuario import Usuario

router = APIRouter(prefix="/asistencias", tags=["asistencias"])

class AsistenciaCreate(BaseModel):
    alumno_id: str
    fecha: date
    asistio: bool

class AsistenciasLote(BaseModel):
    fecha: date
    asistencias: list[dict]

@router.get("/")
def get_asistencias(
    fecha: Optional[date] = None,
    alumno_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if not fecha:
        fecha = date.today()

    query = db.query(Asistencia).filter(Asistencia.fecha == fecha)

    if alumno_id:
        query = query.filter(Asistencia.alumno_id == alumno_id)

    return query.all()

@router.get("/dia")
def get_alumnos_del_dia(
    fecha: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if not fecha:
        fecha = date.today()

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'pendiente', 'en_riesgo'])
    )

    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    alumnos = query.order_by(Alumno.nombre).all()

    resultado = []
    for alumno in alumnos:
        asistencia = db.query(Asistencia).filter(
            Asistencia.alumno_id == alumno.id,
            Asistencia.fecha == fecha
        ).first()

        resultado.append({
            "id": str(alumno.id),
            "nombre": f"{alumno.nombre} {alumno.apellido}",
            "grado": alumno.grado,
            "horario": alumno.horario,
            "maestra_id": str(alumno.maestra_id) if alumno.maestra_id else None,
            "asistio": asistencia.asistio if asistencia else None,
            "asistencia_id": str(asistencia.id) if asistencia else None,
        })

    return resultado

@router.post("/registrar")
def registrar_asistencia(
    data: AsistenciaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    existe = db.query(Asistencia).filter(
        Asistencia.alumno_id == data.alumno_id,
        Asistencia.fecha == data.fecha
    ).first()

    if existe:
        existe.asistio = data.asistio
        existe.registrado_por = current_user.id
        db.commit()
        db.refresh(existe)
        return existe

    asistencia = Asistencia(
        alumno_id=data.alumno_id,
        fecha=data.fecha,
        asistio=data.asistio,
        registrado_por=current_user.id
    )
    db.add(asistencia)

    alumno = db.query(Alumno).filter(Alumno.id == data.alumno_id).first()
    if alumno and data.asistio:
        alumno.ultima_asistencia = data.fecha

    db.commit()
    db.refresh(asistencia)
    return asistencia

@router.get("/resumen/{alumno_id}")
def resumen_asistencias(
    alumno_id: str,
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    hoy = date.today()
    if not mes:
        mes = hoy.month
    if not anio:
        anio = hoy.year

    asistencias = db.query(Asistencia).filter(
        Asistencia.alumno_id == alumno_id,
        db.func.extract('month', Asistencia.fecha) == mes,
        db.func.extract('year', Asistencia.fecha) == anio
    ).all()

    total = len(asistencias)
    presentes = sum(1 for a in asistencias if a.asistio)
    ausentes = total - presentes

    return {
        "total": total,
        "presentes": presentes,
        "ausentes": ausentes,
        "porcentaje": round((presentes / total * 100) if total > 0 else 0, 1)
    }