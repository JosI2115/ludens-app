from sqlalchemy import Column, String, Integer, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ResumenSemanal(Base):
    __tablename__ = "resumenes_semanales"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sucursal_id = Column(UUID(as_uuid=True), nullable=False)
    sucursal_nombre = Column(String(100))
    semana_inicio = Column(Date, nullable=False)
    semana_fin = Column(Date, nullable=False)
    mes = Column(Integer)
    anio = Column(Integer)
    numero_semana = Column(Integer)
    alumnos_totales = Column(Integer, default=0)
    nuevos_ingresos = Column(Integer, default=0)
    diagnosticos = Column(Integer, default=0)
    bajas = Column(Integer, default=0)
    inf_whatsapp = Column(Integer, default=0)
    inf_llamadas = Column(Integer, default=0)
    inf_sucursal = Column(Integer, default=0)
    inf_redes = Column(Integer, default=0)
    inf_extras = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
