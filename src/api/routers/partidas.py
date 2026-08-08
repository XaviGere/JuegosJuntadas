"""
Placeholder para endpoints de gestión de partidas.

Este archivo contendrá los endpoints para iniciar, gestionar y finalizar
partidas cuando se migre la lógica desde localStorage a backend.

Por ahora, la gestión de partidas se hace directamente en el frontend
con localStorage.
"""

# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.orm import Session
# from typing import Optional

# from src.api.models.database import get_db
# from src.api.models.schemas import Partida, PartidaCreate, PartidaUpdate

# router = APIRouter()

# @router.post("/", response_model=Partida)
# def create_partida(partida: PartidaCreate, db: Session = Depends(get_db)):
#     """Iniciar una nueva partida"""
#     # Implementación futura
#     pass

# @router.get("/{partida_id}", response_model=Partida)
# def get_partida(partida_id: int, db: Session = Depends(get_db)):
#     """Obtener estado de una partida específica"""
#     # Implementación futura
#     pass

# @router.put("/{partida_id}", response_model=Partida)
# def update_partida(partida_id: int, partida: PartidaUpdate, db: Session = Depends(get_db)):
#     """Actualizar estado de una partida"""
#     # Implementación futura
#     pass

# @router.post("/{partida_id}/accion")
# def partida_accion(partida_id: int, accion: dict, db: Session = Depends(get_db)):
#     """Ejecutar una acción de juego (pasar turno, usar power-up, etc.)"""
#     # Implementación futura
#     pass

# @router.post("/{partida_id}/finalizar")
# def finalizar_partida(partida_id: int, db: Session = Depends(get_db)):
#     """Finalizar una partida y guardar resultados"""
#     # Implementación futura
#     pass