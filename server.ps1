<#
.SYNOPSIS
    EasyWinGet Web Server (v2.1 - Fixed)
.DESCRIPTION
    Robust HTTP server with modular parser
#>

# Force UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Console]::InputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Web

# Configuration
$Port = 8080
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GuiDir = Join-Path $ScriptDir "gui"
$TempFile = Join-Path $ScriptDir "winget_output.tmp"
$DownloadDir = Join-Path $ScriptDir "Downloads"
$DataDir = Join-Path $ScriptDir "data"
$InstalledCache = Join-Path $DataDir "installed.json"
$UpdatesCache = Join-Path $DataDir "updates.json"
$IgnoredCache = Join-Path $DataDir "ignored.json"
$DownloadsCache = Join-Path $DataDir "downloads.json"

# Ensure Dirs
if (-not (Test-Path $DownloadDir)) { New-Item -ItemType Directory -Path $DownloadDir | Out-Null }
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }

# Import Parser Module
Import-Module (Join-Path $ScriptDir "modules\parser.ps1") -Force

# ==========================================
# CACHE HELPERS
# ==========================================
function Save-AppCache {
    param([string]$Path, [array]$Data)
    try {
        $json = $Data | ConvertTo-Json -Depth 5 -Compress
        Set-Content -Path $Path -Value $json -Encoding UTF8
        Write-Host "Cache saved: $Path ($($Data.Count) items)" -ForegroundColor Green
    }
    catch {
        Write-Host "Cache Save Error: $_" -ForegroundColor Red
    }
}

function Get-AppCache {
    param([string]$Path)
    if (Test-Path $Path) {
        try {
            $json = Get-Content -Path $Path -Encoding UTF8 -Raw
            $data = $json | ConvertFrom-Json
            Write-Host "Cache loaded: $Path ($($data.Count) items)" -ForegroundColor Cyan
            return $data
        }
        catch {
            Write-Host "Cache Load Error: $_" -ForegroundColor Red
        }
    }
    return $null
}

# ==========================================
# WINGET EXECUTION
# ==========================================
function Invoke-WingetCommand {
    param(
        [string]$Arguments,
        [bool]$IsUpdate = $false
    )
    
    Write-Host "`n=== Executing: winget $Arguments ===" -ForegroundColor Cyan
    
    # Execute winget and save to temp file (NO --locale flag!)
    $cmd = "winget $Arguments > `"$TempFile`" 2>&1"
    cmd /c $cmd
    
    if (-not (Test-Path $TempFile)) {
        Write-Host "ERROR: Temp file not created" -ForegroundColor Red
        return @()
    }
    
    # Read with UTF8
    $rawOutput = Get-Content $TempFile -Encoding UTF8 -Raw
    
    Write-Host "Raw output length: $($rawOutput.Length) chars" -ForegroundColor Gray
    
    # Use new parser module
    $items = ConvertFrom-WinGetOutput -RawOutput $rawOutput -IsUpdate $IsUpdate
    
    Write-Host "Parsed $($items.Count) items`n" -ForegroundColor $(if ($items.Count -gt 0) { "Green" }else { "Yellow" })
    
    return $items
}

# ==========================================
# API HANDLERS (UPDATED FOR CACHE)
# ==========================================
# We update the listener loop area to use Load-Cache/Save-Cache


# ==========================================
# WEB HELPERS
# ==========================================
function ConvertTo-JsonResponse {
    param([hashtable]$Data, [bool]$Success = $true)
    $Data.Add("success", $Success)
    return $Data | ConvertTo-Json -Depth 5 -Compress
}

function Send-Response {
    param($Context, $Body, $StatusCode = 200, $ContentType = "application/json")
    try {
        $Context.Response.StatusCode = $StatusCode
        $Context.Response.ContentType = $ContentType
        $Context.Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $b = [System.Text.Encoding]::UTF8.GetBytes($Body)
        $Context.Response.ContentLength64 = $b.Length
        $Context.Response.OutputStream.Write($b, 0, $b.Length)
        $Context.Response.Close()
    }
    catch { Write-Host "Send Error: $($_.Exception.Message)" -ForegroundColor DarkGray }
}

