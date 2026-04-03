from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.informe import Informe
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/informes", tags=["informes"])

SITUACIONES = [
    'informes', 'seguimiento_1', 'seguimiento_2', 'seguimiento_3',
    'agendo_diagnostico', 'acudio_diagnostico', 'no_contesta',
    'pago_inscripcion', 'inscrito'
]

class InformeCreate(BaseModel):
    nombre_contacto: str
    medio: Optional[str] = None
    situacion: Optional[str] = 'informes'
    fecha_solicitud: Optional[str] = None
    sucursal_id: Optional[str] = None
    comision_usuario1_id: Optional[str] = None
    comision_usuario2_id: Optional[str] = None
    nombre_nino: Optional[str] = None
    apellido_nino: Optional[str] = None
    edad_nino: Optional[int] = None
    grado_nino: Optional[str] = None
    comentarios: Optional[str] = None
    contacto_dato: Optional[str] = None
    fecha_diagnostico: Optional[str] = None
    hora_diagnostico: Optional[str] = None

class InformeUpdate(BaseModel):
    nombre_contacto: Optional[str] = None
    medio: Optional[str] = None
    situacion: Optional[str] = None
    sucursal_id: Optional[str] = None
    comision_usuario1_id: Optional[str] = None
    comision_usuario2_id: Optional[str] = None
    nombre_nino: Optional[str] = None
    apellido_nino: Optional[str] = None
    edad_nino: Optional[int] = None
    grado_nino: Optional[str] = None
    comentarios: Optional[str] = None
    contacto_dato: Optional[str] = None
    fecha_diagnostico: Optional[str] = None
    hora_diagnostico: Optional[str] = None
    ultimo_contacto: Optional[str] = None
    alumno_id: Optional[str] = None

def informe_to_dict(inf, db):
    sucursal = db.query(Sucursal).filter(Sucursal.id == inf.sucursal_id).first() if inf.sucursal_id else None
    u1 = db.query(Usuario).filter(Usuario.id == inf.comision_usuario1_id).first() if inf.comision_usuario1_id else None
    u2 = db.query(Usuario).filter(Usuario.id == inf.comision_usuario2_id).first() if inf.comision_usuario2_id else None
    return {
        "id": str(inf.id),
        "nombre_contacto": inf.nombre_contacto,
        "medio": inf.medio,
        "situacion": inf.situacion,
        "fecha_solicitud": str(inf.fecha_solicitud) if inf.fecha_solicitud else None,
        "sucursal_id": str(inf.sucursal_id) if inf.sucursal_id else None,
        "sucursal_nombre": sucursal.nombre if sucursal else None,
        "comision_usuario1_id": str(inf.comision_usuario1_id) if inf.comision_usuario1_id else None,
        "comision_usuario1_nombre": u1.nombre if u1 else None,
        "comision_usuario2_id": str(inf.comision_usuario2_id) if inf.comision_usuario2_id else None,
        "comision_usuario2_nombre": u2.nombre if u2 else None,
        "nombre_nino": inf.nombre_nino,
        "apellido_nino": inf.apellido_nino,
        "edad_nino": inf.edad_nino,
        "grado_nino": inf.grado_nino,
        "comentarios": inf.comentarios,
        "contacto_dato": inf.contacto_dato,
        "fecha_diagnostico": str(inf.fecha_diagnostico) if inf.fecha_diagnostico else None,
        "hora_diagnostico": inf.hora_diagnostico,
        "ultimo_contacto": str(inf.ultimo_contacto) if inf.ultimo_contacto else None,
        "alumno_id": str(inf.alumno_id) if inf.alumno_id else None,
        "created_at": str(inf.created_at) if inf.created_at else None,
    }

@router.get("/")
def get_informes(
    sucursal_id: Optional[str] = None,
    situacion: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    query = db.query(Informe)
    if current_user.rol == 'encargada' and not current_user.es_encargada_general:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Informe.sucursal_id == current_user.sucursal_id,
                Informe.registrado_por == current_user.id
            )
        )
    elif current_user.rol in ["recepcionista", "maestra"]:
        query = query.filter(Informe.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Informe.sucursal_id == sucursal_id)
    if situacion:
        query = query.filter(Informe.situacion == situacion)
    informes = query.order_by(Informe.created_at.desc()).all()
    return [informe_to_dict(inf, db) for inf in informes]

