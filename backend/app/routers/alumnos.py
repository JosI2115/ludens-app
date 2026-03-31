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
    numero_hermano: Optional[int] = 1
    programa_lectura: Optional[str] = None
    programa_matematicas: Optional[str] = None
    domicilio: Optional[str] = None
    escuela_procedencia: Optional[str] = None
    condicion_medica: Optional[str] = None
    permiso_fotos: Optional[bool] = False
    objetivos: Optional[str] = None

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
    numero_hermano: Optional[int] = None
    programa_lectura: Optional[str] = None
    programa_matematicas: Optional[str] = None
    domicilio: Optional[str] = None
    escuela_procedencia: Optional[str] = None
    condicion_medica: Optional[str] = None
    permiso_fotos: Optional[bool] = None
    objetivos: Optional[str] = None

@router.get("/")
def get_alumnos(
    sucursal_id: Optional[str] = None,
    situacion: Optional[str] = None,
    incluir_bajas: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Actualizar situaciones por inasistencia antes de listar
    from datetime import date, timedelta
    from app.models.asistencia import Asistencia

    hoy = date.today()
    hace_20 = hoy - timedelta(days=20)
    hace_30 = hoy - timedelta(days=30)

    alumnos_check = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'en_riesgo', 'pendiente', 'inscripcion'])
    ).all()

    actualizado = False
    for alumno in alumnos_check:
        # Buscar la primera asistencia confirmada del alumno
        primera_asistencia = db.query(Asistencia).filter(
            Asistencia.alumno_id == alumno.id,
            Asistencia.asistio == True
        ).order_by(Asistencia.fecha.asc()).first()

        if not primera_asistencia:
            # Sin ninguna asistencia confirmada aún — no aplicar reglas
            continue

        # Buscar la última asistencia confirmada
        ultima_asistencia = db.query(Asistencia).filter(
            Asistencia.alumno_id == alumno.id,
            Asistencia.asistio == True
        ).order_by(Asistencia.fecha.desc()).first()

        # Días naturales desde la última asistencia hasta hoy
        dias_sin_asistir = (hoy - ultima_asistencia.fecha).days

        if dias_sin_asistir >= 30:
            if alumno.situacion != 'baja':
                alumno.situacion = 'baja'
                alumno.fecha_baja = hoy
                alumno.motivo_baja = f'Baja automática por {dias_sin_asistir} días sin asistir'
                actualizado = True
        elif dias_sin_asistir >= 20:
            if alumno.situacion not in ['en_riesgo', 'baja']:
                alumno.situacion = 'en_riesgo'
                actualizado = True
        else:
            if alumno.situacion == 'en_riesgo':
                alumno.situacion = 'activo'
                actualizado = True

    if actualizado:
        db.commit()

    query = db.query(Alumno).filter(Alumno.activo == True)

    if not incluir_bajas:
        query = query.filter(Alumno.situacion != 'baja')

    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query = query.filter(Alumno.sucursal_id == sucursal_id)

    if situacion:
        query = query.filter(Alumno.situacion == situacion)
    
    from sqlalchemy.orm import joinedload
    alumnos = query.options(joinedload(Alumno.maestra)).order_by(Alumno.nombre).all()
    return [{
        **{c.name: getattr(a, c.name) for c in a.__table__.columns},
        "maestra_nombre": a.maestra.nombre if a.maestra else None
    } for a in alumnos]

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

    # Calcular monto real con descuento por hermano
    DESCUENTOS = {
        '900':  {1: 900,  2: 630,  3: 765,  4: 855},
        '1200': {1: 1200, 2: 840,  3: 1020, 4: 1140},
        '1500': {1: 1500, 2: 1050, 3: 1275, 4: 1425},
    }

    plan = datos.get('plan_pago')
    hermano = int(datos.get('numero_hermano') or 1)
    if plan and str(plan) in DESCUENTOS:
        monto = DESCUENTOS[str(plan)].get(hermano)
        if monto:
            datos['plan_pago'] = str(monto)

    # Limpiar campos UUID vacíos
    if not datos.get('sucursal_id') or datos['sucursal_id'] == '':
        if current_user.sucursal_id:
            datos['sucursal_id'] = str(current_user.sucursal_id)
        else:
            datos['sucursal_id'] = None

    if not datos.get('maestra_id') or datos['maestra_id'] == '':
        datos['maestra_id'] = None

    # Limpiar campos vacíos
    for campo in ['grado', 'diagnostico', 'telefono_emergencia', 'horario', 'materias',
                  'programa_lectura', 'programa_matematicas', 'domicilio',
                  'escuela_procedencia', 'condicion_medica', 'objetivos']:
        if datos.get(campo) == '':
            datos[campo] = None

    print(f"DEBUG programa_lectura={datos.get('programa_lectura')} programa_matematicas={datos.get('programa_matematicas')}")
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
    for campo in ['programa_lectura', 'programa_matematicas', 'grado', 'diagnostico',
                  'horario', 'domicilio', 'escuela_procedencia', 'condicion_medica', 'objetivos']:
        if campo in cambios and cambios[campo] == '':
            cambios[campo] = None

    import json

    # Si cambia programa_lectura, guardar el anterior en historial
    if 'programa_lectura' in cambios and cambios['programa_lectura'] and cambios['programa_lectura'] != alumno.programa_lectura:
        historial = []
        if alumno.programas_lectura_historial:
            try:
                historial = json.loads(alumno.programas_lectura_historial)
            except:
                pass
        if alumno.programa_lectura and alumno.programa_lectura not in historial:
            historial.append(alumno.programa_lectura)
        cambios['programas_lectura_historial'] = json.dumps(historial)

    # Si cambia programa_matematicas, guardar el anterior en historial
    if 'programa_matematicas' in cambios and cambios['programa_matematicas'] and cambios['programa_matematicas'] != alumno.programa_matematicas:
        historial = []
        if alumno.programas_matematicas_historial:
            try:
                historial = json.loads(alumno.programas_matematicas_historial)
            except:
                pass
        if alumno.programa_matematicas and alumno.programa_matematicas not in historial:
            historial.append(alumno.programa_matematicas)
        cambios['programas_matematicas_historial'] = json.dumps(historial)

    if 'fecha_ingreso' in cambios and cambios['fecha_ingreso'] and alumno.fecha_ingreso != cambios['fecha_ingreso']:
        from app.models.asistencia import Asistencia
        from datetime import datetime as dt
        nueva_fecha = cambios['fecha_ingreso']
        if isinstance(nueva_fecha, str):
            nueva_fecha = dt.strptime(nueva_fecha, '%Y-%m-%d').date()
        # Borrar TODAS las asistencias al cambiar fecha de ingreso
        deleted = db.query(Asistencia).filter(
            Asistencia.alumno_id == alumno.id
        ).delete()
        cambios['situacion'] = 'activo'
        cambios['fecha_baja'] = None
        cambios['motivo_baja'] = None
        cambios['fecha_reactivacion'] = None

    if 'situacion' in cambios and cambios['situacion'] != 'baja' and alumno.situacion == 'baja':
        from datetime import date as date_type
        cambios['fecha_baja'] = None
        cambios['fecha_reactivacion'] = date_type.today()
        if alumno.motivo_baja and 'automática' in alumno.motivo_baja:
            cambios['motivo_baja'] = None

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
    
    # Sincronizar con informes cuando cambia situación
    if 'situacion' in cambios:
        from app.models.informe import Informe
        nueva_situacion = cambios['situacion']

        informe = db.query(Informe).filter(
            Informe.alumno_id == alumno.id
        ).first()

        if informe:
            if nueva_situacion == 'inscripcion':
                informe.situacion = 'pago_inscripcion'
                informe.ultimo_contacto = date.today()
            elif nueva_situacion == 'activo':
                informe.situacion = 'inscrito'
                informe.fecha_inscripcion = date.today()
                informe.ultimo_contacto = date.today()

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
    if current_user.rol not in ["directora", "encargada", "recepcionista"]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    alumno.situacion = "baja"
    alumno.fecha_baja = date.today()
    alumno.motivo_baja = motivo
    alumno.activo = False
    db.commit()
    return {"mensaje": "Alumno dado de baja correctamente"}

