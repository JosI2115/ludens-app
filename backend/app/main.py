from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import auth, alumnos, sucursales, pagos, asistencias

load_dotenv()

app = FastAPI(
    title="Ludens App",
    description="Sistema de administración escolar",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(alumnos.router)
app.include_router(sucursales.router)
app.include_router(pagos.router)
app.include_router(asistencias.router)

@app.get("/")
def root():
    return {"mensaje": "Ludens App funcionando"}

@app.get("/health")
def health():
    return {"status": "ok"}