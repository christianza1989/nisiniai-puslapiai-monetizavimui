@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\pythonw.exe" (
  echo Pirma paleiskite Idiegti.ps1 arba idiekite requirements.txt i Python 3.11+ aplinka.
  pause
  exit /b 1
)
start "" ".venv\Scripts\pythonw.exe" "app.py"
