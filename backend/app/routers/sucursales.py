from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.sucursal import Sucursal
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/sucursales", tags=["sucursales"])

@router.get("/")
def get_sucursales(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Sucursal).filter(Sucursal.activa == True).all()