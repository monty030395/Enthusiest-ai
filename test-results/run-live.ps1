# run-live.ps1 — fetch live Trade Me listings (headless Edge render via
# fetch-listing.ps1) and run each through the production /api/analyze
# (now the tuned prompt on main). Saves JSON + prints a summary.
param(
    [string]$Endpoint = "https://www.motormind.nz/api/analyze",
    [string]$OutDir   = "C:\Users\Monty\Documents\Enthusiest-ai\test-results\live2"
)
$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force $OutDir | Out-Null
$fetch = "C:\Users\Monty\Documents\Enthusiest-ai\scripts\fetch-listing.ps1"

# Round 2 — high-risk: JDM performance imports + cheap V8 projects
$targets = @(
    @{ name="skyline-a";   url="https://www.trademe.co.nz/a/motors/cars/nissan/skyline/listing/5990748900" }
    @{ name="skyline-b";   url="https://www.trademe.co.nz/a/motors/cars/nissan/skyline/listing/5897039935" }
    @{ name="impreza-a";   url="https://www.trademe.co.nz/a/motors/cars/subaru/impreza/listing/5992716739" }
    @{ name="impreza-b";   url="https://www.trademe.co.nz/a/motors/cars/subaru/impreza/listing/5922437137" }
    @{ name="commodore-a"; url="https://www.trademe.co.nz/a/motors/cars/holden/commodore/listing/5899069792" }
    @{ name="commodore-b"; url="https://www.trademe.co.nz/a/motors/cars/holden/commodore/listing/5778210249" }
)

$summary = @()
$port = 9380
for ($i=0; $i -lt $targets.Count; $i++) {
    $t = $targets[$i]; $port++
    $id = "{0:D2}-{1}" -f ($i+1), $t.name
    Write-Output "`n=== [$id] fetching ==="
    $raw = & powershell -NoProfile -ExecutionPolicy Bypass -File $fetch -Url $t.url -Port $port 2>&1
    $jline = $raw | Where-Object { $_ -match '"bodyLen"' } | Select-Object -First 1
    if (-not $jline) { Write-Output "[$id] FETCH FAILED"; $summary += "[$id] FETCH FAILED"; continue }
    $page = $jline | ConvertFrom-Json
    $text = $page.body
    if ($text -match "withdrawn or has expired") { Write-Output "[$id] EXPIRED listing"; $summary += "[$id] EXPIRED"; continue }
    Write-Output "[$id] fetched '$($page.title)' bodyLen=$($page.bodyLen)"
    Set-Content -LiteralPath (Join-Path $OutDir "$id.source.txt") -Value $text -Encoding utf8

    $body = @{ pastedText = $text.Substring(0,[Math]::Min(15000,$text.Length)) } | ConvertTo-Json -Compress
    try {
        $r = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json" -Body $body -TimeoutSec 180
        $r | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutDir "$id.json") -Encoding utf8
        $v = $r.vehicle; $red = if ($r.redFlags) { $r.redFlags.Count } else { 0 }
        $line = "[$id] {0} {1} {2} | price='{3}' km='{4}' import='{5}' | label='{6}' vibe='{7}' | inv={8} vibe={9} | red=$red" -f `
            $v.year,$v.make,$v.model,$v.price,$v.mileage,$v.importStatus,$r.label,$r.ownerVibe.label,$r.investmentScore,$r.vibeScore
        Write-Output $line
        if ($red -gt 0) { $r.redFlags | ForEach-Object { Write-Output "      RED: $($_.flag)" } }
        $summary += $line
    } catch {
        Write-Output "[$id] ANALYZE ERROR: $($_.Exception.Message)"; $summary += "[$id] ANALYZE ERROR"
    }
}
Write-Output "`n===== SUMMARY ====="
$summary | ForEach-Object { Write-Output $_ }
Write-Output "`nDONE"
