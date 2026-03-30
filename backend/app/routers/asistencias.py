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

def alumno_asiste_hoy(horario: str, dia_semana: int) -> bool:
    """
    dia_semana: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado
    """
    if not horario:
        return True  # Si no tiene horario registrado, mostrar siempre

    dias_map = {
        'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2,
        'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5
    }

    horario_lower = horario.lower()
    for dia_nombre, dia_num in dias_map.items():
        if dia_nombre in horario_lower and dia_num == dia_semana:
            return True
    return False

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
    todos: bool = False,
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

    # Solo mostrar alumnos que ya ingresaron en esa fecha
    query = query.filter(
        (Alumno.fecha_ingreso == None) | (Alumno.fecha_ingreso <= fecha)
    )

    alumnos = query.order_by(Alumno.nombre).all()

    dia_semana = fecha.weekday()  # 0=Lunes, 6=Domingo
    if not todos:
        alumnos_filtrados = [a for a in alumnos if alumno_asiste_hoy(a.horario, dia_semana)]
    else:
        alumnos_filtrados = alumnos

    resultado = []
    for alumno in alumnos_filtrados:
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

@router.get("/historial/{alumno_id}")
def get_historial_alumno(
    alumno_id: str,
    inicio: Optional[date] = None,
    fin: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    query = db.query(Asistencia).filter(Asistencia.alumno_id == alumno_id)
    if inicio:
        query = query.filter(Asistencia.fecha >= inicio)
    if fin:
        query = query.filter(Asistencia.fecha <= fin)
    asistencias = query.order_by(Asistencia.fecha.desc()).all()

    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()

    total = len(asistencias)
    presentes = sum(1 for a in asistencias if a.asistio)
    ausentes = total - presentes

    return {
        "alumno": f"{alumno.nombre} {alumno.apellido}" if alumno else "Desconocido",
        "presentes": presentes,
        "ausentes": ausentes,
        "porcentaje": round((presentes / total * 100) if total > 0 else 0, 1),
        "registros": [
            {
                "fecha": str(a.fecha),
                "asistio": a.asistio,
            }
            for a in asistencias
        ]
    }

@router.delete("/")
def eliminar_asistencia(
    alumno_id: str,
    fecha: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    fecha_date = datetime.strptime(fecha, '%Y-%m-%d').date()
    asistencia = db.query(Asistencia).filter(
        Asistencia.alumno_id == alumno_id,
        Asistencia.fecha == fecha_date
    ).first()
    if asistencia:
        db.delete(asistencia)
        db.commit()
    return {"mensaje": "Asistencia eliminada"}