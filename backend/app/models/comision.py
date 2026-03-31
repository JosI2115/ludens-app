from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Comision(Base):
    __tablename__ = "comisiones"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), nullable=False)
    sucursal_id = Column(UUID(as_uuid=True), nullable=False)
    mes = Column(Integer, nullable=False)
    anio = Column(Integer, nullable=False)
    tipo = Column(String(50))  # inscrito, tabulador, permanencia
    monto = Column(Float, default=0)
    descripcion = Column(String(200))
    informe_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
