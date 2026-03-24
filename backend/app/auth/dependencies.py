from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.auth import verificar_token
from app.models.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verificar_token(token)
    if payload is None:
        raise credentials_exception
    
    email = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if usuario is None or not usuario.activo:
        raise credentials_exception
    
    return usuario

def solo_directora(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora puede hacer esto")
    return current_user

def encargada_o_superior(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol not in ["directora", "encargada"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    return current_user