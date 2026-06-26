"""Filtrado unificado por sucursal segun el rol y los flags del usuario.

directora / contadora / es_encargada_general / es_global => ven todas las
sucursales (solo se restringe si llega un sucursal_id explicito). El resto de
roles se limitan a sus sucursales asignadas (tabla usuario_sucursales) o, en su
defecto, a su sucursal_id unico.
"""
from app.models.alumno import Alumno
from app.models.usuario_sucursal import UsuarioSucursal


def usuario_ve_todas_sucursales(current_user):
    """True si el usuario no debe restringirse a una sucursal por defecto."""
    return (
        current_user.rol in ('directora', 'contadora')
        or current_user.es_encargada_general
        or current_user.es_global
    )


def filtrar_alumnos_por_sucursal(query, current_user, db, sucursal_id=None, modelo=Alumno):
    """Aplica el filtro de sucursal a un query sobre `modelo` (default Alumno).

    - Acceso global (directora / contadora / encargada_general / es_global): ve
      todo y solo filtra si viene un `sucursal_id` explicito.
    - maestra / encargada / recepcionista: usa sus sucursales asignadas en
      usuario_sucursales; si no tiene, cae a su `sucursal_id` unico.
    """
    if usuario_ve_todas_sucursales(current_user):
        if sucursal_id:
            query = query.filter(modelo.sucursal_id == sucursal_id)
    elif current_user.rol in ['maestra', 'encargada', 'recepcionista']:
        sucs = db.query(UsuarioSucursal).filter(
            UsuarioSucursal.usuario_id == current_user.id
        ).all()
        if sucs:
            sucursal_ids = [s.sucursal_id for s in sucs]
            query = query.filter(modelo.sucursal_id.in_(sucursal_ids))
        elif current_user.sucursal_id:
            query = query.filter(modelo.sucursal_id == current_user.sucursal_id)
    return query
