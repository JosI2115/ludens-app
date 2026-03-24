from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class HistorialCambio(Base):
    __tablename__ = "historial_cambios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    campo_modificado = Column(String(50))
    valor_anterior = Column(Text)
    valor_nuevo = Column(Text)
    modificado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alumno = relationship("Alumno", back_populates="historial")
    modificado_por_usuario = relationship("Usuario", foreign_keys=[modificado_por])