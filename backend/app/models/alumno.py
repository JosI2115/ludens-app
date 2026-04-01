from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Alumno(Base):
    __tablename__ = "alumnos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    edad = Column(Integer)
    grado = Column(String(30))
    diagnostico = Column(Text)
    nombre_tutor = Column(String(100))
    telefono_tutor = Column(String(20))
    telefono_emergencia = Column(String(20))
    sucursal_id = Column(UUID(as_uuid=True), ForeignKey("sucursales.id"), nullable=False)
    maestra_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    maestra_lectura_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    maestra_matematicas_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    situacion = Column(String(30), default="prospecto")
    plan_pago = Column(String(10))
    materias = Column(String(50))
    horas_semana = Column(Integer)
    dia_pago = Column(Integer)
    tiene_descuento_hermano = Column(Boolean, default=False)
    fecha_diagnostico = Column(Date)
    fecha_ingreso = Column(Date)
    fecha_baja = Column(Date)
    motivo_baja = Column(Text)
    fecha_reactivacion = Column(Date, nullable=True)
    ultima_asistencia = Column(Date)
    horario = Column(Text)
    horario_json = Column(Text, nullable=True)
    domicilio = Column(Text)
    escuela_procedencia = Column(String(200))
    condicion_medica = Column(Text)
    permiso_fotos = Column(Boolean, default=False)
    objetivos = Column(Text)
    numero_hermano = Column(Integer, default=1)
    activo = Column(Boolean, default=True)
    programa_lectura = Column(String(20), nullable=True)
    programa_matematicas = Column(String(20), nullable=True)
    programas_lectura_historial = Column(Text)  # JSON array de programas anteriores
    programas_matematicas_historial = Column(Text)  # JSON array de programas anteriores
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sucursal = relationship("Sucursal", back_populates="alumnos")
    maestra = relationship("Usuario", foreign_keys=[maestra_id], back_populates="alumnos")
    maestra_lectura = relationship("Usuario", foreign_keys=[maestra_lectura_id])
    maestra_matematicas = relationship("Usuario", foreign_keys=[maestra_matematicas_id])
    pagos = relationship("Pago", back_populates="alumno")
    asistencias = relationship("Asistencia", back_populates="alumno")
    historial = relationship("HistorialCambio", back_populates="alumno")