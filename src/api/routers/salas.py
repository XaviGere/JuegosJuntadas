"""
Placeholder para endpoints de gestión de salas.

Este archivo contendrá los endpoints CRUD para salas y jugadores
cuando se migre la lógica desde localStorage a backend.

Por ahora, la gestión de salas se hace directamente en el frontend
con localStorage.
"""

# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from typing import List

# from src.api.models.database import get_db
# from src.api.models.schemas import Sala, SalaCreate, Jugador, JugadorCreate

# router = APIRouter()

# @router.get("/", response_model=List[Sala])
# def get_salas(db: Session = Depends(get_db)):
#     """Obtener todas las salas del usuario"""
#     # Implementación futura
#     pass

# @router.post("/", response_model=Sala)
# def create_sala(sala: SalaCreate, db: Session = Depends(get_db)):
#     """Crear una nueva sala"""
#     # Implementación futura
#     pass

# @router.get("/{sala_id}", response_model=Sala)
# def get_sala(sala_id: int, db: Session = Depends(get_db)):
#     """Obtener detalles de una sala específica"""
#     # Implementación futura
#     pass

# @router.put("/{sala_id}", response_model=Sala)
# def update_sala(sala_id: int, sala: SalaCreate, db: Session = Depends(get_db)):
#     """Actualizar una sala existente"""
#     # Implementación futura
#     pass

# @router.delete("/{sala_id}")
# def delete_sala(sala_id: int, db: Session = Depends(get_db)):
#     """Eliminar una sala"""
#     # Implementación futura
#     pass

# @router.post("/{sala_id}/jugadores", response_model=Jugador)
# def add_jugador(sala_id: int, jugador: JugadorCreate, db: Session = Depends(get_db)):
#     """Agregar un jugador a una sala"""
#     # Implementación futura
#     pass