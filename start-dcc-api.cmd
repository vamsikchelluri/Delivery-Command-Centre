@echo off
cd /d "C:\Users\vamsi\Documents\Codex\2026-04-23-files-mentioned-by-the-user-dcc\api"
echo Starting DCC API from %CD% > "..\api-launcher.log"
"C:\Program Files\nodejs\node.exe" "src\server.js" >> "..\api-launcher.log" 2>> "..\api-launcher.err.log"
