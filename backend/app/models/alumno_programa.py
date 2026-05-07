from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class AlumnoPrograma(Base):
    __tablename__ = "alumno_programas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    programa = Column(String(100), nullable=False)
    tipo = Column(String(50))  # lectura, matematicas, personalizado_lectura, personalizado_matematicas
    activo = Column(Boolean, default=True)
    en_historial = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