@router.post("/")
def crear_informe(
    data: InformeCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    fecha = datetime.strptime(data.fecha_solicitud, '%Y-%m-%d').date() if data.fecha_solicitud else date.today()
    inf = Informe(
        nombre_contacto=data.nombre_contacto,
        medio=data.medio,
        situacion=data.situacion or 'informes',
        fecha_solicitud=fecha,
        sucursal_id=data.sucursal_id or (str(current_user.sucursal_id) if current_user.sucursal_id else None),
        comision_usuario1_id=data.comision_usuario1_id,
        comision_usuario2_id=data.comision_usuario2_id,
        nombre_nino=data.nombre_nino,
        apellido_nino=data.apellido_nino,
        edad_nino=data.edad_nino,
        grado_nino=data.grado_nino,
        comentarios=data.comentarios,
        contacto_dato=data.contacto_dato,
        fecha_diagnostico=datetime.strptime(data.fecha_diagnostico, '%Y-%m-%d').date() if data.fecha_diagnostico else None,
        hora_diagnostico=data.hora_diagnostico,
        ultimo_contacto=fecha,
        registrado_por=current_user.id
    )
    db.add(inf)
    db.commit()
    db.refresh(inf)
    return informe_to_dict(inf, db)

@router.put("/{informe_id}")
def actualizar_informe(
    informe_id: str,
    data: InformeUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    inf = db.query(Informe).filter(Informe.id == informe_id).first()
    if not inf:
        raise HTTPException(status_code=404, detail="Informe no encontrado")

    cambios = data.dict(exclude_unset=True)
    for campo, valor in cambios.items():
        if campo in ['fecha_diagnostico', 'ultimo_contacto', 'fecha_solicitud'] and valor:
            valor = datetime.strptime(valor, '%Y-%m-%d').date()
        setattr(inf, campo, valor)

    # Si agenda diagnóstico, agregar al calendario
    if inf.situacion == 'agendo_diagnostico' and inf.fecha_diagnostico and inf.hora_diagnostico and inf.nombre_nino:
        from app.models.prospecto_calendario import ProspectoCalendario
        prospecto_existe = db.query(ProspectoCalendario).filter(
            ProspectoCalendario.nombre_nino == inf.nombre_nino,
            ProspectoCalendario.fecha == inf.fecha_diagnostico
        ).first()
        if not prospecto_existe:
            prospecto = ProspectoCalendario(
                nombre_nino=inf.nombre_nino,
                grado=inf.grado_nino,
                edad=inf.edad_nino,
                nombre_tutor=inf.nombre_contacto,
                sucursal_id=inf.sucursal_id,
                fecha=inf.fecha_diagnostico,
                hora=inf.hora_diagnostico,
                registrado_por=current_user.id
            )
            db.add(prospecto)

    db.commit()
    return informe_to_dict(inf, db)

@router.delete("/{informe_id}")
def eliminar_informe(
    informe_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol not in ["directora", "encargada"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    inf = db.query(Informe).filter(Informe.id == informe_id).first()
    if inf:
        db.delete(inf)
        db.commit()
    return {"mensaje": "Informe eliminado"}

@router.get("/resumen")
def get_resumen_informes(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from datetime import date
    import calendar

    hoy = date.today()
    mes = mes or hoy.month
    anio = anio or hoy.year

    primer_dia = date(anio, mes, 1)
    ultimo_dia = date(anio, mes, calendar.monthrange(anio, mes)[1])

    sucursales = db.query(Sucursal).all()
    resultado = []

    for suc in sucursales:
        total_informes = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.fecha_solicitud.between(primer_dia, ultimo_dia)
        ).count()

        diagnosticos = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.situacion.in_(['agendo_diagnostico', 'acudio_diagnostico', 'pago_inscripcion', 'inscrito']),
            Informe.fecha_solicitud.between(primer_dia, ultimo_dia)
        ).count()

        inscritos = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.situacion.in_(['pago_inscripcion', 'inscrito']),
            Informe.fecha_solicitud.between(primer_dia, ultimo_dia)
        ).count()

        bajas = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.situacion == 'baja',
            Alumno.fecha_baja >= primer_dia,
            Alumno.fecha_baja <= ultimo_dia
        ).count()

        activos = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.situacion.in_(['activo', 'inscripcion', 'becado']),
            Alumno.activo == True
        ).count()

        resultado.append({
            "sucursal": suc.nombre,
            "sucursal_id": str(suc.id),
            "total_informes": total_informes,
            "diagnosticos": diagnosticos,
            "inscritos": inscritos,
            "bajas": bajas,
            "activos": activos,
        })

    sin_sucursal = db.query(Informe).filter(
        Informe.sucursal_id == None,
        Informe.fecha_solicitud.between(primer_dia, ultimo_dia)
    ).count()

    resultado.append({
        "sucursal": "Sin sucursal",
        "sucursal_id": None,
        "total_informes": sin_sucursal,
        "diagnosticos": 0,
        "inscritos": 0,
        "bajas": 0,
        "activos": 0,
    })

    return {"mes": mes, "anio": anio, "sucursales": resultado}


