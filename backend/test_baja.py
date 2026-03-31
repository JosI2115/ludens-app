import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia
from datetime import date, timedelta
import uuid

db = SessionLocal()

# Buscar primer alumno activo
alumno = db.query(Alumno).filter(Alumno.situacion == 'activo').first()
if not alumno:
    print("No hay alumnos activos")
    db.close()
    exit()

print(f"Alumno: {alumno.nombre} {alumno.apellido}")
print(f"Situación: {alumno.situacion}")
print(f"Fecha ingreso: {alumno.fecha_ingreso}")

hoy = date.today()

# Simular asistencia hace 25 días
fecha_ultima_asistencia = hoy - timedelta(days=25)
print(f"\nSimulando última asistencia: {fecha_ultima_asistencia} (hace 25 días)")

# Borrar asistencias existentes del alumno para la prueba
db.query(Asistencia).filter(Asistencia.alumno_id == alumno.id).delete()

# Crear asistencia simulada
asistencia = Asistencia(
    alumno_id=alumno.id,
    fecha=fecha_ultima_asistencia,
    asistio=True,
    registrado_por=alumno.maestra_id
)
db.add(asistencia)
db.commit()

print(f"Asistencia creada para {fecha_ultima_asistencia}")

# Ahora simular el auto-check
punto_inicio = alumno.fecha_reactivacion or alumno.fecha_ingreso
ultima = db.query(Asistencia).filter(
    Asistencia.alumno_id == alumno.id,
    Asistencia.asistio == True,
    Asistencia.fecha >= (punto_inicio or hoy - timedelta(days=365))
).order_by(Asistencia.fecha.desc()).first()

if ultima:
    dias = (hoy - ultima.fecha).days
    print(f"Días desde última asistencia: {dias}")
    if dias >= 30:
        print("→ RESULTADO: Debería ser BAJA")
    elif dias >= 20:
        print("→ RESULTADO: Debería ser EN RIESGO")
    else:
        print("→ RESULTADO: Debería ser ACTIVO")
else:
    print("Sin asistencias encontradas")

db.close()
