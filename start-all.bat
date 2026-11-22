@echo off
rem Starts the Specter app locally: reports API (demo data), optional transcription service, and the web app.
rem Usage: start-all.bat            (asks about the transcription service, opens the browser)
rem        start-all.bat /nobrowser (do not open the browser)
rem Needs: Python 3.11+ with the packages in services\api\requirements.txt, and Node.js 20+.
setlocal
cd /d "%~dp0"

echo ===== Specter: Scam Shield =====

rem ---- 1. Reports API on http://localhost:8000 ----
pushd services\api
if not exist data mkdir data
set API_DB=data\reports.db
set API_SECRET=local-dev-secret
if not exist data\reports.db (
  echo Creating labelled demo data...
  python -m app.seed
)
start "Specter API (8000)" cmd /k "set API_DB=data\reports.db&& set API_SECRET=local-dev-secret&& python -m uvicorn app.main:app --port 8000"
popd

rem ---- 2. Transcription service on http://localhost:8001 (optional) ----
set ASR_ON=n
set /p ASR_ON=Start the transcription service for audio upload? (y/N):
if /i "%ASR_ON%"=="y" (
  pushd services\asr
  start "Specter ASR (8001)" cmd /k "set ASR_MODEL=tiny&& python -m uvicorn app.main:app --port 8001"
  popd
  set VITE_ASR_BASE=http://localhost:8001
)

rem ---- 3. Web app on http://localhost:4173 ----
pushd apps\web
if not exist node_modules call npm install
set VITE_API_BASE=http://localhost:8000
call npm run build
if errorlevel 1 (
  echo Build failed. See the messages above.
  popd
  pause
  exit /b 1
)
start "Specter web (4173)" cmd /k "npx vite preview --port 4173 --strictPort"
popd

echo.
echo Web app:  http://localhost:4173
echo API docs: http://localhost:8000/docs
if /i "%ASR_ON%"=="y" echo ASR:      http://localhost:8001/health
echo Run stop-all.bat to close everything.
if /i not "%~1"=="/nobrowser" (
  timeout /t 4 /nobreak >nul
  start "" http://localhost:4173
)
endlocal
