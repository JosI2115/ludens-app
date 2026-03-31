import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.reporte import ReporteMensual
from app.auth.dependencies import get_current_user
from app.models.usuario import Usuario

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

router = APIRouter(prefix="/reportes", tags=["reportes"])

@router.post("/subir")
async def subir_reporte(
    alumno_id: str = Form(...),
    mes: int = Form(...),
    anio: int = Form(...),
    fecha_entrega: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if archivo.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    contenido = await archivo.read()

    from app.models.alumno import Alumno
    alumno_obj = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    nombre_archivo = f"{alumno_obj.nombre}{alumno_obj.apellido}".replace(' ', '') if alumno_obj else "alumno"

    resultado = cloudinary.uploader.upload(
        contenido,
        resource_type="raw",
        folder=f"ludens/reportes/{alumno_id}",
        public_id=f"reporte_{anio}_{mes:02d}_{nombre_archivo}",
        overwrite=True
    )

    url_visualizar = resultado["secure_url"]

    reporte_existente = db.query(ReporteMensual).filter(
        ReporteMensual.alumno_id == alumno_id,
        ReporteMensual.mes == mes,
        ReporteMensual.anio == anio
    ).first()

    from datetime import datetime as dt, date
    fecha_entrega_date = dt.strptime(fecha_entrega, '%Y-%m-%d').date() if fecha_entrega else date.today()

    if reporte_existente:
        reporte_existente.url_cloudinary = url_visualizar
        reporte_existente.public_id_cloudinary = resultado["public_id"]
        reporte_existente.subido_por = current_user.id
        reporte_existente.fecha_entrega = fecha_entrega_date
    else:
        reporte = ReporteMensual(
            alumno_id=alumno_id,
            mes=mes,
            anio=anio,
            url_cloudinary=url_visualizar,
            public_id_cloudinary=resultado["public_id"],
            subido_por=current_user.id,
            fecha_entrega=fecha_entrega_date
        )
        db.add(reporte)

    db.commit()
    return {"mensaje": "Reporte subido exitosamente", "url": url_visualizar}

@router.get("/alumno/{alumno_id}")
def get_reportes_alumno(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    reportes = db.query(ReporteMensual).filter(
        ReporteMensual.alumno_id == alumno_id
    ).order_by(ReporteMensual.anio.desc(), ReporteMensual.mes.desc()).all()

    return [{
        "id": str(r.id),
        "mes": r.mes,
        "anio": r.anio,
        "url": r.url_cloudinary,
        "fecha_entrega": str(r.fecha_entrega) if r.fecha_entrega else None,
        "created_at": str(r.created_at)
    } for r in reportes]

@router.delete("/{reporte_id}")
def eliminar_reporte(
    reporte_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol not in ["directora", "encargada"]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    reporte = db.query(ReporteMensual).filter(ReporteMensual.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if reporte.public_id_cloudinary:
        cloudinary.uploader.destroy(reporte.public_id_cloudinary, resource_type="raw")

    db.delete(reporte)
    db.commit()
    return {"mensaje": "Reporte eliminado"}
