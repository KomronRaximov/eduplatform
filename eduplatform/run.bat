@echo off
setlocal EnableExtensions
chcp 65001 >nul
title AdaptEdu Launcher

cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "DATABASE_FILE=%~dp0backend\prisma\dev.db"
set "NEW_DATABASE=0"
set "BACKEND_RUNNING=0"
set "FRONTEND_RUNNING=0"

echo.
echo =====================================================
echo              AdaptEdu ishga tushirilmoqda
echo =====================================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 goto :node_missing

where npm.cmd >nul 2>&1
if errorlevel 1 goto :node_missing

if not exist "%BACKEND_DIR%\package.json" goto :invalid_project
if not exist "%FRONTEND_DIR%\package.json" goto :invalid_project

echo [1/6] Muhit fayllari tekshirilmoqda...
if not exist "%BACKEND_DIR%\.env" (
  copy /Y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
  echo       backend\.env yaratildi.
)
if not exist "%FRONTEND_DIR%\.env.local" (
  copy /Y "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env.local" >nul
  echo       frontend\.env.local yaratildi.
)

echo [2/6] Backend dependency'lari tekshirilmoqda...
if not exist "%BACKEND_DIR%\node_modules" (
  pushd "%BACKEND_DIR%"
  call npm.cmd install
  if errorlevel 1 (
    popd
    goto :install_failed
  )
  popd
) else (
  echo       Tayyor.
)

echo [3/6] Frontend dependency'lari tekshirilmoqda...
if not exist "%FRONTEND_DIR%\node_modules" (
  pushd "%FRONTEND_DIR%"
  call npm.cmd install
  if errorlevel 1 (
    popd
    goto :install_failed
  )
  popd
) else (
  echo       Tayyor.
)

if not exist "%DATABASE_FILE%" set "NEW_DATABASE=1"

powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3001/api/docs' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 set "BACKEND_RUNNING=1"

powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/login' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 set "FRONTEND_RUNNING=1"

echo [4/6] SQLite bazasi tayyorlanmoqda...
if "%BACKEND_RUNNING%"=="1" (
  echo       Backend ishlayapti. Prisma bosqichi o'tkazib yuborildi.
) else (
  pushd "%BACKEND_DIR%"
  call npm.cmd run prisma:generate
  if errorlevel 1 (
    popd
    goto :database_failed
  )

  call .\node_modules\.bin\prisma.cmd migrate deploy
  if errorlevel 1 (
    popd
    goto :database_failed
  )

  if "%NEW_DATABASE%"=="1" (
    echo       Yangi baza aniqlandi. Demo ma'lumotlar yozilmoqda...
    call npm.cmd run prisma:seed
    if errorlevel 1 (
      popd
      goto :database_failed
    )
  ) else (
    echo       Mavjud ma'lumotlar saqlab qolindi.
  )
  popd
)

echo [5/6] Backend va frontend serverlari ishga tushirilmoqda...
if "%BACKEND_RUNNING%"=="0" (
  start "AdaptEdu Backend" /D "%BACKEND_DIR%" cmd.exe /k "npm.cmd run start:dev"
) else (
  echo       3001-port band: backend allaqachon ishlayapti deb qabul qilindi.
)

if "%FRONTEND_RUNNING%"=="0" (
  start "AdaptEdu Frontend" /D "%FRONTEND_DIR%" cmd.exe /k "npm.cmd run dev -- -p 3000"
) else (
  echo       3000-port band: frontend allaqachon ishlayapti deb qabul qilindi.
)

echo [6/6] Frontend tayyor bo'lishi kutilmoqda...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(90); do { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/login' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 goto :server_failed

echo.
echo AdaptEdu muvaffaqiyatli ishga tushdi!
echo Sayt: http://localhost:3000
echo API:  http://localhost:3001/api
echo.
if /I "%~1"=="--no-browser" exit /b 0
start "" "http://localhost:3000"
exit /b 0

:node_missing
echo [XATO] Node.js yoki npm topilmadi.
echo Node.js LTS versiyasini https://nodejs.org saytidan o'rnating.
goto :failed

:invalid_project
echo [XATO] backend yoki frontend papkasi topilmadi.
echo run.bat fayli loyiha bosh papkasida turishi kerak.
goto :failed

:install_failed
echo [XATO] Dependency'larni o'rnatib bo'lmadi.
echo Internet aloqasini tekshiring va qayta urinib ko'ring.
goto :failed

:database_failed
echo [XATO] Prisma yoki SQLite bazasini tayyorlab bo'lmadi.
goto :failed

:server_failed
echo [XATO] Frontend 90 soniya ichida javob bermadi.
echo Ochilgan Backend va Frontend oynalaridagi xatolarni tekshiring.

:failed
echo.
pause
exit /b 1
