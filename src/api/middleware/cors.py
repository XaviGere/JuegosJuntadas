"""
Placeholder para configuración CORS.

Este archivo contendrá la configuración de CORS para el backend
cuando se implemente la API FastAPI.

Por ahora, no se necesita CORS ya que el frontend es estático.
"""

# from fastapi.middleware.cors import CORSMiddleware

# def configure_cors(app):
#     """Configurar CORS para la aplicación FastAPI"""
#     app.add_middleware(
#         CORSMiddleware,
#         allow_origins=[
#             "http://localhost:3000",
#             "http://localhost:8000",
#             "http://127.0.0.1:3000",
#             "http://127.0.0.1:8000"
#         ],
#         allow_credentials=True,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )