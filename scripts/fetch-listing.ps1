# fetch-listing.ps1 — render a JS/SPA listing page in headless Edge via the
# DevTools protocol and print its visible text as JSON. A plain HTTP fetch of
# Trade Me returns an empty shell; this executes the page's JavaScript.
# Plumbing copied verbatim from the proven scripts/capture-ui.ps1.
param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$Port = 9377,
    [switch]$Links   # when set, return active /listing/ hrefs found on the page instead of body text
)
$ErrorActionPreference = "Stop"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
$profileDir = Join-Path $env:TEMP "edge-fetch-$Port"
$edgeArgs = @("--headless","--disable-gpu","--no-first-run","--remote-debugging-port=$Port",
    "--remote-allow-origins=*","--user-data-dir=$profileDir","--window-size=1280,2000","about:blank")
$proc = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru

$script:ws = $null
$script:msgId = 0
$ct = [System.Threading.CancellationToken]::None

function Connect-Cdp {
    $deadline = (Get-Date).AddSeconds(20); $target = $null
    while ((Get-Date) -lt $deadline -and -not $target) {
        try { $target = (Invoke-RestMethod "http://127.0.0.1:$Port/json/list") | Where-Object { $_.type -eq "page" } | Select-Object -First 1 }
        catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $target) { throw "No CDP page target on port $Port" }
    $script:ws = New-Object System.Net.WebSockets.ClientWebSocket
    $script:ws.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(20)
    $t = $script:ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, $ct)
    if (-not $t.Wait(15000)) { throw "WS connect timeout" }
}
function Send-CdpRaw([string]$json) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $seg = New-Object "System.ArraySegment[byte]" -ArgumentList @(, $bytes)
    $t = $script:ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct)
    if (-not $t.Wait(15000)) { throw "WS send timeout" }
}
function Receive-CdpRaw([int]$timeoutMs = 60000) {
    $buffer = New-Object byte[] 262144
    $seg = New-Object "System.ArraySegment[byte]" -ArgumentList @(, $buffer)
    $ms = New-Object IO.MemoryStream
    do {
        $t = $script:ws.ReceiveAsync($seg, $ct)
        if (-not $t.Wait($timeoutMs)) { throw "WS receive timeout" }
        $r = $t.GetAwaiter().GetResult()
        $ms.Write($buffer, 0, $r.Count)
    } while (-not $r.EndOfMessage)
    [Text.Encoding]::UTF8.GetString($ms.ToArray())
}
function Invoke-Cdp([string]$method, [hashtable]$params = @{}, [int]$timeoutMs = 60000) {
    $script:msgId++; $id = $script:msgId
    $payload = @{ id = $id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
    Send-CdpRaw $payload
    while ($true) {
        $raw = Receive-CdpRaw $timeoutMs
        if ($raw -match "^\{`"id`":$id,") { return $raw }
        if ($raw.Length -lt 4096) { $o = $raw | ConvertFrom-Json; if ($o.id -eq $id) { return $raw } }
    }
}
function Invoke-Js([string]$expression, [int]$timeoutMs = 60000) {
    $raw = Invoke-Cdp "Runtime.evaluate" @{ expression = $expression; returnByValue = $true; awaitPromise = $true } $timeoutMs
    $o = $raw | ConvertFrom-Json
    if ($o.result.exceptionDetails) { throw "JS error: $($o.result.exceptionDetails.text)" }
    return $o.result.result.value
}

try {
    Connect-Cdp
    Invoke-Cdp "Page.enable" | Out-Null
    Invoke-Cdp "Page.navigate" @{ url = $Url } | Out-Null
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 700
        $len = 0; try { $len = [int](Invoke-Js "document.body ? document.body.innerText.length : 0") } catch {}
        if ($len -gt 800) { break }
    }
    Start-Sleep -Seconds 2
    if ($Links) {
        $hrefs = Invoke-Js "JSON.stringify([...new Set([...document.querySelectorAll(`"a[href*='/listing/']`")].map(a=>a.href))])"
        Write-Output $hrefs
    } else {
        $title = Invoke-Js "document.title || ''"
        $body  = Invoke-Js "document.body ? document.body.innerText : ''"
        [pscustomobject]@{ title = $title; bodyLen = $body.Length; body = $body } | ConvertTo-Json -Depth 4 -Compress
    }
}
finally {
    if ($script:ws) { try { $script:ws.Dispose() } catch {} }
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
}
