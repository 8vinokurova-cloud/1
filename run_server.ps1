$nodeDir = "$env:USERPROFILE\.gemini\antigravity\bin\nodejs"
$env:PATH = "$nodeDir;$env:PATH"
& "$nodeDir\node.exe" server.js
