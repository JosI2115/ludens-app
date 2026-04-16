from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Pago(Base):
    __tablename__ = "pagos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    mes = Column(Integer, nullable=False)
    anio = Column(Integer, nullable=False)
    fecha_pago = Column(Date)
    con_penalizacion = Column(Boolean, default=False)
    monto_penalizacion = Column(Numeric(10, 2), default=0)
    registrado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    comentarios = Column(Text)
    fecha_recepcion = Column(Date, nullable=True)
    metodo_pago = Column(String(20), nullable=True)  # efectivo, tarjeta, transferencia
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alumno = relationship("Alumno", back_populates="pagos")
    registrado_por_usuario = relationship("Usuario", foreign_keys=[registrado_por])