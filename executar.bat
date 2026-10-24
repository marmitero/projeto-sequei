@echo off
setlocal
title FitVida - teste local
cd /d "%~dp0"

echo ============================================
echo  FitVida - instalacao e inicio local
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado neste computador.
  echo Instale a versao 20 ou superior em: https://nodejs.org/
  echo Depois execute este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0projeto-sequei\package.json" (
  echo [ERRO] Pasta "projeto-sequei" nao encontrada ao lado deste arquivo.
  echo Extraia/clone o projeto completo e execute o executar.bat de dentro da pasta clonada.
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0projeto-sequei"

echo [1/3] Verificando dependencias do Node.js...
call npm install
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao instalar as dependencias. Verifique sua conexao com a internet.
  pause
  exit /b 1
)

echo.
echo [2/3] Preparando banco de dados, migracoes e build...
echo [3/3] Iniciando o servidor (Ctrl+C para encerrar)...
echo.

node scripts\iniciar-local.mjs
set EXITCODE=%errorlevel%

echo.
if not "%EXITCODE%"=="0" (
  echo [ERRO] Nao foi possivel iniciar o FitVida. Veja as mensagens acima.
) else (
  echo FitVida encerrado.
)
pause
exit /b %EXITCODE%
