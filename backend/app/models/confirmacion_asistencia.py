from sqlalchemy import Column, String, Boolean, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ConfirmacionAsistencia(Base):
    __tablename__ = "confirmaciones_asistencia"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), nullable=False)
    fecha = Column(Date, nullable=False)
    confirmo = Column(Boolean, nullable=True)  # True=asiste, False=no asiste, None=sin confirmar
    registrado_por = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
