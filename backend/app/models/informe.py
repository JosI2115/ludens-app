from sqlalchemy import Column, String, Integer, Text, DateTime, Date, Time, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Informe(Base):
    __tablename__ = "informes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Datos del prospecto
    nombre_contacto = Column(String(150), nullable=False)
    medio = Column(String(50))  # whatsapp, facebook, sucursal, llamada, otro
    situacion = Column(String(50), default='informes')
    fecha_solicitud = Column(Date, nullable=False)
    sucursal_id = Column(UUID(as_uuid=True), ForeignKey("sucursales.id"), nullable=True)

    # Comisiones (hasta 2 personas)
    comision_usuario1_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    comision_usuario2_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

    # Datos del niño (se llenan cuando agenda diagnóstico)
    nombre_nino = Column(String(150))
    apellido_nino = Column(String(150))
    edad_nino = Column(Integer)
    grado_nino = Column(String(50))
    comentarios = Column(Text)
    contacto_dato = Column(String(200))

    # Diagnóstico
    fecha_diagnostico = Column(Date)
    hora_diagnostico = Column(String(10))
    fecha_inscripcion = Column(Date, nullable=True)

    # Seguimiento
    ultimo_contacto = Column(Date)
    registrado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
