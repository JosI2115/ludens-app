from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.usuario import Usuario
from app.auth.auth import verificar_password, crear_token, hashear_password
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str
    sucursal_id: str = None

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    usuario = db.query(Usuario).options(joinedload(Usuario.sucursal)).filter(Usuario.email == request.email).first()
    
    if not usuario or not verificar_password(request.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos"
        )
    
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo"
        )
    
    token = crear_token({
        "sub": usuario.email,
        "rol": usuario.rol,
        "nombre": usuario.nombre,
        "sucursal_id": str(usuario.sucursal_id) if usuario.sucursal_id else None
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": str(usuario.id),
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol": usuario.rol,
            "sucursal_id": str(usuario.sucursal_id) if usuario.sucursal_id else None,
            "sucursal_nombre": usuario.sucursal.nombre if usuario.sucursal_id and usuario.sucursal else None
        }
    }

@router.post("/crear-usuario")
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    nuevo = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hashear_password(data.password),
        rol=data.rol,
        sucursal_id=data.sucursal_id
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Usuario creado correctamente", "id": str(nuevo.id)}

@router.get("/me")
def me(db: Session = Depends(get_db)):
    return {"mensaje": "ruta funcionando"}

@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from app.models.pago import Pago
    from app.models.sucursal import Sucursal
    from datetime import date

    hoy = date.today()
    mes = hoy.month
    anio = hoy.year
    primer_dia_mes = date(anio, mes, 1)

    query_base = db.query(Alumno)
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query_base = query_base.filter(Alumno.sucursal_id == current_user.sucursal_id)

    # Total alumnos activos
    total_activos = query_base.filter(Alumno.activo == True, Alumno.situacion != 'baja').count()

    # Alumnos nuevos este mes
    nuevos_mes = query_base.filter(
        Alumno.activo == True,
        Alumno.fecha_ingreso >= primer_dia_mes
    ).count()

    # Alumnos dados de baja este mes
    bajas_mes = query_base.filter(
        Alumno.situacion == 'baja',
        Alumno.fecha_baja >= primer_dia_mes
    ).count()

    # Total ingresos del mes
    pagos_query = db.query(Pago).filter(Pago.mes == mes, Pago.anio == anio)
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        alumno_ids = [a.id for a in query_base.all()]
        pagos_query = pagos_query.filter(Pago.alumno_id.in_(alumno_ids))
    pagos_mes = pagos_query.all()
    total_ingresos = sum(float(p.monto) + float(p.monto_penalizacion) for p in pagos_mes)

    # Alumnos por sucursal
    sucursales = db.query(Sucursal).filter(Sucursal.activa == True).all()
    por_sucursal = []
    for suc in sucursales:
        count = db.query(Alumno).filter(
            Alumno.activo == True,
            Alumno.situacion != 'baja',
            Alumno.sucursal_id == suc.id
        ).count()
        por_sucursal.append({
            "sucursal": suc.nombre,
            "total": count
        })

    return {
        "total_activos": total_activos,
        "nuevos_mes": nuevos_mes,
        "bajas_mes": bajas_mes,
        "total_ingresos": total_ingresos,
        "por_sucursal": por_sucursal,
        "mes": mes,
        "anio": anio
    }

