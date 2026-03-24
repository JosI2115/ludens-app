from sqlalchemy import Column, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Asistencia(Base):
    __tablename__ = "asistencias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    asistio = Column(Boolean, nullable=False)
    registrado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alumno = relationship("Alumno", back_populates="asistencias")
    registrado_por_usuario = relationship("Usuario", foreign_keys=[registrado_por])