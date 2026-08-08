"""
Placeholder para aplicación FastAPI principal.

Este archivo servirá como punto de entrada para el backend futuro
cuando se migre desde localStorage a una arquitectura fullstack.

Por ahora, el frontend sigue usando localStorage directamente.
"""

# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# app = FastAPI(title="Juegos-Hub API")

# Configuración CORS para futura implementación
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000", "http://localhost:8000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Placeholder para routers futuros
# from src.api.routers import auth, salas, partidas
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(salas.router, prefix="/api/salas", tags=["salas"])
# app.include_router(partidas.router, prefix="/api/partidas", tags=["partidas"])

# @app.get("/")
# def read_root():
#     return {"message": "Juegos-Hub API - Placeholder para futuro backend"}

# Para ejecutar en el futuro:
# uvicorn src.api.main:app --reload