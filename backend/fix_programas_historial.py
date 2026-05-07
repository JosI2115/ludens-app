import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.alumno import Alumno
from app.models.alumno_programa import AlumnoPrograma
import json

db = SessionLocal()
alumnos = db.query(Alumno).all()
corregidos = 0

for alumno in alumnos:
    historial_lec = json.loads(alumno.programas_lectura_historial or '[]')
    historial_mat = json.loads(alumno.programas_matematicas_historial or '[]')

    # Marcar como historial los que están en historial JSON pero activos en la tabla
    progs_tabla = db.query(AlumnoPrograma).filter(
        AlumnoPrograma.alumno_id == alumno.id
    ).all()

    for p in progs_tabla:
        if p.programa in historial_lec or p.programa in historial_mat:
            if not p.en_historial:
                p.en_historial = True
                p.activo = False
                corregidos += 1

db.commit()
print(f'Corregidos {corregidos} programas')
db.close()
