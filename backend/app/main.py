from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, alumnos, sucursales, pagos, asistencias, usuarios, bitacoras

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
    from app.auth.auth import hashear_password

    Base.metadata.create_all(bind=engine)

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

@app.get("/")
def root():
    return {"mensaje": "Ludens App funcionando"}

@app.get("/health")
def health():
    return {"status": "ok"}