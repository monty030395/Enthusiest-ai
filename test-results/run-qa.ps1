# run-qa.ps1 — drive the live /api/analyze endpoint with each test listing
# and save the raw JSON + a quick summary for auditing the prompt.
param(
    [string]$Endpoint = "https://www.motormind.nz/api/analyze",
    [string]$Source   = "C:\Users\Monty\Documents\Trade me car examples.txt",
    [string]$OutDir   = "C:\Users\Monty\Documents\Enthusiest-ai\test-results"
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $OutDir | Out-Null

# Split the file on lines that are just "--"
$raw = Get-Content -Raw -LiteralPath $Source
$chunks = [regex]::Split($raw, "(?m)^\s*--\s*$") | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 30 }
Write-Output "Parsed $($chunks.Count) listings"

$names = @("bmw-130i","mazda-rx7","holden-kingswood","mazda-axela-dealer","mercedes-c200","alfa-gta","vw-golf-rline","aston-db9")

$summary = @()
for ($i = 0; $i -lt $chunks.Count; $i++) {
    $name = if ($i -lt $names.Count) { $names[$i] } else { "listing-$($i+1)" }
    $id = "{0:D2}-{1}" -f ($i+1), $name
    Write-Output "`n=== [$id] sending ($($chunks[$i].Length) chars) ==="
    $body = @{ pastedText = $chunks[$i] } | ConvertTo-Json -Compress
    $t0 = Get-Date
    try {
        $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json" -Body $body -TimeoutSec 180
        $secs = [math]::Round(((Get-Date)-$t0).TotalSeconds,1)
        $resp | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutDir "$id.json") -Encoding utf8
        $v = $resp.vehicle
        $redCount = if ($resp.redFlags) { $resp.redFlags.Count } else { 0 }
        $line = "[$id] ${secs}s | {0} {1} {2} | price='{3}' km='{4}' import='{5}' | label='{6}' ownerVibe='{7}' | inv={8} vibe={9} | redFlags=$redCount" -f `
            $v.year,$v.make,$v.model,$v.price,$v.mileage,$v.importStatus,$resp.label,$resp.ownerVibe.label,$resp.investmentScore,$resp.vibeScore
        Write-Output $line
        if ($redCount -gt 0) { $resp.redFlags | ForEach-Object { Write-Output ("      RED: {0}" -f $_.flag) } }
        $summary += $line
    } catch {
        $secs = [math]::Round(((Get-Date)-$t0).TotalSeconds,1)
        $msg = "[$id] ${secs}s ERROR: $($_.Exception.Message)"
        Write-Output $msg
        $summary += $msg
        $_.Exception.Message | Set-Content -LiteralPath (Join-Path $OutDir "$id.ERROR.txt")
    }
}
Write-Output "`n===== SUMMARY ====="
$summary | ForEach-Object { Write-Output $_ }
Write-Output "`nDONE"