@router.post("/resumen/generar-semana")
def generar_snapshot_semana(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.resumen_semanal import ResumenSemanal
    from app.models.alumno import Alumno
    from datetime import date, timedelta
    import calendar

    if current_user.rol not in ["directora", "encargada"] and not current_user.es_encargada_general:
        raise HTTPException(status_code=403, detail="Sin permisos")

    hoy = date.today()
    lunes = hoy - timedelta(days=hoy.weekday())
    domingo = lunes + timedelta(days=6)
    mes = lunes.month
    anio = lunes.year
    numero_semana = (lunes.day - 1) // 7 + 1

    sucursales = db.query(Sucursal).all()
    generados = []

    for suc in sucursales:
        alumnos_totales = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.activo == True,
            Alumno.situacion.in_(['activo', 'inscripcion', 'becado', 'pendiente'])
        ).count()

        nuevos = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.fecha_ingreso.between(lunes, domingo)
        ).count()

        bajas = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.situacion == 'baja',
            Alumno.fecha_baja.between(lunes, domingo)
        ).count()

        diagnosticos = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.situacion.in_(['agendo_diagnostico', 'acudio_diagnostico']),
            Informe.fecha_solicitud.between(lunes, domingo)
        ).count()

        inf_ws = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'WhatsApp', Informe.fecha_solicitud.between(lunes, domingo)).count()
        inf_ll = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'Llamada', Informe.fecha_solicitud.between(lunes, domingo)).count()
        inf_su = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'Sucursal', Informe.fecha_solicitud.between(lunes, domingo)).count()
        inf_re = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio.in_(['Facebook', 'Recomendación']), Informe.fecha_solicitud.between(lunes, domingo)).count()
        inf_ex = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'Otro', Informe.fecha_solicitud.between(lunes, domingo)).count()

        existente = db.query(ResumenSemanal).filter(
            ResumenSemanal.sucursal_id == suc.id,
            ResumenSemanal.semana_inicio == lunes
        ).first()

        if existente:
            existente.alumnos_totales = alumnos_totales
            existente.nuevos_ingresos = nuevos
            existente.diagnosticos = diagnosticos
            existente.bajas = bajas
            existente.inf_whatsapp = inf_ws
            existente.inf_llamadas = inf_ll
            existente.inf_sucursal = inf_su
            existente.inf_redes = inf_re
            existente.inf_extras = inf_ex
            generados.append(suc.nombre)
            continue

        snap = ResumenSemanal(
            sucursal_id=suc.id,
            sucursal_nombre=suc.nombre,
            semana_inicio=lunes,
            semana_fin=domingo,
            mes=mes,
            anio=anio,
            numero_semana=numero_semana,
            alumnos_totales=alumnos_totales,
            nuevos_ingresos=nuevos,
            diagnosticos=diagnosticos,
            bajas=bajas,
            inf_whatsapp=inf_ws,
            inf_llamadas=inf_ll,
            inf_sucursal=inf_su,
            inf_redes=inf_re,
            inf_extras=inf_ex
        )
        db.add(snap)
        generados.append(suc.nombre)

    db.commit()
    return {"mensaje": f"Snapshot generado para semana {lunes} - {domingo}", "sucursales": generados}


