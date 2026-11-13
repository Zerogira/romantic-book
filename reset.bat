@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title Resetar os testes do livro (modo local)

echo ===================================================
echo   Resetar os testes do livro (somente neste computador)
echo ===================================================
echo.
echo Isto apaga, no servidor de teste local:
echo   - a foto do registro do dia
echo   - a carta de resposta
echo   - as assinaturas da cartinha (Abb e Obb)
echo E faz o navegador esquecer o que ele guardou:
echo   - copias locais da foto, carta e assinaturas
echo   - o envelope/cartao da surpresa (volta a "ainda nao aberto")
echo   - rascunho da carta e outros avisos
echo.
echo NAO mexe no site publicado, nas paginas, nas fotos do album
echo nem nas figurinhas. Para zerar o site publicado, use
echo resetar-registro.bat.
echo.

rem Apaga os arquivos de teste do servidor local (fora do git)
if exist ".dev-registro" rmdir /s /q ".dev-registro"
mkdir ".dev-registro"
if errorlevel 1 (
    echo [ERRO] Nao consegui recriar a pasta .dev-registro.
    pause
    exit /b 1
)

rem Novo "token": ao recarregar a pagina, o navegador apaga as copias locais
echo %RANDOM%-%RANDOM%-%TIME%> ".dev-registro\reset-token"

echo [OK] Servidor de teste zerado.
echo.
echo Agora RECARREGUE a pagina do livro no navegador (F5).
echo Se o servidor (run.bat) estiver fechado, abra-o antes de testar.
echo.
pause
