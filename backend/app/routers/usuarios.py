from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.usuario import Usuario
from app.auth.auth import hashear_password
from app.auth.dependencies import get_current_user, solo_directora

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str
    sucursal_id: Optional[str] = None
    color: Optional[str] = None

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    sucursal_id: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None
    color: Optional[str] = None
    es_global: Optional[bool] = None
    es_encargada_general: Optional[bool] = None

@router.post("/")
def crear_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora")

    existente = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    nuevo = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hashear_password(data.password),
        rol=data.rol,
        sucursal_id=data.sucursal_id if data.sucursal_id else None,
        color=data.color,
        activo=True
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Usuario creado", "id": str(nuevo.id)}

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo la directora")

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.email == "andrea@ludens.com":
        raise HTTPException(status_code=400, detail="No puedes eliminar a la directora")

    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado"}

@router.get("/{usuario_id}/sucursales")
def get_sucursales_usuario(
    usuario_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.usuario_sucursal import UsuarioSucursal
    from app.models.sucursal import Sucursal
    sucursales = db.query(Sucursal).join(
        UsuarioSucursal, UsuarioSucursal.sucursal_id == Sucursal.id
    ).filter(UsuarioSucursal.usuario_id == usuario_id).all()
    return [{"id": str(s.id), "nombre": s.nombre} for s in sucursales]

@router.put("/{usuario_id}/sucursales")
def actualizar_sucursales_usuario(
    usuario_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != "directora":
        raise HTTPException(status_code=403, detail="Solo directora")
    from app.models.usuario_sucursal import UsuarioSucursal
    db.query(UsuarioSucursal).filter(UsuarioSucursal.usuario_id == usuario_id).delete()
    for sucursal_id in data.get("sucursal_ids", []):
        db.add(UsuarioSucursal(usuario_id=usuario_id, sucursal_id=sucursal_id))
    db.commit()
    return {"mensaje": "Sucursales actualizadas"}

@router.get("/lista-basica")
def get_usuarios_basica(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    usuarios = db.query(Usuario).filter(
        Usuario.activo == True
    ).order_by(Usuario.nombre).all()
    return [{"id": str(u.id), "nombre": u.nombre, "rol": u.rol} for u in usuarios]

@router.get("/")
def get_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(solo_directora)
):
    from app.models.usuario_sucursal import UsuarioSucursal
    from app.models.sucursal import Sucursal

    usuarios = db.query(Usuario).order_by(Usuario.nombre).all()
    resultado = []
    for u in usuarios:
        sucursal_nombre = None
        sucursales_lista = []

        if u.rol == 'maestra':
            us = db.query(UsuarioSucursal).filter(UsuarioSucursal.usuario_id == u.id).all()
            if us:
                for s in us:
                    suc = db.query(Sucursal).filter(Sucursal.id == s.sucursal_id).first()
                    if suc:
                        sucursales_lista.append(suc.nombre)
                sucursal_nombre = ', '.join(sucursales_lista)
            elif u.sucursal_id:
                suc = db.query(Sucursal).filter(Sucursal.id == u.sucursal_id).first()
                sucursal_nombre = suc.nombre if suc else None
        else:
            if u.sucursal_id:
                suc = db.query(Sucursal).filter(Sucursal.id == u.sucursal_id).first()
                sucursal_nombre = suc.nombre if suc else None

        resultado.append({
            **{c.name: getattr(u, c.name) for c in u.__table__.columns},
            "sucursal_nombre": sucursal_nombre,
            "sucursales_lista": sucursales_lista,
        })

    return resultado

@router.put("/{usuario_id}")
def actualizar_usuario(
    usuario_id: str,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(solo_directora)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if data.nombre:
        usuario.nombre = data.nombre
    if data.rol:
        usuario.rol = data.rol
    if data.sucursal_id is not None:
        usuario.sucursal_id = data.sucursal_id if data.sucursal_id else None
    if data.activo is not None:
        usuario.activo = data.activo
    if data.password:
        usuario.password_hash = hashear_password(data.password)
    if 'color' in data.dict(exclude_unset=True):
        usuario.color = data.color
    if data.es_global is not None:
        usuario.es_global = data.es_global
    if data.es_encargada_general is not None:
        usuario.es_encargada_general = data.es_encargada_general

    db.commit()
    db.refresh(usuario)
    return usuario

@router.get("/maestras-por-sucursales")
def get_maestras_por_sucursales(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.usuario_sucursal import UsuarioSucursal
    from sqlalchemy import or_

    sucursales_usuario = db.query(UsuarioSucursal.sucursal_id).filter(
        UsuarioSucursal.usuario_id == current_user.id
    ).all()
    sucursal_ids = [s.sucursal_id for s in sucursales_usuario]

    if not sucursal_ids:
        return []

    maestras = db.query(Usuario).filter(
        Usuario.rol.in_(['maestra', 'encargada']),
        Usuario.activo == True,
        or_(
            Usuario.sucursal_id.in_(sucursal_ids),
            Usuario.es_global == True,
            Usuario.id.in_(
                db.query(UsuarioSucursal.usuario_id).filter(
                    UsuarioSucursal.sucursal_id.in_(sucursal_ids)
                )
            )
        )
    ).all()

    return [{"id": str(m.id), "nombre": m.nombre, "rol": m.rol, "color": m.color} for m in maestras]

@router.get("/sucursal/{sucursal_id}/maestras")
def get_maestras_sucursal(
    sucursal_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    from app.models.usuario_sucursal import UsuarioSucursal
    from sqlalchemy import or_
    maestras = db.query(Usuario).filter(
        Usuario.rol.in_(['maestra', 'encargada']),
        Usuario.activo == True,
        or_(
            Usuario.sucursal_id == sucursal_id,
            Usuario.id.in_(
                db.query(UsuarioSucursal.usuario_id).filter(
                    UsuarioSucursal.sucursal_id == sucursal_id
                )
            ),
            Usuario.es_global == True
        )
    ).all()
    return maestras

@router.post("/{usuario_id}/reasignar-alumnos")
def reasignar_alumnos(
    usuario_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.rol != 'directora':
        raise HTTPException(status_code=403, detail="Solo directora")

    from app.models.alumno import Alumno
    nueva_maestra_lectura_id = data.get('nueva_maestra_lectura_id')
    nueva_maestra_matematicas_id = data.get('nueva_maestra_matematicas_id')

    alumnos = db.query(Alumno).filter(
        Alumno.activo == True,
        Alumno.situacion.in_(['activo', 'inscripcion', 'becado', 'pendiente', 'en_riesgo']),
        (Alumno.maestra_lectura_id == usuario_id) |
        (Alumno.maestra_matematicas_id == usuario_id) |
        (Alumno.maestra_id == usuario_id)
    ).all()

    count = 0
    for alumno in alumnos:
        if str(alumno.maestra_lectura_id) == usuario_id and nueva_maestra_lectura_id:
            alumno.maestra_lectura_id = nueva_maestra_lectura_id
        if str(alumno.maestra_matematicas_id) == usuario_id and nueva_maestra_matematicas_id:
            alumno.maestra_matematicas_id = nueva_maestra_matematicas_id
        if str(alumno.maestra_id) == usuario_id and nueva_maestra_lectura_id:
            alumno.maestra_id = nueva_maestra_lectura_id

        if alumno.horario_json:
            import json
            franjas = json.loads(alumno.horario_json)
            for franja in franjas:
                if franja.get('maestra_id') == usuario_id:
                    if nueva_maestra_lectura_id and franja.get('materia') == 'lectura':
                        franja['maestra_id'] = nueva_maestra_lectura_id
                    elif nueva_maestra_matematicas_id and franja.get('materia') == 'matematicas':
                        franja['maestra_id'] = nueva_maestra_matematicas_id
                    elif nueva_maestra_lectura_id:
                        franja['maestra_id'] = nueva_maestra_lectura_id
            alumno.horario_json = json.dumps(franjas)
        count += 1

    db.commit()
    return {"reasignados": count, "mensaje": f"{count} alumnos reasignados correctamente"}