@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title Conferir foto e carta do livro

echo ===================================================
echo   Conferir foto, carta e pagina trancada do livro
echo ===================================================

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no sistema.
    pause
    exit /b 1
)

node scripts\registro.mjs status
echo.
pause