@router.delete("/{alumno_id}/eliminar")
def eliminar_alumno_completo(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol not in ["directora", "encargada"]:
        raise HTTPException(status_code=403, detail="Solo directora o encargada")

    from sqlalchemy import text
    from app.models.bitacora import Bitacora
    from app.models.pago import Pago
    from app.models.asistencia import Asistencia
    from app.models.historial import HistorialCambio

    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    db.execute(text("DELETE FROM confirmaciones_asistencia WHERE alumno_id = :id"), {"id": alumno_id})
    db.execute(text("DELETE FROM clases_recuperacion WHERE alumno_id = :id"), {"id": alumno_id})
    db.execute(text("DELETE FROM reportes_mensuales WHERE alumno_id = :id"), {"id": alumno_id})
    db.query(Bitacora).filter(Bitacora.alumno_id == alumno_id).delete()
    db.query(HistorialCambio).filter(HistorialCambio.alumno_id == alumno_id).delete()
    db.query(Asistencia).filter(Asistencia.alumno_id == alumno_id).delete()
    db.query(Pago).filter(Pago.alumno_id == alumno_id).delete()
    db.delete(alumno)
    db.commit()
    return {"mensaje": "Alumno eliminado completamente"}

@router.get("/{alumno_id}/perfil")
def get_perfil_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.pago import Pago
    from app.models.asistencia import Asistencia
    from app.models.historial import HistorialCambio
    from datetime import date

    from sqlalchemy.orm import joinedload
    alumno = db.query(Alumno).options(
        joinedload(Alumno.maestra)
    ).filter(Alumno.id == alumno_id, Alumno.activo == True).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    pagos = db.query(Pago).filter(
        Pago.alumno_id == alumno.id
    ).order_by(Pago.anio.desc(), Pago.mes.desc()).all()

    asistencias = db.query(Asistencia).filter(
        Asistencia.alumno_id == alumno.id
    ).order_by(Asistencia.fecha.desc()).limit(30).all()

    historial = db.query(HistorialCambio).filter(
        HistorialCambio.alumno_id == alumno.id
    ).order_by(HistorialCambio.created_at.desc()).limit(20).all()

    presentes = sum(1 for a in asistencias if a.asistio)
    ausentes = sum(1 for a in asistencias if not a.asistio)

    return {
        "alumno": {
            "id": str(alumno.id),
            "nombre": alumno.nombre,
            "apellido": alumno.apellido,
            "edad": alumno.edad,
            "grado": alumno.grado,
            "diagnostico": alumno.diagnostico,
            "nombre_tutor": alumno.nombre_tutor,
            "telefono_tutor": alumno.telefono_tutor,
            "telefono_emergencia": alumno.telefono_emergencia,
            "situacion": alumno.situacion,
            "plan_pago": alumno.plan_pago,
            "materias": alumno.materias,
            "dia_pago": alumno.dia_pago,
            "horario": alumno.horario,
            "fecha_ingreso": str(alumno.fecha_ingreso) if alumno.fecha_ingreso else None,
            "fecha_diagnostico": str(alumno.fecha_diagnostico) if alumno.fecha_diagnostico else None,
            "tiene_descuento_hermano": alumno.tiene_descuento_hermano,
            "numero_hermano": alumno.numero_hermano,
            "sucursal_id": str(alumno.sucursal_id) if alumno.sucursal_id else None,
            "fecha_nacimiento": str(alumno.fecha_nacimiento) if alumno.fecha_nacimiento else None,
            "condicion_medica": alumno.condicion_medica,
            "escuela_procedencia": alumno.escuela_procedencia,
            "permiso_fotos": alumno.permiso_fotos,
            "maestra_nombre": alumno.maestra.nombre if alumno.maestra else None,
            "programa_lectura": alumno.programa_lectura,
            "programa_matematicas": alumno.programa_matematicas,
            "objetivos": alumno.objetivos,
            "domicilio": alumno.domicilio,
            "escuela_procedencia": alumno.escuela_procedencia,
            "condicion_medica": alumno.condicion_medica,
            "permiso_fotos": alumno.permiso_fotos,
        },
        "pagos": [{
            "id": str(p.id),
            "mes": p.mes,
            "anio": p.anio,
            "monto": float(p.monto),
            "fecha_pago": str(p.fecha_pago) if p.fecha_pago else None,
            "con_penalizacion": p.con_penalizacion,
            "monto_penalizacion": float(p.monto_penalizacion),
            "comentarios": p.comentarios,
        } for p in pagos],
        "asistencias_resumen": {
            "total": len(asistencias),
            "presentes": presentes,
            "ausentes": ausentes,
            "porcentaje": round((presentes / len(asistencias) * 100) if asistencias else 0, 1)
        },
        "asistencias": [{
            "fecha": str(a.fecha),
            "asistio": a.asistio,
        } for a in asistencias],
        "historial": [{
            "campo": h.campo_modificado,
            "anterior": h.valor_anterior,
            "nuevo": h.valor_nuevo,
            "fecha": str(h.created_at),
        } for h in historial],
    }