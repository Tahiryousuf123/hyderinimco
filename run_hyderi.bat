@echo off
title New Hyderi Nimco ^& Frozen - Server ^& Cloudflare Tunnel
echo ========================================================
echo   NEW HYDERI NIMCO ^& FROZEN (Serving Fresh Since 1970)
echo   North Nazimabad, Karachi
echo ========================================================
echo.

echo [1/2] Checking if Hyderi Node.js backend is running on port 5000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok = try { (Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/whatsapp/health' -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch { $false }; if ($ok) { exit 0 } else { exit 1 }"
if %errorlevel% equ 0 (
    echo [Status] Hyderi backend is ALREADY active and responding on http://127.0.0.1:5000.
    echo          Skipping duplicate server startup to prevent port conflicts.
) else (
    echo [Status] Launching Node.js Backend on http://localhost:5000 ...
    start "Hyderi Nimco Server" cmd /k "node server/server.js"
    echo Waiting 2 seconds for server initialization...
    timeout /t 2 /nobreak >nul
)

echo.
echo [2/2] Launching Cloudflare Tunnel on http://127.0.0.1:5000 ...
if exist "%~dp0cloudflared.exe" (
    "%~dp0cloudflared.exe" tunnel --url http://127.0.0.1:5000
) else (
    echo [Notice] cloudflared.exe not found in workspace directory.
)
pause
