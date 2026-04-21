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
    sucursal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol not in ["directora", "contadora", "encargada"] and not current_user.es_encargada_general:
        raise HTTPException(status_code=403, detail="Sin permisos")

    hoy = date.today()
    mes = mes or hoy.month
    anio = anio or hoy.year

    import calendar
    primer_dia = date(anio, mes, 1)
    ultimo_dia = date(anio, mes, calendar.monthrange(anio, mes)[1])

    sucursales = db.query(Sucursal).all()
    if current_user.rol == 'encargada' and not current_user.es_encargada_general:
        sucursales = [s for s in sucursales if str(s.id) == str(current_user.sucursal_id)]
    elif sucursal_id:
        sucursales = [s for s in sucursales if str(s.id) == sucursal_id]
    resultado = []

    for suc in sucursales:
        metas = get_metas(suc.nombre)

        # Alumnos inscritos (activos) en ese mes según su fecha de ingreso
        alumnos_inscritos = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.activo == True,
            Alumno.situacion.in_(['activo', 'becado']),
            Alumno.fecha_ingreso.between(primer_dia, ultimo_dia)
        ).all()

        alumnos_inscritos_ids = [str(a.id) for a in alumnos_inscritos]

        inscritos_mes = db.query(Informe).filter(
            Informe.alumno_id.in_(alumnos_inscritos_ids)
        ).all() if alumnos_inscritos_ids else []

        # Buscar también por informes inscritos del mes
        informes_inscritos = db.query(Informe).filter(
            Informe.sucursal_id == suc.id,
            Informe.situacion == 'inscrito',
            Informe.fecha_inscripcion.between(primer_dia, ultimo_dia)
        ).all()

        # Unir ambas listas de informes para comisiones
        todos_informes = list(inscritos_mes) + [i for i in informes_inscritos if i not in inscritos_mes]
        inscritos_mes = todos_informes
        num_inscritos = len(set([str(i.alumno_id) for i in inscritos_mes if i.alumno_id] + [str(a.id) for a in alumnos_inscritos]))

        # Bajas del mes
        bajas_mes = db.query(Alumno).filter(
            Alumno.sucursal_id == suc.id,
            Alumno.situacion == 'baja',
            Alumno.fecha_baja.between(primer_dia, ultimo_dia)
        ).count()

        # Condición de bajas < 50% de inscritos para tabulador
        aplica_tabulador = bajas_mes < (num_inscritos * 0.5) if num_inscritos > 0 else False

        # Maestras de la sucursal
        maestras = db.query(Usuario).filter(
            Usuario.sucursal_id == suc.id,
            Usuario.rol.in_(['maestra', 'encargada']),
            Usuario.activo == True
        ).all()

        comisiones_sucursal = []

        # Comisión por inscrito ($100 dividido entre las personas asignadas)
        comisiones_individuales = {}
        for inf in inscritos_mes:
            # Contar cuántas personas tienen comisión asignada
            personas = []
            if inf.comision_usuario1_id:
                personas.append(str(inf.comision_usuario1_id))
            if inf.comision_usuario2_id:
                personas.append(str(inf.comision_usuario2_id))

            if not personas:
                continue

            # Dividir $100 entre las personas asignadas
            monto_por_persona = 100 / len(personas)

            for uid in personas:
                if uid not in comisiones_individuales:
                    comisiones_individuales[uid] = {"monto": 0, "inscritos": []}
                comisiones_individuales[uid]["monto"] += monto_por_persona
                nombre_nino = inf.nombre_nino or inf.nombre_contacto or "Alumno"
                comisiones_individuales[uid]["inscritos"].append(nombre_nino)

        for uid, data in comisiones_individuales.items():
            u = db.query(Usuario).filter(Usuario.id == uid).first()
            if u:
                monto = data["monto"]
                nombres = ', '.join(data["inscritos"])
                comisiones_sucursal.append({
                    "tipo": "inscrito",
                    "usuario": u.nombre,
                    "monto": monto,
                    "descripcion": f"${monto:.0f} por {len(data['inscritos'])} inscrito(s): {nombres}"
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
                        "descripcion": f"Comisión permanencia — {alumnos_maestra} alumnos activos (meta: {metas['meta_permanencia']})"
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
