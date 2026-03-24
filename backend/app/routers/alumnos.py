from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date
from app.database import get_db
from app.models.alumno import Alumno
from app.models.historial import HistorialCambio
from app.auth.dependencies import get_current_user
from app.models.usuario import Usuario
import uuid

router = APIRouter(prefix="/alumnos", tags=["alumnos"])

class AlumnoCreate(BaseModel):
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date] = None
    edad: Optional[int] = None
    grado: Optional[str] = None
    diagnostico: Optional[str] = None
    nombre_tutor: str
    telefono_tutor: str
    telefono_emergencia: Optional[str] = None
    sucursal_id: Optional[str] = None
    maestra_id: Optional[str] = None
    situacion: Optional[str] = "prospecto"
    plan_pago: Optional[str] = None
    materias: Optional[str] = None
    horas_semana: Optional[int] = None
    dia_pago: Optional[int] = None
    tiene_descuento_hermano: Optional[bool] = False
    fecha_diagnostico: Optional[date] = None
    fecha_ingreso: Optional[date] = None
    horario: Optional[str] = None

    class Config:
        anystr_strip_whitespace = True

class AlumnoUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    edad: Optional[int] = None
    grado: Optional[str] = None
    diagnostico: Optional[str] = None
    nombre_tutor: Optional[str] = None
    telefono_tutor: Optional[str] = None
    telefono_emergencia: Optional[str] = None
    maestra_id: Optional[str] = None
    situacion: Optional[str] = None
    plan_pago: Optional[str] = None
    materias: Optional[str] = None
    horas_semana: Optional[int] = None
    dia_pago: Optional[int] = None
    tiene_descuento_hermano: Optional[bool] = None
    fecha_ingreso: Optional[date] = None
    horario: Optional[str] = None
    motivo_baja: Optional[str] = None

@router.get("/")
def get_alumnos(
    sucursal_id: Optional[str] = None,
    situacion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    query = db.query(Alumno).filter(Alumno.activo == True)
    
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)
    
    if situacion:
        query = query.filter(Alumno.situacion == situacion)
    
    alumnos = query.order_by(Alumno.nombre).all()
    return alumnos

@router.get("/{alumno_id}")
def get_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return alumno

@router.post("/")
def crear_alumno(
    data: AlumnoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    datos = data.dict()
    
    # Limpiar campos UUID vacíos
    if not datos.get('sucursal_id') or datos['sucursal_id'] == '':
        if current_user.sucursal_id:
            datos['sucursal_id'] = str(current_user.sucursal_id)
        else:
            datos['sucursal_id'] = None
    
    if not datos.get('maestra_id') or datos['maestra_id'] == '':
        datos['maestra_id'] = None

    # Limpiar campos vacíos
    for campo in ['grado', 'diagnostico', 'telefono_emergencia', 'horario', 'plan_pago', 'materias']:
        if datos.get(campo) == '':
            datos[campo] = None

    alumno = Alumno(**datos)
    db.add(alumno)
    db.commit()
    db.refresh(alumno)
    return alumno

@router.put("/{alumno_id}")
def actualizar_alumno(
    alumno_id: str,
    data: AlumnoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    
    cambios = data.dict(exclude_unset=True)
    for campo, valor_nuevo in cambios.items():
        valor_anterior = getattr(alumno, campo)
        if valor_anterior != valor_nuevo:
            historial = HistorialCambio(
                alumno_id=alumno.id,
                campo_modificado=campo,
                valor_anterior=str(valor_anterior),
                valor_nuevo=str(valor_nuevo),
                modificado_por=current_user.id
            )
            db.add(historial)
            setattr(alumno, campo, valor_nuevo)
    
    db.commit()
    db.refresh(alumno)
    return alumno

@router.delete("/{alumno_id}")
def dar_baja_alumno(
    alumno_id: str,
    motivo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    
    alumno.situacion = "baja"
    alumno.fecha_baja = date.today()
    alumno.motivo_baja = motivo
    alumno.activo = False
    db.commit()
    return {"mensaje": "Alumno dado de baja correctamente"}