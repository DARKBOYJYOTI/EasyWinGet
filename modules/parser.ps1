<#
.SYNOPSIS
    Simple Regex WinGet Parser (Fixed Line Splitting)
.DESCRIPTION
    Pure regex parsing with proper line handling
#>

function Write-ParserLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "Gray" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function ConvertFrom-WinGetOutput {
    param(
        [string]$RawOutput,
        [bool]$IsUpdate = $false
    )
    
    Write-ParserLog "=== Starting Parse (IsUpdate=$IsUpdate) ===" "INFO"
    
    $items = @()
    
    if ([string]::IsNullOrWhiteSpace($RawOutput)) {
        Write-ParserLog "Empty input" "WARN"
        return $items
    }
    
    # Remove ANSI codes first
    $cleaned = $RawOutput -replace '\x1b\[[0-9;]*m', ''
    $cleaned = $cleaned -replace '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', ''  # Keep \r (0D) and \n (0A)
    
    # Split by ANY line ending: \r\n, \n, or \r
    $lines = $cleaned -split '[\r\n]+' | Where-Object { $_.Trim() -ne "" }
    
    Write-ParserLog "Raw length: $($RawOutput.Length) chars, Split into: $($lines.Count) lines"
    
    $dataStarted = $false
    $count = 0
    
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        
        # Skip headers and separators
        if ($trimmed -match "^Name\s+" -or $trimmed -match "^---+" -or $trimmed -match "^Windows" -or $trimmed -match "^Copyright") {
            if ($trimmed -match "^---+") { 
                $dataStarted = $true 
                Write-ParserLog "Found separator, data starts"
            }
            continue
        }
        
        # Skip footers
        if ($trimmed -match "^\d+\s+package" -or $trimmed -match "^No\s+" -or $trimmed -match "applicable") { 
            Write-ParserLog "Skipping footer: $trimmed"
            continue 
        }
        
        # Start parsing after first header line if no separator
        if (-not $dataStarted -and $trimmed -match "^Name.*Id.*Version") {
            $dataStarted = $true
            continue
        }
        
        if (-not $dataStarted) { continue }
        
        try {
            if ($IsUpdate) {
                # Updates: Name  Id  Version  Available
                # More flexible regex for updates
                if ($trimmed -match '^(.+?)\s{1,}([\w\.\-]+)\s{1,}(\S+)\s{1,}(\S+)') {
                    $n = $Matches[1].Trim()
                    $i = $Matches[2].Trim()
                    $c = $Matches[3].Trim()
                    $a = $Matches[4].Trim()
                    
                    # Skip if looks like header or has special chars
                    if ($n -notmatch "^(Name|Id|Source|Available|---)" -and $i -notmatch "^(Id|Version)" -and $a -ne "Source") {
                        $items += @{ name = $n; id = $i; current = $c; version = $a }
                        $count++
                        if ($count -le 5) { Write-ParserLog "Update: $n | $i -> $a" "SUCCESS" }
                    }
                }
            }
            else {
                # Installed/Search: Need smart detection of package ID
                # Package IDs have dots or dashes: VideoLAN.VLC, Google.Chrome, etc.
                # Pattern: Capture everything before an ID-like pattern, then ID, then version
                
                # Try to find package ID pattern (word.word or word-word)
                if ($trimmed -match '^(.+?)\s+([\w]+(\.[\w]+)+|[\w]+(-[\w]+)+)\s+(\S+)') {
                    # This matches: Name (any text) PackageID (with dots/dashes) Version
                    $n = $Matches[1].Trim()
                    $i = $Matches[2].Trim()
                    $v = $Matches[5].Trim()
                    
                    # Skip headers
                    if ($n -notmatch "^(Name|Id|Source|Match|---)" -and $i -notmatch "^(Id|Version|Match)") {
                        $items += @{ name = $n; id = $i; version = $v }
                        $count++
                        if ($count -le 5) { Write-ParserLog "App: $n | $i | $v" "SUCCESS" }
                    }
                }
            }
        }
        catch {
            Write-ParserLog "Parse error: $_" "WARN"
        }
    }
    
    Write-ParserLog "=== Complete: $($items.Count) items ===" $(if ($items.Count -gt 0) { "SUCCESS" }else { "ERROR" })
    
    if ($items.Count -gt 0 -and $items.Count -le 10) {
        Write-ParserLog "Sample: $($items[0].name)"
    }
    
    return ($items | Sort-Object -Property name)
}
