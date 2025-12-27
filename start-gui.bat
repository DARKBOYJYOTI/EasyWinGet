@echo off
chcp 65001 >nul 2>&1
title EasyWinGet GUI Server

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :run
) else (
    goto :elevate
)

:elevate
echo Requesting administrator privileges...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%~f0' -Verb RunAs"
exit /b

:run
cls
echo.
echo ╔════════════════════════════════════════════╗
echo ║        EasyWinGet GUI Launcher             ║
echo ╚════════════════════════════════════════════╝
echo.
echo Starting web server...
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0server.ps1"

echo.
echo ════════════════════════════════════════════
echo   Press any key to exit...
echo ════════════════════════════════════════════
pause >nul
