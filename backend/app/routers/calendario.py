from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, timedelta
import re
from app.database import get_db
from app.models.alumno import Alumno
from app.models.usuario import Usuario
from app.models.confirmacion_asistencia import ConfirmacionAsistencia
from app.models.recuperacion import ClaseRecuperacion
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/calendario", tags=["calendario"])

HORAS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

DIAS_MAP = {
    'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2,
    'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5
}

def parsear_horario(horario: str):
    if not horario:
        return []

    resultado = []
    franjas = horario.lower().split('|')

    for franja in franjas:
        franja = franja.strip()
        dias = []
        for dia_nombre, dia_num in DIAS_MAP.items():
            if dia_nombre in franja:
                if dia_num not in dias:
                    dias.append(dia_num)

        horas = re.findall(r'\d+:\d+', franja)
        hora_inicio = horas[0] if len(horas) >= 1 else None
        hora_fin = horas[1] if len(horas) >= 2 else None

        if dias and hora_inicio:
            for dia in dias:
                resultado.append({
                    'dia': dia,
                    'hora_inicio': hora_inicio,
                    'hora_fin': hora_fin
                })

    return resultado

def es_nuevo_ingreso(alumno, fecha_dia):
    if not alumno.fecha_ingreso:
        return False
    dias = (fecha_dia - alumno.fecha_ingreso).days
    if dias < 0 or dias > 7:
        return False
    if alumno.situacion in ['inscripcion', 'activo']:
        return True
    return False

@router.get("/semana")
def get_calendario_semana(
    fecha_inicio: Optional[str] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    hoy = date.today()

    if fecha_inicio:
        from datetime import datetime
        inicio_semana = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
    else:
        dias_para_lunes = hoy.weekday()
        inicio_semana = hoy - timedelta(days=dias_para_lunes)

    fechas_semana = [inicio_semana + timedelta(days=i) for i in range(6)]

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'inscripcion', 'becado', 'pendiente', 'prospecto'])
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)

    alumnos = query.all()

    confirmaciones = db.query(ConfirmacionAsistencia).filter(
        ConfirmacionAsistencia.fecha.in_(fechas_semana)
    ).all()
    conf_map = {(str(c.alumno_id), str(c.fecha)): c.confirmo for c in confirmaciones}

    recuperaciones = db.query(ClaseRecuperacion).filter(
        ClaseRecuperacion.fecha_recuperacion.in_(fechas_semana)
    ).all()

    calendario = {}
    for hora in HORAS:
        calendario[hora] = {i: [] for i in range(6)}

    for alumno in alumnos:
        franjas = parsear_horario(alumno.horario)

        for franja in franjas:
            dia = franja['dia']
            hora_inicio = franja['hora_inicio']
            fecha_dia = fechas_semana[dia] if dia < len(fechas_semana) else hoy

            # No mostrar alumno antes de su fecha de ingreso
            if alumno.fecha_ingreso and fecha_dia < alumno.fecha_ingreso:
                continue

            nuevo = es_nuevo_ingreso(alumno, fecha_dia)

            hora_key = None
            for h in HORAS:
                if h == hora_inicio or h.replace(':00', '') == hora_inicio.replace(':00', ''):
                    hora_key = h
                    break

            if hora_key is None:
                continue

            fecha_dia = fechas_semana[dia] if dia < len(fechas_semana) else None
            confirmado = conf_map.get((str(alumno.id), str(fecha_dia))) if fecha_dia else None

            estado = 'sin_confirmar'
            if confirmado is True:
                estado = 'confirma_asiste'
            elif confirmado is False:
                estado = 'confirma_no_asiste'
            elif alumno.situacion == 'prospecto':
                estado = 'prospecto'
            elif nuevo:
                estado = 'nuevo_ingreso'

            calendario[hora_key][dia].append({
                "alumno_id": str(alumno.id),
                "nombre": f"{alumno.nombre} {alumno.apellido}",
                "hora_fin": franja['hora_fin'],
                "estado": estado,
                "maestra_id": str(alumno.maestra_id) if alumno.maestra_id else None,
            })

    for recup in recuperaciones:
        alumno = db.query(Alumno).filter(Alumno.id == recup.alumno_id).first()
        if not alumno:
            continue
        dia = fechas_semana.index(recup.fecha_recuperacion)
        hora_key = recup.hora_inicio
        if hora_key not in calendario:
            hora_key = '9:00'
        calendario[hora_key][dia].append({
            "alumno_id": str(alumno.id),
            "nombre": f"{alumno.nombre} {alumno.apellido} ⟳",
            "hora_fin": recup.hora_fin,
            "estado": "recuperacion",
            "recuperacion_id": str(recup.id),
            "maestra_id": str(alumno.maestra_id) if alumno.maestra_id else None,
        })

    return {
        "semana": [str(f) for f in fechas_semana],
        "horas": HORAS,
        "calendario": {
            hora: {str(dia): alumnos for dia, alumnos in dias.items()}
            for hora, dias in calendario.items()
        }
    }

