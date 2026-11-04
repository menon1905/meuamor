@echo off
title Leitor de Livros 3D
cd /d "%~dp0leitor-livros-3d"
start "" http://localhost:3050
node server.js
pause