@router.get("/dashboard/pendientes")
def dashboard_pendientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from app.models.pago import Pago
    from app.models.bitacora import Bitacora
    from datetime import date

    hoy = date.today()
    mes = hoy.month
    anio = hoy.year
    pendientes = []

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'pendiente', 'en_riesgo', 'bloqueado'])
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    alumnos = query.all()

    # Alumnos sin pagar este mes
    sin_pagar = []
    for alumno in alumnos:
        pago = db.query(Pago).filter(
            Pago.alumno_id == alumno.id,
            Pago.mes == mes,
            Pago.anio == anio
        ).first()
        if not pago and alumno.dia_pago:
            try:
                fecha_pago = date(anio, mes, alumno.dia_pago)
                if alumno.fecha_ingreso and alumno.fecha_ingreso > fecha_pago:
                    continue
                dias = (hoy - fecha_pago).days
                if dias > 5:
                    sin_pagar.append({
                        "tipo": "pago",
                        "mensaje": f"{alumno.nombre} {alumno.apellido} — {dias} días sin pagar",
                        "urgente": dias > 10,
                        "alumno_id": str(alumno.id)
                    })
            except:
                pass

    if sin_pagar:
        pendientes.append({
            "categoria": "💰 Pagos pendientes",
            "items": sin_pagar[:5]
        })

    # Actividades por imprimir
    bitacoras_imprimir = db.query(Bitacora).filter(
        Bitacora.estado == "Imprimir"
    ).all()

    alumnos_imprimir = {}
    for b in bitacoras_imprimir:
        alumno = db.query(Alumno).filter(Alumno.id == b.alumno_id).first()
        if alumno:
            nombre = f"{alumno.nombre} {alumno.apellido}"
            if nombre not in alumnos_imprimir:
                alumnos_imprimir[nombre] = {
                    "tipo": "imprimir",
                    "mensaje": nombre,
                    "urgente": False,
                    "alumno_id": str(alumno.id),
                    "count": 0
                }
            alumnos_imprimir[nombre]["count"] += 1

    items_imprimir = list(alumnos_imprimir.values())
    for item in items_imprimir:
        item["mensaje"] = f"{item['mensaje']} — {item['count']} actividades"

    if items_imprimir:
        pendientes.append({
            "categoria": "🖨️ Por imprimir",
            "items": items_imprimir
        })

    # Alumnos en riesgo por inasistencias (20+ días sin asistir)
    from app.models.asistencia import Asistencia
    from datetime import timedelta

    hace_20_dias = hoy - timedelta(days=20)
    hace_30_dias = hoy - timedelta(days=30)

    en_riesgo_inasistencia = []
    for alumno in alumnos:
        ultima = db.query(Asistencia).filter(
            Asistencia.alumno_id == alumno.id,
            Asistencia.asistio == True
        ).order_by(Asistencia.fecha.desc()).first()

        if ultima and ultima.fecha <= hace_20_dias:
            dias_sin_asistir = (hoy - ultima.fecha).days
            en_riesgo_inasistencia.append({
                "tipo": "inasistencia",
                "mensaje": f"{alumno.nombre} {alumno.apellido} — {dias_sin_asistir} días sin asistir",
                "urgente": ultima.fecha <= hace_30_dias,
                "alumno_id": str(alumno.id)
            })

    if en_riesgo_inasistencia:
        pendientes.append({
            "categoria": "⚠️ En riesgo por inasistencias",
            "items": en_riesgo_inasistencia[:5]
        })

    return pendientes

@router.get("/dashboard/cumpleanos")
def dashboard_cumpleanos(
    mes: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from datetime import date

    if not mes:
        mes = date.today().month

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.fecha_nacimiento != None
    )

    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    alumnos = query.all()

    cumpleanos = []
    for a in alumnos:
        if a.fecha_nacimiento and a.fecha_nacimiento.month == mes:
            hoy = date.today()
            edad_actual = hoy.year - a.fecha_nacimiento.year
            cumple_este_anio = date(hoy.year, a.fecha_nacimiento.month, a.fecha_nacimiento.day)
            if cumple_este_anio < hoy:
                edad_actual += 0
            cumpleanos.append({
                "nombre": f"{a.nombre} {a.apellido}",
                "alumno_id": str(a.id),
                "fecha_nacimiento": str(a.fecha_nacimiento),
                "dia": a.fecha_nacimiento.day,
                "edad_cumple": edad_actual
            })

    cumpleanos.sort(key=lambda x: x["dia"])
    return {"mes": mes, "alumnos": cumpleanos}

@router.get("/calendario")
def get_calendario(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno

    query = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'inscripcion', 'becado', 'pendiente'])
    )
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    alumnos = query.all()

    dias_map = {
        'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2,
        'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5
    }

    calendario = {0: [], 1: [], 2: [], 3: [], 4: [], 5: []}

    for alumno in alumnos:
        if not alumno.horario:
            continue

        horario_lower = alumno.horario.lower()
        franjas = horario_lower.split('|')

        for franja in franjas:
            franja = franja.strip()
            dias_encontrados = []

            for dia_nombre, dia_num in dias_map.items():
                if dia_nombre in franja:
                    if dia_num not in dias_encontrados:
                        dias_encontrados.append(dia_num)

            import re
            horas = re.findall(r'\d+:\d+', franja)
            if len(horas) >= 2:
                hora_info = f"{horas[0]}-{horas[1]}"
            elif len(horas) == 1:
                hora_info = horas[0]
            else:
                hora_info = ''

            for dia_num in dias_encontrados:
                calendario[dia_num].append({
                    "alumno_id": str(alumno.id),
                    "nombre": f"{alumno.nombre} {alumno.apellido}",
                    "hora": hora_info,
                    "grado": alumno.grado,
                    "maestra_id": str(alumno.maestra_id) if alumno.maestra_id else None,
                })

    for dia in calendario:
        calendario[dia].sort(key=lambda x: x["hora"])

    return calendario


