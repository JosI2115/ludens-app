from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from app.database import get_db
from app.models.pago import Pago
from app.models.alumno import Alumno
from app.auth.dependencies import get_current_user
from app.models.usuario import Usuario

router = APIRouter(prefix="/pagos", tags=["pagos"])

def calcular_estado_pago(alumno, hoy=None):
    if hoy is None:
        hoy = date.today()

    if not alumno.dia_pago:
        return "sin_fecha", 0

    mes_actual = hoy.month
    anio_actual = hoy.year

    try:
        fecha_pago_este_mes = date(anio_actual, mes_actual, alumno.dia_pago)
    except ValueError:
        fecha_pago_este_mes = date(anio_actual, mes_actual, 28)

    # Si el alumno ingresó después del día de pago de este mes,
    # su primer pago es el mes siguiente — no está en mora
    if alumno.fecha_ingreso and alumno.fecha_ingreso > fecha_pago_este_mes:
        return "amarillo", 0

    # Si la fecha de pago aún no llega este mes
    if fecha_pago_este_mes >= hoy:
        return "amarillo", 0

    # La fecha de pago ya pasó — calcular días de retraso
    dias_retraso = (hoy - fecha_pago_este_mes).days

    if dias_retraso <= 5:
        return "rojo", dias_retraso
    elif dias_retraso <= 10:
        return "naranja", dias_retraso
    else:
        return "cafe", dias_retraso

class PagoCreate(BaseModel):
    alumno_id: str
    monto: float
    mes: int
    anio: int
    fecha_pago: Optional[date] = None
    con_penalizacion: Optional[bool] = False
    monto_penalizacion: Optional[float] = 0
    comentarios: Optional[str] = None

@router.get("/")
def get_pagos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    hoy = date.today()
    if not mes:
        mes = hoy.month
    if not anio:
        anio = hoy.year

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'pendiente', 'en_riesgo', 'bloqueado'])
    )

    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)

    alumnos = query.order_by(Alumno.nombre).all()

    resultado = []
    for alumno in alumnos:
        pago_mes = db.query(Pago).filter(
            Pago.alumno_id == alumno.id,
            Pago.mes == mes,
            Pago.anio == anio
        ).first()

        if pago_mes:
            estado_color = "verde"
            dias_retraso = 0
        else:
            estado_color, dias_retraso = calcular_estado_pago(alumno, hoy)

        resultado.append({
            "id": str(alumno.id),
            "nombre": f"{alumno.nombre} {alumno.apellido}",
            "plan_pago": alumno.plan_pago,
            "dia_pago": alumno.dia_pago,
            "estado_color": estado_color,
            "dias_retraso": dias_retraso,
            "pagado": pago_mes is not None,
            "fecha_pago": pago_mes.fecha_pago if pago_mes else None,
            "con_penalizacion": pago_mes.con_penalizacion if pago_mes else False,
            "sucursal_id": str(alumno.sucursal_id) if alumno.sucursal_id else None,
            "pago_id": str(pago_mes.id) if pago_mes else None,
        })

    return resultado

@router.post("/registrar")
def registrar_pago(
    data: PagoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    alumno = db.query(Alumno).filter(Alumno.id == data.alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    pago_existe = db.query(Pago).filter(
        Pago.alumno_id == data.alumno_id,
        Pago.mes == data.mes,
        Pago.anio == data.anio
    ).first()

    if pago_existe:
        raise HTTPException(status_code=400, detail="Ya existe un pago registrado para este mes")

    hoy = date.today()
    estado_color, dias = calcular_estado_pago(alumno, hoy)
    con_penalizacion = dias > 5
    monto_penalizacion = 50.0 if con_penalizacion else 0.0

    pago = Pago(
        alumno_id=data.alumno_id,
        monto=data.monto,
        mes=data.mes,
        anio=data.anio,
        fecha_pago=data.fecha_pago or hoy,
        con_penalizacion=con_penalizacion,
        monto_penalizacion=monto_penalizacion,
        registrado_por=current_user.id,
        comentarios=data.comentarios
    )
    db.add(pago)

    alumno.situacion = "activo"
    db.commit()
    db.refresh(pago)
    return pago

@router.get("/resumen")
def resumen_pagos(
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

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'pendiente', 'en_riesgo', 'bloqueado'])
    )

    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    alumnos = query.all()
    total = len(alumnos)
    pagados = 0
    pendientes = 0
    en_riesgo = 0
    bloqueados = 0
    total_recaudado = 0.0

    for alumno in alumnos:
        pago = db.query(Pago).filter(
            Pago.alumno_id == alumno.id,
            Pago.mes == mes,
            Pago.anio == anio
        ).first()

        if pago:
            pagados += 1
            total_recaudado += float(pago.monto) + float(pago.monto_penalizacion)
        else:
            _, dias = calcular_estado_pago(alumno, hoy)
            if dias > 10:
                bloqueados += 1
            elif dias > 5:
                en_riesgo += 1
            else:
                pendientes += 1

    return {
        "mes": mes,
        "anio": anio,
        "total_alumnos": total,
        "pagados": pagados,
        "pendientes": pendientes,
        "en_riesgo": en_riesgo,
        "bloqueados": bloqueados,
        "total_recaudado": total_recaudado,
    }

@router.get("/tablero")
def get_tablero_pagos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from app.models.pago import Pago
    from datetime import date

    hoy = date.today()
    mes = hoy.month
    anio = hoy.year

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'pendiente', 'en_riesgo', 'bloqueado', 'becado', 'inscripcion'])
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    alumnos = query.all()

    por_vencer = []      # Pagan en los próximos 7 días
    con_recargo = []     # 6-9 días de retraso
    bloqueados = []      # +10 días de retraso

    for alumno in alumnos:
        if not alumno.dia_pago:
            continue

        try:
            fecha_pago = date(anio, mes, alumno.dia_pago)
        except ValueError:
            fecha_pago = date(anio, mes, 28)

        # Si ingresó después del día de pago no está en mora
        if alumno.fecha_ingreso and alumno.fecha_ingreso > fecha_pago:
            continue

        # Verificar si ya pagó este mes
        pago = db.query(Pago).filter(
            Pago.alumno_id == alumno.id,
            Pago.mes == mes,
            Pago.anio == anio
        ).first()
        if pago:
            continue

        dias = (hoy - fecha_pago).days
        info = {
            "alumno_id": str(alumno.id),
            "nombre": f"{alumno.nombre} {alumno.apellido}",
            "dia_pago": alumno.dia_pago,
            "fecha_pago": str(fecha_pago),
            "dias": dias,
            "plan_pago": str(alumno.plan_pago),
        }

        if dias < 0 and dias >= -7:
            # Faltan 7 días o menos para pagar
            info["dias_para_pagar"] = abs(dias)
            por_vencer.append(info)
        elif 6 <= dias <= 9:
            con_recargo.append(info)
        elif dias >= 10:
            bloqueados.append(info)

    return {
        "por_vencer": sorted(por_vencer, key=lambda x: x["dias"]),
        "con_recargo": sorted(con_recargo, key=lambda x: x["dias"]),
        "bloqueados": sorted(bloqueados, key=lambda x: x["dias"], reverse=True)
    }