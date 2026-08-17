@echo off
title ClearMate - Automatic Startup Engine
echo ======================================================================
echo   CLEARMATE — AI-DRIVEN STUDENT CLEARANCE SYSTEM
echo ======================================================================
echo.
echo [1/3] Starting Backend Server (Port 5000)...
start "ClearMate Backend API" cmd /k "cd server && npm run dev"

echo [2/3] Preparing Frontend Client App...
start "ClearMate Frontend Client" cmd /k "cd client && npm install && npm run dev"

echo.
echo [3/3] Launching web browser in 6 seconds...
timeout /t 6 >nul
start http://localhost:5173/login
start http://localhost:5174/login

echo.
echo Startup instructions executed successfully.
echo.
echo - Please keep the opened Command Prompt windows running.
echo - If port 5173 is in use, use http://localhost:5174/login instead.
echo ======================================================================
pause
