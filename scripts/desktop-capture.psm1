# desktop-capture.psm1 — helpers to drive a chromeless Chrome --app window
# with the user's logged-in profile and capture window-cropped PNGs.
# Used for Vercel-auth-protected previews that headless Edge cannot reach.

Add-Type -AssemblyName System.Windows.Forms, System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinApi {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int w, int h, bool repaint);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }

    public static System.Collections.Generic.List<IntPtr> FindWindowsByTitle(string fragment) {
        var found = new System.Collections.Generic.List<IntPtr>();
        EnumWindows((h, l) => {
            if (!IsWindowVisible(h)) return true;
            var sb = new StringBuilder(512);
            GetWindowText(h, sb, 512);
            if (sb.ToString().Contains(fragment)) found.Add(h);
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
"@

[WinApi]::SetProcessDPIAware() | Out-Null

$script:Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"

function Open-AppWindow([string]$Url, [int]$Width = 1280, [int]$Height = 950) {
    & $script:Chrome "--app=$Url" "--window-size=$Width,$Height" | Out-Null
    Start-Sleep -Seconds 8
}

function Find-AppWindow([string]$TitleFragment = "Motormind") {
    $list = [WinApi]::FindWindowsByTitle($TitleFragment)
    if ($list.Count -eq 0) { return [IntPtr]::Zero }
    return $list[0]
}

function Set-AppWindowBounds([IntPtr]$Hwnd, [int]$X, [int]$Y, [int]$W, [int]$H) {
    [WinApi]::ShowWindow($Hwnd, 9) | Out-Null   # SW_RESTORE — un-maximize so MoveWindow takes effect
    Start-Sleep -Milliseconds 400
    [WinApi]::MoveWindow($Hwnd, $X, $Y, $W, $H, $true) | Out-Null
    Start-Sleep -Milliseconds 1100
}

function Get-WindowBounds([IntPtr]$Hwnd) {
    $r = New-Object WinApi+RECT
    [WinApi]::GetWindowRect($Hwnd, [ref]$r) | Out-Null
    return $r
}

# CropTop/CropBottom/CropRight strip chrome (app title bar, taskbar bleed,
# Vercel toolbar) in physical px. Capture happens against the live screen.
function Save-WindowShot([IntPtr]$Hwnd, [string]$Path, [int]$CropTop = 0, [int]$CropBottom = 0, [int]$CropRight = 0) {
    [WinApi]::SetForegroundWindow($Hwnd) | Out-Null
    Start-Sleep -Milliseconds 700
    $r = Get-WindowBounds $Hwnd
    $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
    $cw = $w - $CropRight; $ch = $h - $CropTop - $CropBottom
    if ($cw -le 0 -or $ch -le 0) { Write-Output "CROP too large"; return }
    $bmp = New-Object System.Drawing.Bitmap($cw, $ch)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($r.Left, ($r.Top + $CropTop), 0, 0, (New-Object System.Drawing.Size($cw, $ch)))
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("SHOT: {0} ({1}x{2}, {3}kb)" -f (Split-Path $Path -Leaf), $cw, $ch, [math]::Round((Get-Item $Path).Length / 1kb))
}

# Click at coordinates relative to the window's top-left (physical px)
function Send-WindowClick([IntPtr]$Hwnd, [int]$RelX, [int]$RelY) {
    [WinApi]::SetForegroundWindow($Hwnd) | Out-Null
    Start-Sleep -Milliseconds 400
    $r = Get-WindowBounds $Hwnd
    [WinApi]::SetCursorPos($r.Left + $RelX, $r.Top + $RelY) | Out-Null
    Start-Sleep -Milliseconds 200
    [WinApi]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # LEFTDOWN
    [WinApi]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # LEFTUP
    Start-Sleep -Milliseconds 400
}

function Send-KeysToWindow([IntPtr]$Hwnd, [string]$Keys) {
    [WinApi]::SetForegroundWindow($Hwnd) | Out-Null
    Start-Sleep -Milliseconds 400
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    Start-Sleep -Milliseconds 300
}

function Close-AppWindows([string]$TitleFragment = "Motormind") {
    foreach ($h in [WinApi]::FindWindowsByTitle($TitleFragment)) {
        [WinApi]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null  # WM_CLOSE
    }
}

Export-ModuleMember -Function * -Variable *
