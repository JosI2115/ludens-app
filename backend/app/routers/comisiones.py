from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.database import get_db
from app.models.comision import Comision
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.alumno import Alumno
from app.models.informe import Informe
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/comisiones", tags=["comisiones"])

# Tabulador de metas por sucursal
METAS_SUCURSAL = {
    "jardines": {"min_bono_200": 10, "min_bono_500": 20, "meta_permanencia": 25},
    "default":  {"min_bono_200": 5,  "min_bono_500": 11, "meta_permanencia": 0},
}

def get_metas(sucursal_nombre: str):
    nombre = sucursal_nombre.lower()
    if "jardines" in nombre or "paz" in nombre:
        return METAS_SUCURSAL["jardines"]
    return METAS_SUCURSAL["default"]

@router.get("/calcular")
def calcular_comisiones(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol not in ["directora", "contadora"] and not current_user.es_encargada_general:
        raise HTTPException(status_code=403, detail="Sin permisos")

    hoy = date.today()
    mes = mes or hoy.month
    anio = anio or hoy.year

    import calendar
    primer_dia = date(anio, mes, 1)
    ultimo_dia = date(anio, mes, calendar.monthrange(anio, mes)[1])

    sucursales = db.query(Sucursal).all()
    resultado = []

    for suc in sucursales:
        metas = get_metas(suc.nombre)

        # Inscritos del mes (pagaron inscripcion o ya inscritos)
        inscritos_mes = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.situacion.in_(['pago_inscripcion', 'inscrito']),
            Informe.fecha_solicitud.between(primer_dia, ultimo_dia)
        ).all()

        # Bajas del mes
        bajas_mes = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.situacion == 'baja',
            Alumno.fecha_baja.between(primer_dia, ultimo_dia)
        ).count()

        num_inscritos = len(inscritos_mes)

        # Condición de bajas < 50% de inscritos para tabulador
        aplica_tabulador = bajas_mes < (num_inscritos * 0.5) if num_inscritos > 0 else False

        # Maestras de la sucursal
        maestras = db.query(Usuario).filter(
            Usuario.sucursal_id == suc.id,
            Usuario.rol.in_(['maestra', 'encargada']),
            Usuario.activo == True
        ).all()

        comisiones_sucursal = []

        # Comisión por inscrito ($100 por persona que atendió)
        comisiones_individuales = {}
        for inf in inscritos_mes:
            for uid in [str(inf.comision_usuario1_id), str(inf.comision_usuario2_id)]:
                if uid and uid != 'None':
                    if uid not in comisiones_individuales:
                        comisiones_individuales[uid] = 0
                    comisiones_individuales[uid] += 100

        for uid, monto in comisiones_individuales.items():
            u = db.query(Usuario).filter(Usuario.id == uid).first()
            if u:
                comisiones_sucursal.append({
                    "tipo": "inscrito",
                    "usuario": u.nombre,
                    "monto": monto,
                    "descripcion": f"${monto} por {monto//100} inscrito(s)"
                })

        # Bono tabulador por sucursal
        bono_tabulador = 0
        if aplica_tabulador:
            if num_inscritos >= metas["min_bono_500"]:
                bono_tabulador = 500
            elif num_inscritos >= metas["min_bono_200"]:
                bono_tabulador = 200

        if bono_tabulador > 0:
            for maestra in maestras:
                comisiones_sucursal.append({
                    "tipo": "tabulador",
                    "usuario": maestra.nombre,
                    "monto": bono_tabulador,
                    "descripcion": f"Bono tabulador ${bono_tabulador} — {num_inscritos} inscritos este mes"
                })

        # Comisión por permanencia
        if "jardines" in suc.nombre.lower() or "paz" in suc.nombre.lower():
            # En Jardines: cada maestra debe tener 25+ alumnos
            for maestra in maestras:
                alumnos_maestra = db.query(Alumno).filter(
                    Alumno.maestra_id == maestra.id,
                    Alumno.activo == True,
                    Alumno.situacion.in_(['activo', 'becado'])
                ).count()
                if alumnos_maestra >= metas["meta_permanencia"]:
                    comisiones_sucursal.append({
                        "tipo": "permanencia",
                        "usuario": maestra.nombre,
                        "monto": 100,
                        "descripcion": f"Comisión permanencia — {alumnos_maestra} alumnos activos"
                    })
        else:
            # Otras sucursales: si no hubo bajas en el mes
            if bajas_mes == 0 and len(maestras) > 0:
                for maestra in maestras:
                    comisiones_sucursal.append({
                        "tipo": "permanencia",
                        "usuario": maestra.nombre,
                        "monto": 100,
                        "descripcion": "Comisión permanencia — sin bajas este mes"
                    })

        resultado.append({
            "sucursal": suc.nombre,
            "sucursal_id": str(suc.id),
            "mes": mes,
            "anio": anio,
            "num_inscritos": num_inscritos,
            "num_bajas": bajas_mes,
            "aplica_tabulador": aplica_tabulador,
            "bono_tabulador": bono_tabulador,
            "comisiones": comisiones_sucursal,
            "total_sucursal": sum(c["monto"] for c in comisiones_sucursal)
        })

    return resultado
