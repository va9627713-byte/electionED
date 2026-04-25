@echo off
REM ElectED - GitHub Setup Only

echo.
echo ========================================
echo   GitHub Setup for ElectED
echo ========================================
echo.

REM Check if git is installed
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed
    echo Please install from https://git-scm.com
    pause
    exit /b 1
)

echo Step 1: Initializing Git...
git init
git add .
git commit -m "ElectED - Election Process Education Assistant"

echo.
echo Step 2: Creating GitHub Repo...
echo.
echo 1. Go to https://github.com/new
echo 2. Name: elected
echo 3. Make it PUBLIC
echo 4. Don't add README (we have one)
echo.
pause

echo.
echo Step 3: Enter your repo URL (e.g., https://github.com/username/elected.git)
set /p REPO_URL=

git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
echo ========================================
echo   GitHub Setup Complete!
echo ========================================
echo.
echo Next: Deploy to Cloud Run using deploy.bat
echo.
pause