@router.post("/resumen/auto-snapshot")
def auto_snapshot(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.resumen_semanal import ResumenSemanal
    from app.models.alumno import Alumno
    from datetime import date, timedelta

    hoy = date.today()
    dias_lunes = hoy.weekday()
    lunes_actual = hoy - timedelta(days=dias_lunes)
    lunes_anterior = lunes_actual - timedelta(days=7)
    domingo_anterior = lunes_anterior + timedelta(days=6)
    mes = lunes_anterior.month
    anio = lunes_anterior.year
    numero_semana = (lunes_anterior.day - 1) // 7 + 1

    sucursales = db.query(Sucursal).all()
    generados = 0

    for suc in sucursales:
        existente = db.query(ResumenSemanal).filter(
            ResumenSemanal.sucursal_id == suc.id,
            ResumenSemanal.semana_inicio == lunes_anterior
        ).first()
        if existente:
            continue

        alumnos_totales = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.activo == True,
            Alumno.situacion.in_(['activo', 'inscripcion', 'becado', 'pendiente'])
        ).count()

        nuevos = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.fecha_ingreso.between(lunes_anterior, domingo_anterior)
        ).count()

        bajas = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.situacion == 'baja',
            Alumno.fecha_baja.between(lunes_anterior, domingo_anterior)
        ).count()

        diagnosticos = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.situacion.in_(['agendo_diagnostico', 'acudio_diagnostico']),
            Informe.fecha_solicitud.between(lunes_anterior, domingo_anterior)
        ).count()

        inf_ws = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'WhatsApp', Informe.fecha_solicitud.between(lunes_anterior, domingo_anterior)).count()
        inf_ll = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'Llamada', Informe.fecha_solicitud.between(lunes_anterior, domingo_anterior)).count()
        inf_su = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'Sucursal', Informe.fecha_solicitud.between(lunes_anterior, domingo_anterior)).count()
        inf_re = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio.in_(['Facebook', 'Recomendación']), Informe.fecha_solicitud.between(lunes_anterior, domingo_anterior)).count()
        inf_ex = db.query(Informe).filter(Informe.sucursal_id == suc.id, Informe.medio == 'Otro', Informe.fecha_solicitud.between(lunes_anterior, domingo_anterior)).count()

        snap = ResumenSemanal(
            sucursal_id=suc.id,
            sucursal_nombre=suc.nombre,
            semana_inicio=lunes_anterior,
            semana_fin=domingo_anterior,
            mes=mes,
            anio=anio,
            numero_semana=numero_semana,
            alumnos_totales=alumnos_totales,
            nuevos_ingresos=nuevos,
            diagnosticos=diagnosticos,
            bajas=bajas,
            inf_whatsapp=inf_ws,
            inf_llamadas=inf_ll,
            inf_sucursal=inf_su,
            inf_redes=inf_re,
            inf_extras=inf_ex
        )
        db.add(snap)
        generados += 1

    db.commit()
    return {"generados": generados, "semana": f"{lunes_anterior} al {domingo_anterior}"}


@router.get("/resumen/historico")
def get_resumen_historico(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.resumen_semanal import ResumenSemanal
    from datetime import date

    hoy = date.today()
    mes = mes or hoy.month
    anio = anio or hoy.year

    snapshots = db.query(ResumenSemanal).filter(
        ResumenSemanal.mes == mes,
        ResumenSemanal.anio == anio
    ).order_by(ResumenSemanal.numero_semana, ResumenSemanal.sucursal_nombre).all()

    semanas = {}
    for snap in snapshots:
        key = snap.numero_semana
        if key not in semanas:
            semanas[key] = {
                "numero_semana": snap.numero_semana,
                "semana_inicio": str(snap.semana_inicio),
                "semana_fin": str(snap.semana_fin),
                "sucursales": []
            }
        semanas[key]["sucursales"].append({
            "sucursal": snap.sucursal_nombre,
            "alumnos_totales": snap.alumnos_totales,
            "nuevos_ingresos": snap.nuevos_ingresos,
            "diagnosticos": snap.diagnosticos,
            "bajas": snap.bajas,
            "inf_whatsapp": snap.inf_whatsapp,
            "inf_llamadas": snap.inf_llamadas,
            "inf_sucursal": snap.inf_sucursal,
            "inf_redes": snap.inf_redes,
            "inf_extras": snap.inf_extras,
        })

    return {"mes": mes, "anio": anio, "semanas": list(semanas.values())}
