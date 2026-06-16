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

    import calendar
    try:
        ultimo_dia = calendar.monthrange(anio_actual, mes_actual)[1]
        dia = min(alumno.dia_pago, ultimo_dia)
        fecha_pago_este_mes = date(anio_actual, mes_actual, dia)
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
    monto: Optional[float] = None
    mes: int
    anio: int
    fecha_pago: Optional[date] = None
    con_penalizacion: Optional[bool] = False
    monto_penalizacion: Optional[float] = 0
    sin_recargo: Optional[bool] = False
    comentarios: Optional[str] = None
    fecha_recepcion: Optional[date] = None
    monto_recibido: Optional[float] = None
    metodo_pago: Optional[str] = None

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

    from app.services.filtros import filtrar_alumnos_por_sucursal
    query = filtrar_alumnos_por_sucursal(query, current_user, db, sucursal_id)

    import calendar
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    ultimo_dia_mes = date(anio, mes, ultimo_dia)
    query = query.filter(
        (Alumno.fecha_ingreso == None) |
        (Alumno.fecha_ingreso <= ultimo_dia_mes)
    )

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
            "monto_penalizacion": pago_mes.monto_penalizacion if pago_mes else 0,
            "monto_pagado": pago_mes.monto if pago_mes else None,
            "fecha_recepcion": str(pago_mes.fecha_recepcion) if pago_mes and pago_mes.fecha_recepcion else None,
            "comentarios": pago_mes.comentarios if pago_mes else None,
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

    from datetime import datetime as dt
    if data.fecha_recepcion:
        fecha_rec = dt.strptime(data.fecha_recepcion, '%Y-%m-%d').date() if isinstance(data.fecha_recepcion, str) else data.fecha_recepcion
    else:
        fecha_rec = date.today()

    mes_pago = data.mes
    anio_pago = data.anio

    if not mes_pago:
        if alumno.dia_pago and alumno.dia_pago >= 26 and fecha_rec.day <= 5:
            if fecha_rec.month == 1:
                mes_pago = 12
                anio_pago = fecha_rec.year - 1
            else:
                mes_pago = fecha_rec.month - 1
                anio_pago = fecha_rec.year
        else:
            mes_pago = fecha_rec.month
            anio_pago = fecha_rec.year

    pago_existe = db.query(Pago).filter(
        Pago.alumno_id == data.alumno_id,
        Pago.mes == mes_pago,
        Pago.anio == anio_pago
    ).first()

    if pago_existe:
        raise HTTPException(status_code=400, detail="Ya existe un pago registrado para este mes")

    from datetime import datetime
    if data.fecha_recepcion:
        if isinstance(data.fecha_recepcion, str):
            fecha_calculo = datetime.strptime(data.fecha_recepcion, '%Y-%m-%d').date()
        else:
            fecha_calculo = data.fecha_recepcion
    else:
        fecha_calculo = date.today()
    hoy = date.today()
    estado_color, dias = calcular_estado_pago(alumno, fecha_calculo)
    con_penalizacion = dias > 5
    monto_penalizacion = 50.0 if con_penalizacion else 0.0
    if data.sin_recargo:
        con_penalizacion = False
        monto_penalizacion = 0
    monto_final = data.monto_recibido if data.monto_recibido else float(alumno.plan_pago or 0)

    comentario_auto = data.comentarios or ''
    if data.monto_recibido and data.monto_recibido != float(alumno.plan_pago or 0):
        nota = f"Pago personalizado: ${data.monto_recibido} (plan normal: ${alumno.plan_pago})"
        comentario_auto = f"{nota}. {comentario_auto}".strip('. ')

    pago = Pago(
        alumno_id=data.alumno_id,
        monto=monto_final,
        mes=mes_pago,
        anio=anio_pago,
        fecha_pago=data.fecha_pago or hoy,
        con_penalizacion=con_penalizacion,
        monto_penalizacion=monto_penalizacion,
        registrado_por=current_user.id,
        comentarios=comentario_auto or None,
        fecha_recepcion=data.fecha_recepcion,
        metodo_pago=data.metodo_pago
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

    from app.services.filtros import filtrar_alumnos_por_sucursal
    query = filtrar_alumnos_por_sucursal(query, current_user, db)

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
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from app.models.pago import Pago
    from datetime import date

    hoy = date.today()
    mes = mes or hoy.month
    anio = anio or hoy.year

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'pendiente', 'en_riesgo', 'bloqueado', 'becado', 'inscripcion'])
    )
    from app.services.filtros import filtrar_alumnos_por_sucursal
    query = filtrar_alumnos_por_sucursal(query, current_user, db)

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

@router.delete("/{pago_id}")
def eliminar_pago(
    pago_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.pago import Pago
    if current_user.rol not in ["directora", "encargada", "recepcionista", "contadora"]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    pago = db.query(Pago).filter(Pago.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    db.delete(pago)
    db.commit()
    return {"mensaje": "Pago eliminado correctamente"}