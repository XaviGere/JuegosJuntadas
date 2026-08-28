"""
Placeholder para Pydantic models.

Este archivo contendrá los modelos Pydantic para validación de
request/response cuando se implemente el backend FastAPI.

Por ahora, el frontend maneja la validación directamente.
"""

# from pydantic import BaseModel, Field
# from typing import Optional, List
# from datetime import datetime

# Ejemplos de schemas futuros:

# class SalaBase(BaseModel):
#     nombre: str
#     color: str

# class SalaCreate(SalaBase):
#     pass

# class Sala(SalaBase):
#     id: int
#     creada_en: datetime
#     
#     class Config:
#         from_attributes = True

# class JugadorBase(BaseModel):
#     nombre: str
#     color: str
#     puntaje_global: int = 0

# class JugadorCreate(JugadorBase):
#     pass

# class Jugador(JugadorBase):
#     id: int
#     sala_id: int
#     
#     class Config:
#         from_attributes = True