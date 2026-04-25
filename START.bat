@echo off
title ElectED Server
color 0A
cls
echo.
echo  ============================================
echo    ElectED - Election Education Assistant
echo  ============================================
echo.

:: Check if node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js is not installed or not in PATH.
  echo  Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
  echo  [INFO] Installing dependencies...
  npm install
  echo.
)

:: Kill any process already using port 8080
echo  [INFO] Freeing port 8080 if in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 " 2^>nul') do (
  taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start the server in background
echo  [INFO] Starting ElectED server...
start /min "ElectED-Server" cmd /c "node server.js > server.log 2>&1"

:: Wait for server to be ready
echo  [INFO] Waiting for server to be ready...
timeout /t 2 /nobreak >nul

:: Verify server is up
:CHECK
curl -s http://localhost:8080/health >nul 2>&1
if %errorlevel% neq 0 (
  timeout /t 1 /nobreak >nul
  goto CHECK
)

echo  [OK] Server is running at http://localhost:8080
echo.

:: Open in default browser
start http://localhost:8080

echo  [OK] Browser opened!
echo.
echo  ============================================
echo   Keep this window open while using ElectED
echo   Close this window to stop the server
echo  ============================================
echo.
pause
