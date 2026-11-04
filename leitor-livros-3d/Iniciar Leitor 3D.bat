@echo off
title Leitor de Livros 3D
echo ========================================================
echo       Iniciando o Leitor de Livros 3D Imersivo...
echo ========================================================
echo.
cd /d "%~dp0"
start "" http://localhost:3050
node server.js
pause
