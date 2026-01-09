param(
    [Parameter(Mandatory = $true)]
    [string]$AppName,
    
    [Parameter(Mandatory = $false)]
    [string]$PackageId
)

# Check if this is an MSIX/Store app (handle both forward and backslash)
if ($PackageId -like "MSIX\*" -or $PackageId -like "MSIX\\*" -or $PackageId -like "MSIX/*") {
    Write-Host "Detected Microsoft Store (MSIX) app"
    Write-Host "Package ID: $PackageId"
    
    # Extract package name from ID: MSIX/PublisherHash.AppName_Version... → PublisherHash.AppName
    $packageNamePart = $PackageId -replace '^MSIX[/\\]', ''  # Remove MSIX/ or MSIX\
    $packageName = $packageNamePart -replace '_.*$', ''       # Remove _Version and everything after
    
    Write-Host "Searching for package: $packageName"
    
    # Query current user packages (no -AllUsers to avoid permission issues)
    $packages = Get-AppxPackage -Name "*$packageName*" -ErrorAction SilentlyContinue
    
    if ($packages.Count -eq 0) {
        # Try fallback with display name
        Write-Host "Trying fallback search with: $AppName"
        $packages = Get-AppxPackage | Where-Object { $_.Name -like "*$AppName*" -or $_.PackageFullName -like "*$AppName*" }
    }
    
    if ($packages.Count -eq 0) {
        Write-Host "Error: No MSIX package matching '$AppName' found"
        exit 1
    }
    
    $package = $packages | Select-Object -First 1
    
    Write-Host "Found: $($package.Name)"
    Write-Host "Version: $($package.Version)"
    Write-Host "Publisher: $($package.Publisher)"
    Write-Host "PackageFullName: $($package.PackageFullName)"
    Write-Host ""
    Write-Host "Removing MSIX package..."
    
    try {
        # Remove for current user only
        Remove-AppxPackage -Package $package.PackageFullName -ErrorAction Stop
        Write-Host ""
        Write-Host "Successfully uninstalled"
        exit 0
    }
    catch {
        Write-Host "Error during uninstall: $_"
        exit 1
    }
    
}
else {
    # Traditional Win32 app - use registry uninstall string
    Write-Host "Searching for '$AppName' in Windows registry..."
    
    # Search in all standard uninstall locations
    $paths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    
    $apps = Get-ItemProperty $paths -ErrorAction SilentlyContinue | 
    Where-Object { $_.DisplayName -like "*$AppName*" } |
    Sort-Object DisplayName
    
    if ($apps.Count -eq 0) {
        Write-Host "Error: No application matching '$AppName' found in registry"
        exit 1
    }
    
    # If multiple matches, pick the first one
    $app = $apps | Select-Object -First 1
    
    Write-Host "Found: $($app.DisplayName)"
    Write-Host "Version: $($app.DisplayVersion)"
    Write-Host "Publisher: $($app.Publisher)"
    
    if (-not $app.UninstallString) {
        Write-Host "Error: No uninstall string found for this application"
        exit 1
    }
    
    Write-Host "Uninstall String: $($app.UninstallString)"
    Write-Host ""
    Write-Host "Starting uninstaller..."
    
    # Parse and execute the uninstall string
    $uninstallCmd = $app.UninstallString
    
    try {
        # Handle quoted executable paths
        if ($uninstallCmd -match '^"([^"]+)"(.*)$') {
            $exe = $matches[1]
            $uArgs = $matches[2].Trim()
            
            Write-Host "Executing: $exe $uArgs"
            
            if ($uArgs) {
                Start-Process -FilePath $exe -ArgumentList $uArgs -Wait
            }
            else {
                Start-Process -FilePath $exe -Wait
            }
        }
        else {
            # Direct execution (no quotes)
            Write-Host "Executing: $uninstallCmd"
            Invoke-Expression "& $uninstallCmd"
        }
        
        Write-Host ""
        Write-Host "Successfully uninstalled"
        exit 0
    }
    catch {
        Write-Host "Error during uninstall: $_"
        exit 1
    }
}
