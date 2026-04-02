from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.usuario import Usuario
from app.auth.auth import hashear_password
from app.auth.dependencies import get_current_user, solo_directora

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str
    sucursal_id: Optional[str] = None
    color: Optional[str] = None

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    sucursal_id: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None
    color: Optional[str] = None

@router.post("/")
def crear_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora")

    existente = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    nuevo = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hashear_password(data.password),
        rol=data.rol,
        sucursal_id=data.sucursal_id if data.sucursal_id else None,
        color=data.color,
        activo=True
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Usuario creado", "id": str(nuevo.id)}

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora")

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.email == "andrea@ludens.com":
        raise HTTPException(status_code=400, detail="No puedes eliminar a la directora")

    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado"}

@router.get("/")
def get_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(solo_directora)
):
    return db.query(Usuario).order_by(Usuario.nombre).all()

@router.put("/{usuario_id}")
def actualizar_usuario(
    usuario_id: str,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(solo_directora)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if data.nombre:
        usuario.nombre = data.nombre
    if data.rol:
        usuario.rol = data.rol
    if data.sucursal_id is not None:
        usuario.sucursal_id = data.sucursal_id if data.sucursal_id else None
    if data.activo is not None:
        usuario.activo = data.activo
    if data.password:
        usuario.password_hash = hashear_password(data.password)
    if 'color' in data.dict(exclude_unset=True):
        usuario.color = data.color

    db.commit()
    db.refresh(usuario)
    return usuario

@router.get("/sucursal/{sucursal_id}/maestras")
def get_maestras_sucursal(
    sucursal_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from sqlalchemy import or_
    maestras = db.query(Usuario).filter(
        Usuario.rol.in_(['maestra', 'encargada']),
        Usuario.activo == True,
        or_(
            Usuario.sucursal_id == sucursal_id,
            Usuario.sucursal_id == None
        )
    ).all()

    return maestras