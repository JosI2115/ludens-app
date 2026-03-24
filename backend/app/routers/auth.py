from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
    from datetime import date
    
    hoy = date.today()
    mes = hoy.month
    anio = hoy.year

    query = db.query(Alumno).filter(Alumno.activo == True)
    
    if current_user.rol in ["maestra", "encargada", "recepcionista"]:
        query = query.filter(Alumno.sucursal_id == current_user.sucursal_id)

    todos = query.all()
    
    activos = [a for a in todos if a.situacion in ['activo', 'pendiente', 'en_riesgo', 'bloqueado']]
    prospectos = [a for a in todos if a.situacion == 'prospecto']
    
    pagados = 0
    pendientes = 0
    en_riesgo = 0
    bloqueados = 0

    for alumno in activos:
        pago = db.query(Pago).filter(
            Pago.alumno_id == alumno.id,
            Pago.mes == mes,
            Pago.anio == anio
        ).first()

        if pago:
            pagados += 1
        elif alumno.dia_pago:
            try:
                fecha_pago = date(anio, mes, alumno.dia_pago)
                dias = (hoy - fecha_pago).days
                if dias > 10:
                    bloqueados += 1
                elif dias > 5:
                    en_riesgo += 1
                else:
                    pendientes += 1
            except:
                pendientes += 1
        else:
            pendientes += 1

    return {
        "total_activos": len(activos),
        "total_prospectos": len(prospectos),
        "pagados": pagados,
        "pendientes": pendientes,
        "en_riesgo": en_riesgo,
        "bloqueados": bloqueados,
        "mes": mes,
        "anio": anio,
    }