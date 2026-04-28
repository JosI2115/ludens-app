from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Aviso(Base):
    __tablename__ = "avisos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mensaje = Column(Text, nullable=False)
    autor = Column(String(100))
    autor_id = Column(UUID(as_uuid=True), nullable=True)
    autor_sucursal_id = Column(UUID(as_uuid=True), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PendientePersonal(Base):
    __tablename__ = "pendientes_personales"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), nullable=False)
    texto = Column(Text, nullable=False)
    completado = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TareaAsignada(Base):
    __tablename__ = "tareas_asignadas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asignada_a = Column(UUID(as_uuid=True), nullable=False)
    asignada_por = Column(UUID(as_uuid=True), nullable=False)
    texto = Column(Text, nullable=False)
    completada = Column(Boolean, default=False)
    fecha_completada = Column(DateTime(timezone=True), nullable=True)
    notificacion_vista = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
