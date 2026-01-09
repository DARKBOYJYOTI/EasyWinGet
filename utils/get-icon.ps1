# Icon Extraction Script for EasyWinGet
# Modes: 1) Direct Path, 2) Registry, 3) Start Menu, 4) Program Files, 5) AppX

param(
    [Parameter(Mandatory = $false)]
    [string]$AppName,

    [Parameter(Mandatory = $false)]
    [string]$AppId,

    [Parameter(Mandatory = $false)]
    [string]$Path
)

$LogFile = "C:\bots\EasyWinGet\debug_icon.log"
function Write-Log {
    param($Message)
    $ts = Get-Date -Format "HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$ts] $Message" -ErrorAction SilentlyContinue
}

# Load System.Drawing for icon extraction
try {
    Add-Type -AssemblyName System.Drawing
}
catch {
    Write-Log "Failed to load System.Drawing"
    exit 1
}

function Get-IconBase64 {
    param($targetPath)
    try {
        # Clean quotes and arguments
        $clean = $targetPath -replace '"', ''
        if ($clean -match '(?i)(\.exe)') {
            $clean = $clean -replace '(?i)(\.exe).*', '$1'
        }
        
        if (-not (Test-Path $clean)) { 
            return $null 
        }
        
        # Check if it's an ICO file
        if ($clean -match '\.ico$') {
            try {
                $bytes = [System.IO.File]::ReadAllBytes($clean)
                return [Convert]::ToBase64String($bytes)
            }
            catch { }
        }
        
        # Extract from EXE/DLL
        try {
            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($clean)
            if ($icon) {
                $ms = New-Object System.IO.MemoryStream
                $icon.ToBitmap().Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
                $bytes = $ms.ToArray()
                $ms.Close()
                return [Convert]::ToBase64String($bytes)
            }
        }
        catch { }
    }
    catch { }
    return $null
}

Write-Log "Request - AppName: '$AppName', Path: '$Path'"

# MODE 1: Direct Path
if ($Path) {
    $b64 = Get-IconBase64 -targetPath $Path
    if ($b64) {
        Write-Output $b64
        exit 0
    }
    exit 1
}

if (-not $AppName) {
    exit 1
}

# MODE 2: Registry Search
Write-Log "Mode 2: Registry for '$AppName'"
$regPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$apps = Get-ItemProperty $regPaths -ErrorAction SilentlyContinue | 
Where-Object { $_.DisplayName -like "*$AppName*" -or $_.PSChildName -like "*$AppName*" } |
Select-Object DisplayName, DisplayIcon, InstallLocation

foreach ($app in $apps) {
    # Try DisplayIcon
    if ($app.DisplayIcon) {
        $rawPath = $app.DisplayIcon
        if ($rawPath -match ',') { $rawPath = $rawPath.Split(',')[0] }
        $b64 = Get-IconBase64 -targetPath $rawPath
        if ($b64) {
            Write-Output $b64
            exit 0
        }
    }
    
    # Try InstallLocation
    if ($app.InstallLocation -and (Test-Path $app.InstallLocation)) {
        $exes = Get-ChildItem -Path $app.InstallLocation -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 3
        foreach ($exe in $exes) {
            $b64 = Get-IconBase64 -targetPath $exe.FullName
            if ($b64) {
                Write-Log "Found from InstallLocation: $($exe.FullName)"
                Write-Output $b64
                exit 0
            }
        }
    }
}

# MODE 3: Start Menu Shortcuts
Write-Log "Mode 3: Start Menu"
$startPaths = @(
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
)

foreach ($menuPath in $startPaths) {
    if (Test-Path $menuPath) {
        $shortcuts = Get-ChildItem -Path $menuPath -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | 
        Where-Object { $_.BaseName -like "*$AppName*" }
        
        foreach ($shortcut in $shortcuts) {
            try {
                $shell = New-Object -ComObject WScript.Shell
                $lnk = $shell.CreateShortcut($shortcut.FullName)
                $target = $lnk.TargetPath
                
                if ($target -and (Test-Path $target)) {
                    $b64 = Get-IconBase64 -targetPath $target
                    if ($b64) {
                        Write-Log "Found from Start Menu: $target"
                        Write-Output $b64
                        exit 0
                    }
                }
            }
            catch { }
        }
    }
}

# MODE 4: Program Files Search
Write-Log "Mode 4: Program Files"
$progPaths = @(
    "$env:ProgramFiles",
    "${env:ProgramFiles(x86)}",
    "$env:LOCALAPPDATA\Programs"
)

foreach ($progPath in $progPaths) {
    if (Test-Path $progPath) {
        $folders = Get-ChildItem -Path $progPath -Directory -ErrorAction SilentlyContinue | 
        Where-Object { $_.Name -like "*$AppName*" } | Select-Object -First 2
        
        foreach ($folder in $folders) {
            $exes = Get-ChildItem -Path $folder.FullName -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 3
            foreach ($exe in $exes) {
                $b64 = Get-IconBase64 -targetPath $exe.FullName
                if ($b64) {
                    Write-Log "Found from Program Files: $($exe.FullName)"
                    Write-Output $b64
                    exit 0
                }
            }
        }
    }
}

# MODE 5: UWP/AppX Packages (Microsoft Store apps)
Write-Log "Mode 5: AppX Packages"

