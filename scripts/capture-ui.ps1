# capture-ui.ps1 — drive headless Edge via the DevTools protocol and
# screenshot every major UI state of the app (landing, tabs, smart-paste
# hint, loading, full results, privacy) at desktop and mobile sizes.
#
# Usage:
#   powershell -File scripts\capture-ui.ps1 -BaseUrl "https://www.motormind.nz" -OutDir "screenshots\before"
#
# Needs no Node and no extensions — only the Edge that ships with Windows.

param(
    [Parameter(Mandatory = $true)][string]$BaseUrl,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [int]$Port = 9333,
    [switch]$SkipAnalysis
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$OutDir = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutDir))
New-Item -ItemType Directory -Force $OutDir | Out-Null

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
$profileDir = Join-Path $env:TEMP "edge-cdp-capture"

$edgeArgs = @(
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--remote-debugging-port=$Port",
    "--remote-allow-origins=*",
    "--user-data-dir=$profileDir",
    "--window-size=1280,900",
    "about:blank"
)
$proc = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru
Write-Output "Edge PID: $($proc.Id)"

# ── CDP plumbing ─────────────────────────────────────────────────────────
$script:ws = $null
$script:msgId = 0
$ct = [System.Threading.CancellationToken]::None

function Connect-Cdp {
    $deadline = (Get-Date).AddSeconds(20)
    $target = $null
    while ((Get-Date) -lt $deadline -and -not $target) {
        try {
            $targets = Invoke-RestMethod "http://127.0.0.1:$Port/json/list"
            $target = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $target) { throw "No CDP page target found on port $Port" }
    $script:ws = New-Object System.Net.WebSockets.ClientWebSocket
    $script:ws.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(20)
    $task = $script:ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, $ct)
    if (-not $task.Wait(15000)) { throw "WS connect timeout" }
    Write-Output "CDP connected: $($target.webSocketDebuggerUrl)"
}

function Send-CdpRaw([string]$json) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $seg = New-Object "System.ArraySegment[byte]" -ArgumentList @(, $bytes)
    $task = $script:ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct)
    if (-not $task.Wait(15000)) { throw "WS send timeout" }
}

function Receive-CdpRaw([int]$timeoutMs = 60000) {
    $buffer = New-Object byte[] 262144
    $seg = New-Object "System.ArraySegment[byte]" -ArgumentList @(, $buffer)
    $ms = New-Object IO.MemoryStream
    do {
        $task = $script:ws.ReceiveAsync($seg, $ct)
        if (-not $task.Wait($timeoutMs)) { throw "WS receive timeout after ${timeoutMs}ms" }
        $result = $task.GetAwaiter().GetResult()
        $ms.Write($buffer, 0, $result.Count)
    } while (-not $result.EndOfMessage)
    [Text.Encoding]::UTF8.GetString($ms.ToArray())
}

