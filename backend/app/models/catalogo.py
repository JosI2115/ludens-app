from sqlalchemy import Column, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy import DateTime
import uuid
from app.database import Base

class ProgramaCatalogo(Base):
    __tablename__ = "programas_catalogo"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    programa = Column(String(20), nullable=False, index=True)
    nomenclatura = Column(String(100), nullable=False, unique=True)
    actividad = Column(String(200))
    semana = Column(Integer)
    drive_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
