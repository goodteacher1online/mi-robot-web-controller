Set oShell = CreateObject("WScript.Shell")
strCommand = "powershell -WindowStyle Hidden -Command ""$c = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet; if (-not $c) { Start-Process python -ArgumentList 'serve.py' -WorkingDirectory 'C:\Users\user\mi-robot-web-controller' -WindowStyle Hidden; Start-Sleep -Milliseconds 800 }; Start-Process 'http://localhost:8000/index.html'"""
oShell.Run strCommand, 0, False
