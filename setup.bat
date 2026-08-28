@echo off
REM Script de configuración del entorno de desarrollo para Windows

echo 🎮 Configurando entorno de desarrollo de Juegos-Hub...

REM Crear entorno virtual
python -m venv venv

REM Activar entorno virtual e instalar dependencias
call venv\Scripts\activate
pip install -r requirements.txt

echo ✅ Entorno configurado exitosamente
echo 🚀 Para iniciar el servidor (futuro): uvicorn src.api.main:app --reload