function Search-AppxIcon {
    param($searchTerm)
    if (-not $searchTerm) { return $false }
    
    try {
        $appxPackages = Get-AppxPackage -Name "*$searchTerm*" -ErrorAction SilentlyContinue
        foreach ($pkg in $appxPackages) {
            if ($pkg.InstallLocation -and (Test-Path $pkg.InstallLocation)) {
                # Look for logo files in the package
                $logos = Get-ChildItem -Path $pkg.InstallLocation -Recurse -Include "*.png" -ErrorAction SilentlyContinue | 
                Where-Object { $_.Name -match 'Logo|Icon|Square.*Logo' -and $_.Name -match '44|48|64|128|150' } |
                Sort-Object { [int]($_.Name -replace '\D', '') } -Descending |
                Select-Object -First 1
                
                if ($logos) {
                    $bytes = [System.IO.File]::ReadAllBytes($logos.FullName)
                    $b64 = [Convert]::ToBase64String($bytes)
                    Write-Log "Found from AppX ($searchTerm): $($logos.FullName)"
                    Write-Output $b64
                    return $true
                }
                
                # Try AppxManifest
                $manifest = Join-Path $pkg.InstallLocation "AppxManifest.xml"
                if (Test-Path $manifest) {
                    [xml]$xml = Get-Content $manifest
                    $logoPath = $xml.Package.Properties.Logo
                    if ($logoPath) {
                        $fullLogoPath = Join-Path $pkg.InstallLocation $logoPath
                        if (Test-Path $fullLogoPath) {
                            $bytes = [System.IO.File]::ReadAllBytes($fullLogoPath)
                            $b64 = [Convert]::ToBase64String($bytes)
                            Write-Log "Found from AppX Manifest ($searchTerm): $fullLogoPath"
                            Write-Output $b64
                            return $true
                        }
                    }
                }
            }
        }
    }
    catch { }
    return $false
}

# Try multiple search strategies for AppX
# 1. Search by full AppId (e.g. "Microsoft.ScreenSketch")
if ($AppId) {
    Write-Log "AppX: Trying full ID '$AppId'"
    $appxPackages = Get-AppxPackage -Name "*$AppId*" -ErrorAction SilentlyContinue
    foreach ($pkg in $appxPackages) {
        if ($pkg.InstallLocation -and (Test-Path $pkg.InstallLocation)) {
            # Try AppxManifest first (more reliable)
            $manifest = Join-Path $pkg.InstallLocation "AppxManifest.xml"
            if (Test-Path $manifest) {
                try {
                    [xml]$xml = Get-Content $manifest -ErrorAction Stop
                    $logoPath = $xml.Package.Properties.Logo
                    if ($logoPath) {
                        $fullLogoPath = Join-Path $pkg.InstallLocation $logoPath
                        # Try with and without scale suffix
                        $possiblePaths = @(
                            $fullLogoPath,
                            ($fullLogoPath -replace '\.png$', '.scale-100.png'),
                            ($fullLogoPath -replace '\.png$', '.scale-200.png')
                        )
                        foreach ($path in $possiblePaths) {
                            if (Test-Path $path) {
                                $bytes = [System.IO.File]::ReadAllBytes($path)
                                Write-Log "Found from AppX Manifest: $path"
                                Write-Output ([Convert]::ToBase64String($bytes))
                                exit 0
                            }
                        }
                    }
                }
                catch { Write-Log "Manifest read error: $_" }
            }
            
            # Fallback: Look for logo files
            $logos = Get-ChildItem -Path $pkg.InstallLocation -Filter "*.png" -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -match 'Logo|Icon|Square' -and $_.Name -match '44|48|64|128|150' } |
            Sort-Object Length -Descending |
            Select-Object -First 1
            
            if ($logos) {
                $bytes = [System.IO.File]::ReadAllBytes($logos.FullName)
                Write-Log "Found from AppX folder: $($logos.FullName)"
                Write-Output ([Convert]::ToBase64String($bytes))
                exit 0
            }
        }
    }
}

# 2. Search by AppName
if ($AppName) {
    Write-Log "AppX: Trying name '$AppName'"
    $appxPackages = Get-AppxPackage -Name "*$AppName*" -ErrorAction SilentlyContinue
    foreach ($pkg in $appxPackages) {
        if ($pkg.InstallLocation -and (Test-Path $pkg.InstallLocation)) {
            $manifest = Join-Path $pkg.InstallLocation "AppxManifest.xml"
            if (Test-Path $manifest) {
                try {
                    [xml]$xml = Get-Content $manifest -ErrorAction Stop
                    $logoPath = $xml.Package.Properties.Logo
                    if ($logoPath) {
                        $fullLogoPath = Join-Path $pkg.InstallLocation $logoPath
                        $possiblePaths = @(
                            $fullLogoPath,
                            ($fullLogoPath -replace '\.png$', '.scale-100.png'),
                            ($fullLogoPath -replace '\.png$', '.scale-200.png')
                        )
                        foreach ($path in $possiblePaths) {
                            if (Test-Path $path) {
                                $bytes = [System.IO.File]::ReadAllBytes($path)
                                Write-Log "Found from AppX Manifest: $path"
                                Write-Output ([Convert]::ToBase64String($bytes))
                                exit 0
                            }
                        }
                    }
                }
                catch { }
            }
        }
    }
}

Write-Log "All modes failed for Name:'$AppName' Id:'$AppId'"
exit 1


