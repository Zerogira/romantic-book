@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title Resetar foto e carta do livro

echo ===================================================
echo   Resetar a foto e a carta do livro (site publicado)
echo ===================================================

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado no sistema.
    pause
    exit /b 1
)

node scripts\registro.mjs reset
echo.
pause