@router.get("/ingresos-bajas")
def get_ingresos_bajas(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.alumno import Alumno
    from datetime import date

    hoy = date.today()
    if not mes:
        mes = hoy.month
    if not anio:
        anio = hoy.year

    primer_dia = date(anio, mes, 1)
    if mes == 12:
        ultimo_dia = date(anio + 1, 1, 1)
    else:
        ultimo_dia = date(anio, mes + 1, 1)

    query_base = db.query(Alumno)
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query_base = query_base.filter(Alumno.sucursal_id == current_user.sucursal_id)
    elif sucursal_id:
        query_base = query_base.filter(Alumno.sucursal_id == sucursal_id)

    alumnos_ingreso = query_base.filter(
        Alumno.activo == True,
        Alumno.fecha_ingreso >= primer_dia,
        Alumno.fecha_ingreso < ultimo_dia
    ).order_by(Alumno.fecha_ingreso).all()

    alumnos_baja = query_base.filter(
        Alumno.situacion == 'baja',
        Alumno.fecha_baja >= primer_dia,
        Alumno.fecha_baja < ultimo_dia
    ).order_by(Alumno.fecha_baja).all()

    from app.models.sucursal import Sucursal
    def get_sucursal_nombre(alumno):
        if alumno.sucursal_id:
            suc = db.query(Sucursal).filter(Sucursal.id == alumno.sucursal_id).first()
            return suc.nombre if suc else None
        return None

    ingresos = [{
        "alumno_id": str(a.id),
        "nombre": f"{a.nombre} {a.apellido}",
        "fecha_ingreso": str(a.fecha_ingreso) if a.fecha_ingreso else None,
        "plan_pago": a.plan_pago,
        "situacion": a.situacion,
        "sucursal": get_sucursal_nombre(a),
    } for a in alumnos_ingreso]

    bajas = [{
        "alumno_id": str(a.id),
        "nombre": f"{a.nombre} {a.apellido}",
        "fecha_baja": str(a.fecha_baja) if a.fecha_baja else None,
        "motivo_baja": a.motivo_baja,
        "sucursal": get_sucursal_nombre(a),
    } for a in alumnos_baja]

    return {
        "mes": mes,
        "anio": anio,
        "ingresos": ingresos,
        "bajas": bajas,
    }


@router.get("/avisos")
def get_avisos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.aviso import Aviso
    avisos = db.query(Aviso).filter(
        Aviso.activo == True
    ).order_by(Aviso.created_at.desc()).limit(5).all()
    return [{
        "id": str(a.id),
        "mensaje": a.mensaje,
        "autor": a.autor,
        "created_at": str(a.created_at)
    } for a in avisos]

@router.post("/avisos")
def crear_aviso(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.aviso import Aviso
    if current_user.rol not in ["directora", "recepcionista", "encargada"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    aviso = Aviso(
        mensaje=data.get("mensaje"),
        autor=current_user.nombre,
        activo=True
    )
    db.add(aviso)
    db.commit()
    return {"mensaje": "Aviso publicado"}

@router.delete("/avisos/{aviso_id}")
def eliminar_aviso(
    aviso_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.aviso import Aviso
    if current_user.rol not in ["directora", "recepcionista", "encargada"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    aviso = db.query(Aviso).filter(Aviso.id == aviso_id).first()
    if aviso:
        aviso.activo = False
        db.commit()
    return {"mensaje": "Aviso eliminado"}

@router.post("/admin/migrate")
def migrate_db(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora")

    from sqlalchemy import text
    migraciones = [
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS domicilio TEXT",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS escuela_procedencia VARCHAR(200)",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS condicion_medica TEXT",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS permiso_fotos BOOLEAN DEFAULT FALSE",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS objetivos TEXT",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_lectura VARCHAR(20)",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_matematicas VARCHAR(20)",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS numero_hermano INTEGER DEFAULT 1",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programas_lectura_historial TEXT",
        "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programas_matematicas_historial TEXT",
        "ALTER TABLE pagos ADD COLUMN IF NOT EXISTS fecha_recepcion DATE",
        "CREATE TABLE IF NOT EXISTS reportes_mensuales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alumno_id UUID REFERENCES alumnos(id), mes INTEGER NOT NULL, anio INTEGER NOT NULL, url_cloudinary TEXT NOT NULL, public_id_cloudinary VARCHAR(200), subido_por UUID REFERENCES usuarios(id), created_at TIMESTAMPTZ DEFAULT NOW())",
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS color VARCHAR(20)",
        "CREATE TABLE IF NOT EXISTS confirmaciones_asistencia (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alumno_id UUID, fecha DATE NOT NULL, confirmo BOOLEAN, registrado_por UUID, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ)",
        "CREATE TABLE IF NOT EXISTS clases_recuperacion (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alumno_id UUID, fecha_original DATE NOT NULL, fecha_recuperacion DATE NOT NULL, hora_inicio VARCHAR(10), hora_fin VARCHAR(10), registrado_por UUID, created_at TIMESTAMPTZ DEFAULT NOW())",
        "CREATE TABLE IF NOT EXISTS avisos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mensaje TEXT NOT NULL, autor VARCHAR(100), activo BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW())",
    ]

    resultados = []
    with db.bind.connect() as conn:
        for sql in migraciones:
            try:
                conn.execute(text(sql))
                conn.commit()
                resultados.append(f"OK: {sql[:60]}")
            except Exception as e:
                resultados.append(f"ERROR: {str(e)[:60]}")

    return {"resultados": resultados}