@router.post("/confirmar")
def confirmar_asistencia(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    alumno_id = data.get("alumno_id")
    fecha_str = data.get("fecha")
    confirmo = data.get("confirmo")

    fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()

    conf = db.query(ConfirmacionAsistencia).filter(
        ConfirmacionAsistencia.alumno_id == alumno_id,
        ConfirmacionAsistencia.fecha == fecha
    ).first()

    if conf:
        conf.confirmo = confirmo
        conf.registrado_por = current_user.id
    else:
        conf = ConfirmacionAsistencia(
            alumno_id=alumno_id,
            fecha=fecha,
            confirmo=confirmo,
            registrado_por=current_user.id
        )
        db.add(conf)

    db.commit()
    return {"mensaje": "Confirmación guardada"}

@router.post("/recuperacion")
def crear_recuperacion(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    recup = ClaseRecuperacion(
        alumno_id=data.get("alumno_id"),
        fecha_original=datetime.strptime(data.get("fecha_original"), '%Y-%m-%d').date(),
        fecha_recuperacion=datetime.strptime(data.get("fecha_recuperacion"), '%Y-%m-%d').date(),
        hora_inicio=data.get("hora_inicio"),
        hora_fin=data.get("hora_fin"),
        registrado_por=current_user.id
    )
    db.add(recup)
    db.commit()
    return {"mensaje": "Clase de recuperación agendada"}

@router.delete("/recuperacion/{recup_id}")
def eliminar_recuperacion(
    recup_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    recup = db.query(ClaseRecuperacion).filter(ClaseRecuperacion.id == recup_id).first()
    if recup:
        db.delete(recup)
        db.commit()
    return {"mensaje": "Recuperación eliminada"}

@router.get("/maestras")
def get_calendario_maestras(
    fecha_inicio: Optional[str] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    from app.models.usuario import Usuario as UsuarioModel

    hoy = date.today()
    if fecha_inicio:
        inicio_semana = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
    else:
        dias_para_lunes = hoy.weekday()
        inicio_semana = hoy - timedelta(days=dias_para_lunes)

    fechas_semana = [inicio_semana + timedelta(days=i) for i in range(6)]

    maestras = db.query(UsuarioModel).filter(
        UsuarioModel.rol.in_(['maestra', 'encargada']),
        UsuarioModel.activo == True
    ).all()

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'inscripcion', 'becado', 'pendiente'])
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)

    alumnos = query.all()

    maestras_map = {str(m.id): m for m in maestras}

    calendario = {}
    for hora in HORAS:
        calendario[hora] = {i: [] for i in range(6)}

    for alumno in alumnos:
        if not alumno.maestra_id:
            continue

        maestra = maestras_map.get(str(alumno.maestra_id))
        if not maestra:
            continue

        franjas = parsear_horario(alumno.horario)

        for franja in franjas:
            dia = franja['dia']
            hora_inicio = franja['hora_inicio']
            fecha_dia = fechas_semana[dia] if dia < len(fechas_semana) else hoy

            if alumno.fecha_ingreso and fecha_dia < alumno.fecha_ingreso:
                continue

            hora_key = None
            for h in HORAS:
                if h == hora_inicio or h.split(':')[0] == hora_inicio.split(':')[0]:
                    hora_key = h
                    break

            if hora_key is None:
                continue

            calendario[hora_key][dia].append({
                "alumno_id": str(alumno.id),
                "nombre": f"{alumno.nombre} {alumno.apellido}",
                "maestra_id": str(alumno.maestra_id),
                "maestra_nombre": maestra.nombre,
                "color": maestra.color or "#9B59B6",
                "hora_fin": franja['hora_fin'],
            })

    return {
        "semana": [str(f) for f in fechas_semana],
        "horas": HORAS,
        "maestras": [{"id": str(m.id), "nombre": m.nombre, "color": m.color or "#9B59B6"} for m in maestras],
        "calendario": {
            hora: {str(dia): alumnos for dia, alumnos in dias.items()}
            for hora, dias in calendario.items()
        }
    }

@router.get("/nuevos")
def get_nuevos_alumnos(
    fecha_inicio: Optional[str] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    hoy = date.today()
    if fecha_inicio:
        inicio_semana = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
    else:
        dias_para_lunes = hoy.weekday()
        inicio_semana = hoy - timedelta(days=dias_para_lunes)

    fin_semana = inicio_semana + timedelta(days=6)

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.fecha_ingreso >= inicio_semana,
        Alumno.fecha_ingreso <= fin_semana
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)

    alumnos = query.order_by(Alumno.fecha_ingreso).all()

    from app.models.usuario import Usuario as UsuarioModel

    return [{
        "nombre": f"{a.nombre} {a.apellido}",
        "alumno_id": str(a.id),
        "materias": a.materias,
        "programa_lectura": a.programa_lectura,
        "programa_matematicas": a.programa_matematicas,
        "fecha_ingreso": str(a.fecha_ingreso),
        "maestra_nombre": db.query(UsuarioModel).filter(UsuarioModel.id == a.maestra_id).first().nombre if a.maestra_id else None
    } for a in alumnos]

@router.get("/prospectos")
def get_prospectos(
    fecha_inicio: Optional[str] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    from app.models.prospecto_calendario import ProspectoCalendario
    hoy = date.today()
    if fecha_inicio:
        inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
    else:
        inicio = hoy - timedelta(days=hoy.weekday())
    fin = inicio + timedelta(days=6)

    query = db.query(ProspectoCalendario).filter(
        ProspectoCalendario.fecha >= inicio,
        ProspectoCalendario.fecha <= fin
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(ProspectoCalendario.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(ProspectoCalendario.sucursal_id == sucursal_id)

    prospectos = query.all()
    return [{
        "id": str(p.id),
        "nombre_nino": p.nombre_nino,
        "grado": p.grado,
        "edad": p.edad,
        "nombre_tutor": p.nombre_tutor,
        "telefono_tutor": p.telefono_tutor,
        "fecha": str(p.fecha),
        "hora": p.hora,
    } for p in prospectos]

@router.post("/prospectos")
def crear_prospecto(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from datetime import datetime
    from app.models.prospecto_calendario import ProspectoCalendario
    p = ProspectoCalendario(
        nombre_nino=data.get("nombre_nino"),
        grado=data.get("grado"),
        edad=data.get("edad"),
        nombre_tutor=data.get("nombre_tutor"),
        telefono_tutor=data.get("telefono_tutor"),
        sucursal_id=current_user.sucursal_id,
        fecha=datetime.strptime(data.get("fecha"), '%Y-%m-%d').date(),
        hora=data.get("hora"),
        registrado_por=current_user.id
    )
    db.add(p)
    db.commit()
    return {"mensaje": "Prospecto agendado", "id": str(p.id)}

@router.delete("/prospectos/{prospecto_id}")
def eliminar_prospecto(
    prospecto_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.prospecto_calendario import ProspectoCalendario
    p = db.query(ProspectoCalendario).filter(ProspectoCalendario.id == prospecto_id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"mensaje": "Prospecto eliminado"}
