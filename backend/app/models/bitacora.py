from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Bitacora(Base):
    __tablename__ = "bitacoras"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    programa = Column(String(100), nullable=False)
    nomenclatura = Column(String(100), nullable=False)
    actividad = Column(String(200))
    semana = Column(Integer)
    fecha = Column(String(50))
    ejercicios = Column(Integer)
    comentario = Column(Text)
    estado = Column(String(20))
    registrado_por_nombre = Column(String(100))
    registrado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    drive_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    alumno = relationship("Alumno", backref="bitacoras")
