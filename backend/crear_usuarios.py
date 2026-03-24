import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.auth.auth import hashear_password

db = SessionLocal()

usuarios = [
    # Directora general
    {"nombre": "Andrea Ibarra", "email": "andrea@ludens.com", "password": "ludens2024", "rol": "directora", "sucursal_id": None},
    
    # Contadora
    {"nombre": "Irlanda", "email": "irlanda@ludens.com", "password": "ludens2024", "rol": "contadora", "sucursal_id": None},
    
    # El Fresno
    {"nombre": "Andrea Saragelly", "email": "saragelly@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": "4956a97e-6621-4702-b7fc-d5a00cadf48b"},
    {"nombre": "Mariana Sarahí", "email": "mariana.fresno@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "4956a97e-6621-4702-b7fc-d5a00cadf48b"},
    
    # San Cristóbal
    {"nombre": "Jennifer Olivares", "email": "jennifer@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": "bea6b4b4-c0d0-4679-aa38-cb62460cea43"},
    {"nombre": "Montserrat Carretero", "email": "montserrat@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "bea6b4b4-c0d0-4679-aa38-cb62460cea43"},
    
    # Jardines de la Paz
    {"nombre": "Areli Sandoval", "email": "areli@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    {"nombre": "Danna Suárez", "email": "danna@ludens.com", "password": "ludens2024", "rol": "recepcionista", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    {"nombre": "Areli Maestra", "email": "areli.maestra@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    {"nombre": "Luci", "email": "luci@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    {"nombre": "Elizabeth González", "email": "elizabeth@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    {"nombre": "Julieta Aguilar", "email": "julieta@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    {"nombre": "Mariana Facio", "email": "mariana.jardines@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "0aa0f2fb-6e18-457c-8788-62f2006d3bdc"},
    
    # Valle Real
    {"nombre": "Lizbeth Calderón", "email": "lizbeth@ludens.com", "password": "ludens2024", "rol": "encargada", "sucursal_id": "6f659339-9671-41e8-a597-2e0ae04ba2b2"},
    {"nombre": "Michelle Hernández", "email": "michelle@ludens.com", "password": "ludens2024", "rol": "maestra", "sucursal_id": "6f659339-9671-41e8-a597-2e0ae04ba2b2"},
]

creados = 0
omitidos = 0

for u in usuarios:
    existe = db.query(Usuario).filter(Usuario.email == u["email"]).first()
    if existe:
        print(f"Ya existe: {u['email']}")
        omitidos += 1
        continue
    
    nuevo = Usuario(
        nombre=u["nombre"],
        email=u["email"],
        password_hash=hashear_password(u["password"]),
        rol=u["rol"],
        sucursal_id=u["sucursal_id"]
    )
    db.add(nuevo)
    creados += 1
    print(f"Creado: {u['nombre']} ({u['rol']})")

db.commit()
db.close()
print(f"\nListo: {creados} creados, {omitidos} omitidos")