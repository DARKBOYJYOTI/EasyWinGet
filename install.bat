@echo off
setlocal
echo ==================================================
echo          EasyWinGet - Installer
echo ==================================================
echo.

:: Check for Admin
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Requesting admin privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/k cd /d \"%CD%\" && \"%~f0\"' -Verb RunAs"
    exit
)

:: ============================================
:: Check Node.js
:: ============================================
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js not installed
    
    IF EXIST "offline-packages\node-installer.msi" (
        echo [*] Installing Node.js - this may take 2-3 minutes...
        msiexec /i "offline-packages\node-installer.msi" /qn /norestart
        echo [OK] Node.js installed!
    ) ELSE (
        echo [ERROR] Node.js installer not found!
        echo Please download: https://nodejs.org
        pause
        exit /b 1
    )
) ELSE (
    echo [OK] Node.js is installed
)

:: ============================================
:: Check Dependencies
:: ============================================
IF NOT EXIST "node_modules\" (
    echo [!] Installing packages...
    
    IF EXIST "offline-packages\express-5.2.1.tgz" (
        echo [*] Installing from offline packages...
        call npm install offline-packages\express-5.2.1.tgz offline-packages\cors-2.8.5.tgz offline-packages\node-pty-1.1.0.tgz 2>nul
    ) ELSE (
        echo [*] Installing from npm...
        call npm install 2>nul
    )
)

echo [*] Stopping existing server instances...
powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [*] Creating C:\EasyWinGet...
if not exist "C:\EasyWinGet" mkdir "C:\EasyWinGet"

echo [*] Copying files (this may take a moment)...
xcopy /E /I /Y /Q "%~dp0*" "C:\EasyWinGet\"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to copy files!
    pause
    exit
)

echo [*] Creating Shortcuts...
set "TARGET_SCRIPT=C:\EasyWinGet\utils\start_server_hidden.vbs"

:: Create Desktop Shortcut
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = oWS.ExpandEnvironmentStrings^("%%USERPROFILE%%\Desktop\EasyWinGet.lnk"^)
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "wscript.exe"
echo oLink.Arguments = """%TARGET_SCRIPT%"""
echo oLink.WorkingDirectory = "C:\EasyWinGet"
echo oLink.Description = "EasyWinGet Package Manager"
echo oLink.IconLocation = "C:\EasyWinGet\gui\default-icon.ico"
echo oLink.Save
) > CreateDesktopShortcut.vbs

:: Create Start Menu Shortcut
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = oWS.ExpandEnvironmentStrings^("%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\EasyWinGet.lnk"^)
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "wscript.exe"
echo oLink.Arguments = """%TARGET_SCRIPT%"""
echo oLink.WorkingDirectory = "C:\EasyWinGet"
echo oLink.Description = "EasyWinGet Package Manager"
echo oLink.IconLocation = "C:\EasyWinGet\gui\default-icon.ico"
echo oLink.Save
) > CreateStartMenuShortcut.vbs

echo [*] Applying Shortcuts...
cscript //nologo CreateDesktopShortcut.vbs
cscript //nologo CreateStartMenuShortcut.vbs
del CreateDesktopShortcut.vbs
del CreateStartMenuShortcut.vbs

echo.
echo ==================================================
echo [OK] Installation Complete!
echo You can now open "EasyWinGet" from your Desktop.
echo ==================================================
echo.
pause
