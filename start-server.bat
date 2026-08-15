@echo off
title Design Studio - Luxury Celebration Platform Server
color 0E

echo ============================================================================
echo   DESIGN STUDIO - LUXURY CELEBRATION & INVITATION BACKEND
echo ============================================================================
echo.

:: Check portable Node.js in user directory
if exist "%USERPROFILE%\.gemini\antigravity\bin\nodejs\node.exe" (
    set "PATH=%USERPROFILE%\.gemini\antigravity\bin\nodejs;%PATH%"
)

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not found in PATH.
    echo [*] Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [*] Installing production backend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [X] npm install encountered an error.
        pause
        exit /b 1
    )
)

:: Create data & uploads folders if missing
if not exist "data\" mkdir data
if not exist "uploads\" mkdir uploads

echo.
echo [*] Launching Node.js Express server on port 3000...
echo.
echo  ==========================================================================
echo    LOCAL SERVER:  http://localhost:3000
echo    ADMIN STUDIO:  http://localhost:3000/admin.html
echo  ==========================================================================
echo.

:: Open browser after 2 seconds
start "" http://localhost:3000/admin.html

:: Start Node.js server
node server.js
pause
