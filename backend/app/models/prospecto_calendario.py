from sqlalchemy import Column, String, Integer, DateTime, Date, Time, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ProspectoCalendario(Base):
    __tablename__ = "prospectos_calendario"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre_nino = Column(String(100), nullable=False)
    grado = Column(String(50))
    edad = Column(Integer)
    nombre_tutor = Column(String(100))
    telefono_tutor = Column(String(20))
    sucursal_id = Column(UUID(as_uuid=True), nullable=True)
    fecha = Column(Date, nullable=False)
    hora = Column(String(10), nullable=False)
    registrado_por = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
