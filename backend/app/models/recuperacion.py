from sqlalchemy import Column, String, DateTime, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ClaseRecuperacion(Base):
    __tablename__ = "clases_recuperacion"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), nullable=False)
    fecha_original = Column(Date, nullable=False)
    fecha_recuperacion = Column(Date, nullable=False)
    hora_inicio = Column(String(10))
    hora_fin = Column(String(10))
    registrado_por = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
