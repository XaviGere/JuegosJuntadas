"""
Placeholder para configuración de base de datos.

Este archivo contendrá la configuración de SQLAlchemy cuando se migre
a una base de datos real (PostgreSQL/SQLite).

Por ahora, el proyecto usa localStorage para persistencia.
"""

# from sqlalchemy import create_engine
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker

# Configuración para futura base de datos
# DATABASE_URL = "sqlite:///./juegoshub.db"  # Desarrollo
# DATABASE_URL = "postgresql://user:password@localhost/juegoshub"  # Producción

# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()

# Dependencia para obtener sesión de DB
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()