function Invoke-Cdp([string]$method, [hashtable]$params = @{}, [int]$timeoutMs = 60000) {
    $script:msgId++
    $id = $script:msgId
    $payload = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
    Send-CdpRaw $payload
    while ($true) {
        $raw = Receive-CdpRaw $timeoutMs
        # Match plain responses by id without a full JSON parse (raw can be MBs for screenshots)
        if ($raw -match "^\{`"id`":$id,") { return $raw }
        if ($raw.Length -lt 4096) {
            $obj = $raw | ConvertFrom-Json
            if ($obj.id -eq $id) { return $raw }
        }
    }
}

function Invoke-Js([string]$expression, [int]$timeoutMs = 60000) {
    $raw = Invoke-Cdp "Runtime.evaluate" @{ expression = $expression; returnByValue = $true; awaitPromise = $true } $timeoutMs
    $obj = $raw | ConvertFrom-Json
    if ($obj.result.exceptionDetails) { throw "JS error: $($obj.result.exceptionDetails.text)" }
    return $obj.result.result.value
}

function Save-Shot([string]$name, [bool]$fullPage = $false) {
    $params = @{ format = "png" }
    if ($fullPage) { $params.captureBeyondViewport = $true }
    $raw = Invoke-Cdp "Page.captureScreenshot" $params 120000
    $m = [regex]::Match($raw, '"data":"([^"]+)"')
    if (-not $m.Success) { throw "No screenshot data in CDP response for $name" }
    $path = Join-Path $OutDir $name
    [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($m.Groups[1].Value))
    Write-Output "SHOT: $name ($([math]::Round((Get-Item $path).Length / 1kb))kb)"
}

function Set-Viewport([int]$w, [int]$h, [bool]$mobile = $false) {
    $scale = 1; if ($mobile) { $scale = 2 }
    Invoke-Cdp "Emulation.setDeviceMetricsOverride" @{ width = $w; height = $h; deviceScaleFactor = $scale; mobile = $mobile } | Out-Null
}

function Open-Page([string]$url) {
    Invoke-Cdp "Page.navigate" @{ url = $url } | Out-Null
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        if ((Invoke-Js "document.readyState") -eq "complete") { break }
    }
    Start-Sleep -Seconds 2   # settle fonts/transitions
}

# Dispatch a real ClipboardEvent so the app's smart-paste onPaste handler runs.
function Send-Paste([string]$text) {
    $escaped = $text -replace '\\', '\\\\' -replace "'", "\'" -replace "`r`n", '\n' -replace "`n", '\n'
    $js = @"
(() => {
  const ta = document.querySelector('textarea');
  if (!ta) return 'NO_TEXTAREA';
  ta.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', '$escaped');
  const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
  ta.dispatchEvent(ev);
  return 'PASTED';
})()
"@
    return Invoke-Js $js
}

$listing = "2003 BMW M3 E46 Coupe - 3.2 S54 Manual. Asking 32,500. 148,000km, NZ new, Carbon Black over black leather. " +
    "Owned 8 years, full service history with BMW specialist in Christchurch. Vanos rebuilt at 130k with receipts, " +
    "rod bearings done 135k, clutch at 140k. Inspection welcome, no test pilots. Genuine enthusiast owned car, " +
    "always garaged, never tracked. New WOF and rego. Selling only due to growing family. No swaps. " +
    "Recent tyres all round, brakes 70 percent. Original books, two keys, factory toolkit all present."

try {
    Connect-Cdp
    Invoke-Cdp "Page.enable" | Out-Null

    # ── Desktop pass ────────────────────────────────────────────────
    Set-Viewport 1280 900
    Open-Page "$BaseUrl/"
    Save-Shot "01-landing-desktop.png"

    # Screenshots tab
    Invoke-Js "[...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'screenshots')?.click(); 'ok'" | Out-Null
    Start-Sleep -Milliseconds 600
    Save-Shot "02-screenshots-tab-desktop.png"
    Invoke-Js "[...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'paste text')?.click(); 'ok'" | Out-Null
    Start-Sleep -Milliseconds 400

    # Smart-paste Trade Me URL hint
    $r = Send-Paste "https://www.trademe.co.nz/a/motors/cars/bmw/m3/listing/5012345678"
    Write-Output "URL paste: $r"
    Start-Sleep -Milliseconds 800
    Save-Shot "03-url-hint-desktop.png"

    if (-not $SkipAnalysis) {
        # Smart-paste listing text -> auto analysis
        Open-Page "$BaseUrl/"   # clean slate
        $r = Send-Paste $listing
        Write-Output "Listing paste: $r"
        Start-Sleep -Seconds 2
        $loading = Invoke-Js "document.body.innerText.includes('Getting Under the Hood')"
        Write-Output "Loading state visible: $loading"
        if (-not $loading) {
            # Fallback: set value natively and click the analyse button
            Write-Output "Falling back to button click"
            Invoke-Js @"
(() => {
  const ta = document.querySelector('textarea');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, '$($listing -replace "'", "\'")');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'SET';
})()
"@ | Out-Null
            Start-Sleep -Milliseconds 400
            Invoke-Js "[...document.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('analyse listing'))?.click(); 'clicked'" | Out-Null
            Start-Sleep -Seconds 2
        }
        Save-Shot "04-loading-desktop.png"

        # Wait for results (analysis takes 30-90s)
        $deadline = (Get-Date).AddSeconds(180)
        $done = $false
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Seconds 5
            $done = Invoke-Js "!!document.body.innerText.match(/Analyse Another Listing/i)"
            if ($done) { break }
            $err = Invoke-Js "!!document.body.innerText.match(/Network error|Analysis failed|Something went wrong/i)"
            if ($err) { Write-Output "WARN: error banner appeared"; break }
        }
        Write-Output "Results rendered: $done"
        Start-Sleep -Seconds 2
        Save-Shot "05-results-full-desktop.png" $true
        Invoke-Js "window.scrollTo(0, 0); 'ok'" | Out-Null
        Start-Sleep -Milliseconds 500
        Save-Shot "06-results-hero-desktop.png"

        # ── Mobile pass on same rendered results (no second API call) ──
        Set-Viewport 390 844 $true
        Start-Sleep -Milliseconds 800
        Save-Shot "07-results-full-mobile.png" $true
    }

    # Mobile landing + privacy
    Set-Viewport 390 844 $true
    Open-Page "$BaseUrl/"
    Save-Shot "08-landing-mobile.png"

    Open-Page "$BaseUrl/privacy"
    Save-Shot "09-privacy-mobile.png" $true
    Set-Viewport 1280 900
    Start-Sleep -Milliseconds 600
    Save-Shot "10-privacy-desktop.png" $true

    Write-Output "DONE: $((Get-ChildItem $OutDir -Filter *.png).Count) screenshots in $OutDir"
}
finally {
    if ($script:ws) { try { $script:ws.Dispose() } catch {} }
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
}
