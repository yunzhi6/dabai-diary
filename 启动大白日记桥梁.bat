@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动大白日记桥梁...
start "" http://127.0.0.1:4190
node bridge.js
pause
