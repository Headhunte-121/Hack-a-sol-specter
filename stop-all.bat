@echo off
rem Closes the windows opened by start-all.bat.
taskkill /FI "WINDOWTITLE eq Specter API (8000)*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Specter ASR (8001)*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Specter web (4173)*" /T /F >nul 2>&1
echo Specter stopped.
