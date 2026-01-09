@echo off
setlocal enabledelayedexpansion
cd /d "C:\EasyWinGet"

:: ============================================
:: Check Node.js
:: ============================================
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    :: If Node not found, we can't do much in background mode except fail silently or try to install
    :: But silent install might trigger UAC which we can't see properly if hidden
    :: So we assume Node is there or was installed by install.bat if possible
    :: Or we just exit
    exit
)

:: ============================================
:: Check if Already Running
:: ============================================
netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    :: Server is running, just open the UI
    start http://127.0.0.1:8080
    exit
)

:: ============================================
:: Start Server
:: ============================================
:: We assume dependencies are installed or we try to run anyway
:: Log output to file since we are hidden
node server.js > server_runner.log 2>&1
