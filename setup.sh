#!/bin/bash
# Script de configuración del entorno de desarrollo

echo "🎮 Configurando entorno de desarrollo de Juegos-Hub..."

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

echo "✅ Entorno configurado exitosamente"
echo "🚀 Para iniciar el servidor (futuro): uvicorn src.api.main:app --reload"