# ==========================================
# MAIN SERVER LOOP
# ==========================================
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "EasyWinGet v2.0 (Rewrite) Active on http://localhost:$Port" -ForegroundColor Cyan
Start-Process "http://localhost:$Port"

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $url = $req.Url.LocalPath
        
        Write-Host "$($req.HttpMethod) $url" -ForegroundColor Gray
        
        if ($req.HttpMethod -eq "OPTIONS") { Send-Response $ctx "" 200; continue }

        # Favicon Check (early exit)
        if ($url -eq "/favicon.ico") { Send-Response $ctx "" 200 "image/x-icon"; continue }

        # Version JSON Handler
        if ($url -eq "/version.json") {
            $vFile = Join-Path $ScriptDir "version.json"
            if (Test-Path $vFile) {
                $content = Get-Content $vFile -Raw -Encoding UTF8
                Send-Response $ctx $content 200 "application/json"
            }
            else {
                Send-Response $ctx "{}" 404
            }
            continue
        }

        try {
            if ($url -eq "/api/installed") {
                # Load from Cache first
                $cached = Get-AppCache $InstalledCache
                if ($cached) {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ apps = $cached })
                }
                else {
                    $apps = Invoke-WingetCommand "list --accept-source-agreements" $false
                    Save-AppCache $InstalledCache $apps
                    Send-Response $ctx (ConvertTo-JsonResponse @{ apps = $apps })
                }
            }
            elseif ($url -eq "/api/refresh-installed") {
                # Force Refresh
                $apps = Invoke-WingetCommand "list --accept-source-agreements" $false
                Save-AppCache $InstalledCache $apps
                Send-Response $ctx (ConvertTo-JsonResponse @{ apps = $apps })
            }


            elseif ($url -eq "/api/updates") {
                $cached = Get-AppCache $UpdatesCache
                
                # Load ignored list
                $ignored = Get-AppCache $IgnoredCache
                if ($null -eq $ignored) { $ignored = @() }
                $ignoredIds = $ignored.id

                if ($cached) {
                    # Filter out ignored
                    $filtered = $cached | Where-Object { $ignoredIds -notcontains $_.id }
                    Send-Response $ctx (ConvertTo-JsonResponse @{ updates = $filtered })
                }
                else {
                    $updates = Invoke-WingetCommand "upgrade --include-unknown --accept-source-agreements" $true
                    Save-AppCache $UpdatesCache $updates
                    
                    # Filter out ignored
                    $filtered = $updates | Where-Object { $ignoredIds -notcontains $_.id }
                    Send-Response $ctx (ConvertTo-JsonResponse @{ updates = $filtered })
                }
            }
            elseif ($url -eq "/api/refresh-updates") {
                $updates = Invoke-WingetCommand "upgrade --include-unknown --accept-source-agreements" $true
                Save-AppCache $UpdatesCache $updates
                
                # Load ignored list
                $ignored = Get-AppCache $IgnoredCache
                if ($null -eq $ignored) { $ignored = @() }
                $ignoredIds = $ignored.id
                
                # Filter out ignored
                $filtered = $updates | Where-Object { $ignoredIds -notcontains $_.id }
                
                Send-Response $ctx (ConvertTo-JsonResponse @{ updates = $filtered })
            }
            elseif ($url -eq "/api/ignored") {
                $ignored = Get-AppCache $IgnoredCache
                if ($null -eq $ignored) { $ignored = @() }
                # Ensure it's an array
                if ($ignored -isnot [array]) {
                    $ignored = @($ignored)
                }
                Send-Response $ctx (ConvertTo-JsonResponse @{ apps = $ignored })
            }
            elseif ($url.StartsWith("/api/ignore")) {
                $id = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["id"]
                $name = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["name"]
                
                if ($id) {
                    $ignored = Get-AppCache $IgnoredCache
                    if ($null -eq $ignored) { 
                        $ignored = @() 
                    }
                    # Ensure it's an array (in case cache has single object)
                    if ($ignored -isnot [array]) {
                        $ignored = @($ignored)
                    }
                    
                    # Check if already ignored to avoid duplicates
                    if (-not ($ignored.id -contains $id)) {
                        $ignored = @($ignored) + @{ id = $id; name = $name }
                        Save-AppCache $IgnoredCache $ignored
                    }
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Ignored $id" })
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No ID provided" } $false)
                }
            }
            elseif ($url.StartsWith("/api/unignore")) {
                $id = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["id"]
                
                if ($id) {
                    $ignored = Get-AppCache $IgnoredCache
                    if ($ignored) {
                        # Ensure it's an array
                        if ($ignored -isnot [array]) {
                            $ignored = @($ignored)
                        }
                        $ignored = $ignored | Where-Object { $_.id -ne $id }
                        Save-AppCache $IgnoredCache $ignored 
                    }
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Unignored $id" })
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No ID provided" } $false)
                }
            }
            elseif ($url -eq "/api/ignored") {
                $ignored = Get-AppCache $IgnoredCache
                if ($null -eq $ignored) { $ignored = @() }
                # Ensure it's an array
                if ($ignored -isnot [array]) {
                    $ignored = @($ignored)
                }
                Send-Response $ctx (ConvertTo-JsonResponse @{ apps = $ignored })
            }
            elseif ($url.StartsWith("/api/search")) {
                $q = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["q"]
                if ($q) {
                    $results = Invoke-WingetCommand "search `"$q`" --accept-source-agreements" $false
                    Send-Response $ctx (ConvertTo-JsonResponse @{ results = $results })
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ results = @() })
                }
            }
            elseif ($url.StartsWith("/api/install")) {
                $id = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["id"]
                if ($id) {
                    Write-Host "`n=== Installing: $id ===" -ForegroundColor Cyan
                    try {
                        $cmd = "winget install `"$id`" --accept-source-agreements --accept-package-agreements"
                        $output = cmd /c $cmd 2>&1
                        Write-Host $output
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Installed $id" })
                    }
                    catch {
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Install failed: $_" } $false)
                    }
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No ID provided" } $false)
                }
            }
            # ==========================================
            # DOWNLOADED FILES API
            # ==========================================
            elseif ($url -eq "/api/downloaded") {
                $extensions = @(".exe", ".msi", ".zip", ".7z", ".tar", ".rar", ".iso", ".gz")
                $files = @(Get-ChildItem -Path $DownloadDir -File | Where-Object { $extensions -contains $_.Extension } | Select-Object Name, Length, LastWriteTime)
                
                Write-Host "Found $($files.Count) downloaded files" -ForegroundColor Cyan
                if ($files.Count -gt 0) {
                    $files | ForEach-Object { Write-Host " - $($_.Name)" -ForegroundColor Gray }
                }

                Save-AppCache $DownloadsCache $files
                Send-Response $ctx (ConvertTo-JsonResponse @{ files = $files })
            }
            elseif ($url.StartsWith("/api/downloaded/delete")) {
                $file = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["file"]
                if ($file) {
                    $path = Join-Path $DownloadDir $file
                    if (Test-Path $path) {
                        try {
                            Remove-Item $path -Force
                            # Re-cache immediately to ensure counts are accurate
                            $extensions = @(".exe", ".msi", ".zip", ".7z", ".tar", ".rar", ".iso", ".gz")
                            $files = @(Get-ChildItem -Path $DownloadDir -File | Where-Object { $extensions -contains $_.Extension } | Select-Object Name, Length, LastWriteTime)
                            Save-AppCache $DownloadsCache $files
                            
                            Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Deleted $file" })
                        }
                        catch {
                            Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Delete failed: $_" } $false)
                        }
                    }
                    else {
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "File not found" } $false) 404
                    }
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No file provided" } $false)
                }
            }
            elseif ($url.StartsWith("/api/downloaded/run")) {
                $file = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["file"]
                if ($file) {
                    $path = Join-Path $DownloadDir $file
                    if (Test-Path $path) {
                        try {
                            Invoke-Item $path
                            Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Launched $file" })
                        }
                        catch {
                            Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Launch failed: $_" } $false)
                        }
                    }
                    else {
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "File not found" } $false) 404
                    }
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No file provided" } $false)
                }
            }
            elseif ($url.StartsWith("/api/download")) {
                $id = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["id"]
                if ($id) {
                    Write-Host "`n=== Downloading: $id ===" -ForegroundColor Cyan
                    try {
                        $cmd = "winget download `"$id`" --download-directory `"$DownloadDir`" --accept-source-agreements"
                        $output = cmd /c $cmd 2>&1
                        Write-Host $output
                        
                        # CLEANUP: Remove annoying manifest files (YAML)
                        Get-ChildItem -Path $DownloadDir -Filter "*.yaml" | Remove-Item -Force -ErrorAction SilentlyContinue
                        
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Downloaded $id" })
                    }
                    catch {
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Download failed: $_" } $false)
                    }
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No ID provided" } $false)
                }
            }
            elseif ($url.StartsWith("/api/update")) {
                $id = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["id"]
                if ($id) {
                    Write-Host "`n=== Updating: $id ===" -ForegroundColor Cyan
                    try {
                        $cmd = "winget upgrade `"$id`" --accept-source-agreements --accept-package-agreements"
                        $output = cmd /c $cmd 2>&1
                        Write-Host $output
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Updated $id" })
                    }
                    catch {
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Update failed: $_" } $false)
                    }
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No ID provided" } $false)
                }
            }
            elseif ($url.StartsWith("/api/uninstall")) {
                $id = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)["id"]
                if ($id) {
                    Write-Host "`n=== Uninstalling: $id ===" -ForegroundColor Cyan
                    try {
                        $cmd = "winget uninstall `"$id`" --accept-source-agreements"
                        $output = cmd /c $cmd 2>&1
                        Write-Host $output
                        # Invalidate cache
                        if (Test-Path $InstalledCache) { Remove-Item $InstalledCache }
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Uninstalled $id" })
                    }
                    catch {
                        Send-Response $ctx (ConvertTo-JsonResponse @{ message = "Uninstall failed: $_" } $false)
                    }
                }
                else {
                    Send-Response $ctx (ConvertTo-JsonResponse @{ message = "No ID provided" } $false)
                }
            }


            # ... (Jobs/Install/Uninstall - Simplified for this fix, assuming async logic from previous is fine but let's stick to core data first)
            elseif ($url -match "\.(html|css|js|png|ico)$" -or $url -eq "/") {
                $f = if ($url -eq "/") { "index.html" } else { $url.TrimStart('/') }
                $p = Join-Path $GuiDir $f
                if (Test-Path $p) {
                    $bytes = [System.IO.File]::ReadAllBytes($p)
                    # Simple extension map
                    $ext = [System.IO.Path]::GetExtension($p)
                    $ct = switch ($ext) { ".css" { "text/css" } ".js" { "application/javascript" } ".html" { "text/html" } default { "text/plain" } }
                    $ctx.Response.StatusCode = 200
                    $ctx.Response.ContentType = $ct
                    $ctx.Response.ContentLength64 = $bytes.Length
                    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                    $ctx.Response.Close()
                }
                else {
                    Send-Response $ctx "Not Found" 404 "text/plain"
                }
            }
            else {
                # Fallback for job handling - keeping it minimal to focus on "Show Items" priority
                Send-Response $ctx (ConvertTo-JsonResponse @{ msg = "Not Implemented in Rewrite Phase 1" }) 200
            }
        }
        catch {
            Send-Response $ctx (ConvertTo-JsonResponse @{ error = $_.Exception.Message } $false) 500
        }
    }
}
finally {
    $listener.Stop()
}
