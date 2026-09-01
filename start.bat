@echo off
title KUROMI - Painel Web Control
cd /d "%~dp0"

echo ===============================================
echo      KUROMI - BOT OFICIAL DA CRINGELANDIA
echo ===============================================
echo.
echo [1/2] Registrando Slash Commands no Discord...
node src/registerSlashCommands.js
if errorlevel 1 (
    echo [ERRO] Falha ao registrar slash commands.
    pause
    exit /b 1
)

echo.
echo [2/2] Iniciando o Painel Web em http://localhost:3000 ...
echo Abrindo seu navegador...
start http://localhost:3000

echo.
echo Painel Web rodando! Mantenha esta janela aberta para manter o site no ar.
node server.js

pause
