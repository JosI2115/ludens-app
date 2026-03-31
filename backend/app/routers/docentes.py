from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date
from app.database import get_db
from app.models.actividad_docente import ActividadDocente
from app.models.usuario import Usuario
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/docentes", tags=["docentes"])


def puede_ver_todas(current_user: Usuario) -> bool:
    return current_user.rol == "directora" or current_user.es_encargada_general


class ActividadUpdate(BaseModel):
    actividad: Optional[str] = None
    incidencia: Optional[str] = None
    bloqueado: Optional[bool] = None


@router.get("/actividad")
def get_actividad(
    semana: Optional[str] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime, timedelta

    if semana:
        inicio = datetime.strptime(semana, "%Y-%m-%d").date()
    else:
        hoy = date.today()
        inicio = hoy - timedelta(days=hoy.weekday())

    fin = inicio + timedelta(days=6)

    query = db.query(ActividadDocente).filter(
        ActividadDocente.fecha >= inicio,
        ActividadDocente.fecha <= fin
    )

    if not puede_ver_todas(current_user):
        query = query.filter(ActividadDocente.usuario_id == current_user.id)

    actividades = query.all()

    # Obtener usuarios relevantes
    usuarios_query = db.query(Usuario).filter(
        Usuario.activo == True,
        Usuario.rol.in_(["maestra", "encargada"])
    )
    if not puede_ver_todas(current_user):
        usuarios_query = usuarios_query.filter(Usuario.id == current_user.id)
    elif sucursal_id:
        usuarios_query = usuarios_query.filter(Usuario.sucursal_id == sucursal_id)

    usuarios = usuarios_query.order_by(Usuario.nombre).all()

    actividades_map = {
        f"{str(a.usuario_id)}_{a.fecha.isoformat()}": a
        for a in actividades
    }

    semana = [(inicio + timedelta(days=i)).isoformat() for i in range(6)]

    maestras = []
    for u in usuarios:
        dias = []
        for fecha_str in semana:
            act = actividades_map.get(f"{str(u.id)}_{fecha_str}")
            dias.append({
                "fecha": fecha_str,
                "actividad": act.actividad if act else None,
                "incidencia": act.incidencia if act else None,
                "bloqueado": act.bloqueado if act else False,
            })
        maestras.append({
            "usuario_id": str(u.id),
            "nombre": u.nombre,
            "rol": u.rol,
            "color": u.color,
            "dias": dias,
        })

    return {
        "inicio": inicio.isoformat(),
        "fin": fin.isoformat(),
        "semana": semana,
        "maestras": maestras,
    }


@router.put("/actividad/{usuario_id}/{fecha}")
def actualizar_actividad(
    usuario_id: str,
    fecha: str,
    data: ActividadUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime

    if not puede_ver_todas(current_user) and str(current_user.id) != usuario_id:
        raise HTTPException(status_code=403, detail="Sin permiso")

    fecha_date = datetime.strptime(fecha, "%Y-%m-%d").date()

    actividad = db.query(ActividadDocente).filter(
        ActividadDocente.usuario_id == usuario_id,
        ActividadDocente.fecha == fecha_date
    ).first()

    if not actividad:
        actividad = ActividadDocente(
            usuario_id=usuario_id,
            fecha=fecha_date,
            registrado_por=current_user.id,
        )
        db.add(actividad)

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(actividad, field, value)

    if "incidencia" in update_data:
        actividad.bloqueado = bool(update_data["incidencia"])

    db.commit()
    db.refresh(actividad)

    return {
        "id": str(actividad.id),
        "usuario_id": str(actividad.usuario_id),
        "fecha": actividad.fecha.isoformat(),
        "actividad": actividad.actividad,
        "incidencia": actividad.incidencia,
        "bloqueado": actividad.bloqueado,
    }
