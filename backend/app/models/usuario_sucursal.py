from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base

class UsuarioSucursal(Base):
    __tablename__ = "usuario_sucursales"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    sucursal_id = Column(UUID(as_uuid=True), ForeignKey("sucursales.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
