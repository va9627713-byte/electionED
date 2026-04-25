@echo off
REM ElectED - GitHub & Cloud Run Deployment Script

echo.
echo ========================================
echo   ElectED Deployment Script
echo ========================================
echo.

REM Check if git is installed
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com
    pause
    exit /b 1
)

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Google Cloud SDK is not installed
    echo Please install from https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo Step 1: Initializing Git...
git init
git add .
git commit -m "Initial commit - ElectED election education assistant"

echo.
echo Step 2: Pushing to GitHub...
echo Please create a new repo at https://github.com/new
echo Then enter your repo URL below:
set REPO_URL=https://github.com/va9627713-byte/elected.git

git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
echo Step 3: Deploying to Cloud Run...
echo Make sure you have your Anthropic API key ready
echo.

set /p GCP_PROJECT=Enter your Google Cloud Project ID: 
set /p ANTHROPIC_KEY=Enter your Anthropic API Key (sk-ant-...): 

gcloud run deploy elected ^
  --source . ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --set-env-vars ANTHROPIC_API_KEY=%ANTHROPIC_KEY% ^
  --project %GCP_PROJECT%

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
pause
