from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, alumnos, sucursales, pagos, asistencias, usuarios, bitacoras, reportes, calendario, docentes, informes, comisiones

load_dotenv()

app = FastAPI(
    title="Ludens App",
    description="Sistema de administración escolar",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(alumnos.router)
app.include_router(sucursales.router)
app.include_router(pagos.router)
app.include_router(asistencias.router)
app.include_router(usuarios.router)
app.include_router(bitacoras.router)
app.include_router(reportes.router)
app.include_router(calendario.router)
app.include_router(docentes.router)
app.include_router(informes.router)
app.include_router(comisiones.router)

def actualizar_situaciones_por_inasistencia():
    from app.database import SessionLocal
    from app.models.alumno import Alumno
    from app.models.asistencia import Asistencia
    from datetime import date, timedelta

    db = SessionLocal()
    try:
        hoy = date.today()
        hace_20 = hoy - timedelta(days=20)
        hace_30 = hoy - timedelta(days=30)

        alumnos = db.query(Alumno).filter(
            Alumno.activo == True,
            Alumno.situacion.in_(['activo', 'en_riesgo', 'pendiente'])
        ).all()

        for alumno in alumnos:
            ultima = db.query(Asistencia).filter(
                Asistencia.alumno_id == alumno.id,
                Asistencia.asistio == True
            ).order_by(Asistencia.fecha.desc()).first()

            if not ultima:
                continue

            if ultima.fecha <= hace_30:
                if alumno.situacion != 'baja':
                    alumno.situacion = 'baja'
                    alumno.fecha_baja = hoy
                    alumno.motivo_baja = 'Baja automática por 30 días de inasistencia'
            elif ultima.fecha <= hace_20:
                if alumno.situacion not in ['en_riesgo', 'baja']:
                    alumno.situacion = 'en_riesgo'

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def startup():
    from app.database import Base, engine, SessionLocal
    from app.models.alumno import Alumno
    from app.models.usuario import Usuario
    from app.models.sucursal import Sucursal
    from app.models.pago import Pago
    from app.models.asistencia import Asistencia
    from app.models.historial import HistorialCambio
    from app.models.sucursal import Sucursal
    from app.models.usuario import Usuario
    from app.models.catalogo import ProgramaCatalogo
    from app.models.bitacora import Bitacora
    from app.auth.auth import hashear_password
    from sqlalchemy import text

    from sqlalchemy import text
    with engine.connect() as conn:
        migraciones_auto = [
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS color VARCHAR(20)",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_reactivacion DATE",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_encargada_general BOOLEAN DEFAULT FALSE",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT FALSE",
            "CREATE TABLE IF NOT EXISTS informes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nombre_contacto VARCHAR(150) NOT NULL, medio VARCHAR(50), situacion VARCHAR(50) DEFAULT 'informes', fecha_solicitud DATE NOT NULL, sucursal_id UUID REFERENCES sucursales(id), comision_usuario1_id UUID REFERENCES usuarios(id), comision_usuario2_id UUID REFERENCES usuarios(id), nombre_nino VARCHAR(150), edad_nino INTEGER, grado_nino VARCHAR(50), comentarios TEXT, fecha_diagnostico DATE, hora_diagnostico VARCHAR(10), ultimo_contacto DATE, registrado_por UUID REFERENCES usuarios(id), alumno_id UUID REFERENCES alumnos(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ)",
            "CREATE TABLE IF NOT EXISTS resumenes_semanales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sucursal_id UUID NOT NULL, sucursal_nombre VARCHAR(100), semana_inicio DATE NOT NULL, semana_fin DATE NOT NULL, mes INTEGER, anio INTEGER, numero_semana INTEGER, alumnos_totales INTEGER DEFAULT 0, nuevos_ingresos INTEGER DEFAULT 0, diagnosticos INTEGER DEFAULT 0, bajas INTEGER DEFAULT 0, inf_whatsapp INTEGER DEFAULT 0, inf_llamadas INTEGER DEFAULT 0, inf_sucursal INTEGER DEFAULT 0, inf_redes INTEGER DEFAULT 0, inf_extras INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())",
            "CREATE TABLE IF NOT EXISTS comisiones (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id UUID NOT NULL, sucursal_id UUID NOT NULL, mes INTEGER NOT NULL, anio INTEGER NOT NULL, tipo VARCHAR(50), monto FLOAT DEFAULT 0, descripcion VARCHAR(200), informe_id UUID, created_at TIMESTAMPTZ DEFAULT NOW())",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS maestra_lectura_id UUID REFERENCES usuarios(id)",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS maestra_matematicas_id UUID REFERENCES usuarios(id)",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS horario_json TEXT",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS materia_maestra1 VARCHAR(50)",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS materia_maestra2 VARCHAR(50)",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_personalizado_lectura BOOLEAN DEFAULT FALSE",
            "ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_personalizado_matematicas BOOLEAN DEFAULT FALSE",
            "ALTER TABLE bitacoras ALTER COLUMN programa TYPE VARCHAR(100)",
            "CREATE TABLE IF NOT EXISTS usuario_sucursales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE, sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT NOW())",
        ]
        for sql in migraciones_auto:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass

    Base.metadata.create_all(bind=engine)
    
    # Agregar columnas nuevas si no existen
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_lectura VARCHAR(20)"))
            conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_matematicas VARCHAR(20)"))
            conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS numero_hermano INTEGER DEFAULT 1"))
            conn.commit()
        except Exception:
            conn.rollback()
    
    # Crear tablas nuevas de bitácoras
    from app.models.catalogo import ProgramaCatalogo
    from app.models.bitacora import Bitacora

    # Agregar columnas nuevas si no existen (para DBs existentes)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_lectura VARCHAR(20)"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programa_matematicas VARCHAR(20)"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programas_lectura_historial TEXT"))
        conn.execute(text("ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS programas_matematicas_historial TEXT"))
        conn.execute(text("ALTER TABLE pagos ADD COLUMN IF NOT EXISTS fecha_recepcion DATE"))
        conn.commit()

    db = SessionLocal()

    if db.query(Sucursal).count() == 0:
        sucursales = [
            Sucursal(nombre='El Fresno', domicilio='Calle Pino 2002, Plaza del Fresno local 2006B', telefono='33 3445 6275'),
            Sucursal(nombre='San Cristóbal', domicilio='Luis G. Cuevas 633, Plaza San Cristóbal local 9', telefono='33 3141 3130'),
            Sucursal(nombre='Jardines de la Paz', domicilio='Marquesa de Calderón 3324, Jardines de La Paz', telefono='33 3494 6356'),
            Sucursal(nombre='Valle Real', domicilio='Av. Santa Margarita 4860 Poniente, Plaza Navona local 22', telefono=''),
        ]
        for s in sucursales:
            db.add(s)
        db.commit()

    if db.query(Usuario).count() == 0:
        suc = {s.nombre: s.id for s in db.query(Sucursal).all()}
        usuarios_data = [
            {"nombre": "Andrea Ibarra", "email": "andrea@ludens.com", "password": "ludens2024", "rol": "directora", "sucursal_id": None},
            {"nombre": "Irlanda", "email": "irlanda@ludens.com", "password": "ludens2024", "rol": "contadora", "sucursal_id": None},
            {"nombre": "Andrea Saragelly", "email": "saragelly@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": suc.get('El Fresno')},
            {"nombre": "Mariana Sarahí", "email": "mariana.fresno@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('El Fresno')},
            {"nombre": "Jennifer Olivares", "email": "jennifer@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": suc.get('San Cristóbal')},
            {"nombre": "Montserrat Carretero", "email": "montserrat@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('San Cristóbal')},
            {"nombre": "Areli Sandoval", "email": "areli@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Danna Suárez", "email": "danna@ludens.com", "password": "ludens2024", "rol": "recepcionista", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Areli Maestra", "email": "areli.maestra@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Luci", "email": "luci@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Elizabeth González", "email": "elizabeth@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Julieta Aguilar", "email": "julieta@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Mariana Facio", "email": "mariana.jardines@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('Jardines de la Paz')},
            {"nombre": "Lizbeth Calderón", "email": "lizbeth@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": suc.get('Valle Real')},
            {"nombre": "Michelle Hernández", "email": "michelle@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": suc.get('Valle Real')},
        ]
        for u in usuarios_data:
            nuevo = Usuario(
                nombre=u["nombre"],
                email=u["email"],
                password_hash=hashear_password(u["password"]),
                rol=u["rol"],
                sucursal_id=u["sucursal_id"]
            )
            db.add(nuevo)
        db.commit()

    db.close()

    actualizar_situaciones_por_inasistencia()

@app.get("/")
def root():
    return {"mensaje": "Ludens App funcionando"}

@app.get("/health")
def health():
    return {"status": "ok"}