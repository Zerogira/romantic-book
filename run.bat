@echo off
setlocal
cd /d "%~dp0"

title Livro de Aniversario - Dev Server

echo ===================================================
echo           Livro Digital de Aniversario
echo ===================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no sistema.
    echo Instale o Node.js em https://nodejs.org antes de continuar.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Pasta node_modules nao encontrada.
    echo Instalando dependencias do projeto via npm install...
    echo.
    call npm install
)

echo [INFO] Iniciando servidor de desenvolvimento...
echo [INFO] Pressione Ctrl+C para encerrar o servidor.
echo.

call npm run dev -- --open

pause
