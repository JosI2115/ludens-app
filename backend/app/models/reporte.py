from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ReporteMensual(Base):
    __tablename__ = "reportes_mensuales"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    mes = Column(Integer, nullable=False)
    anio = Column(Integer, nullable=False)
    url_cloudinary = Column(Text, nullable=False)
    public_id_cloudinary = Column(String(200))
    subido_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    alumno = relationship("Alumno", backref="reportes")
