@echo off
setlocal

set "XAMPP_ROOT=C:\xampp"
set "PROJECT_DIR=C:\Users\PC\Desktop\drive_sheopals"
set "APP_PORT=3000"
set "NODE_ENV=production"

if not exist "%XAMPP_ROOT%\apache\bin\httpd.exe" (
    echo Apache not found at %XAMPP_ROOT%\apache\bin\httpd.exe
    pause
    exit /b 1
)

if not exist "%XAMPP_ROOT%\mysql\bin\mysqld.exe" (
    echo MySQL not found at %XAMPP_ROOT%\mysql\bin\mysqld.exe
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\package.json" (
    echo Project not found at %PROJECT_DIR%
    pause
    exit /b 1
)

for %%P in (httpd.exe mysqld.exe node.exe) do (
    tasklist /FI "IMAGENAME eq %%P" | find /I "%%P" >nul
    if not errorlevel 1 (
        echo %%P is already running.
    )
)

tasklist /FI "IMAGENAME eq httpd.exe" | find /I "httpd.exe" >nul
if errorlevel 1 (
    echo Starting Apache...
    start "Apache" /MIN cmd /c "cd /d %XAMPP_ROOT% && apache\bin\httpd.exe -d C:/xampp/apache"
) else (
    echo Apache already running.
)

tasklist /FI "IMAGENAME eq mysqld.exe" | find /I "mysqld.exe" >nul
if errorlevel 1 (
    echo Starting MySQL...
    start "MySQL" /MIN cmd /c "cd /d %XAMPP_ROOT% && mysql\bin\mysqld.exe --defaults-file=mysql\bin\my.ini --standalone"
) else (
    echo MySQL already running.
)

tasklist /FI "IMAGENAME eq node.exe" /V | find /I "%PROJECT_DIR%" >nul
if errorlevel 1 (
    echo Starting Next.js app on port %APP_PORT%...
    start "Drive Next.js" /MIN cmd /c "cd /d %PROJECT_DIR% && set PORT=%APP_PORT% && set NODE_ENV=%NODE_ENV% && npm.cmd run start"
) else (
    echo A node.exe process for this project appears to already be running.
)

echo.
echo Startup commands sent.
echo Apache: http://localhost/
echo Drive:   https://drive.sheopalscrm.in/
endlocal
