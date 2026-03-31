from sqlalchemy import Column, String, Boolean, DateTime, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ActividadDocente(Base):
    __tablename__ = "actividades_docentes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), nullable=False)
    fecha = Column(Date, nullable=False)
    actividad = Column(Text)
    incidencia = Column(String(50))  # falta, vacaciones, cita_medica, permiso
    bloqueado = Column(Boolean, default=False)
    registrado_por = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
