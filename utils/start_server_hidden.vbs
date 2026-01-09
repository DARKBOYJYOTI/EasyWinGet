Set objShell = CreateObject("Shell.Application")
' Launch server_runner.bat as Administrator (runas) and Hidden (0)
objShell.ShellExecute "C:\EasyWinGet\utils\server_runner.bat", "", "C:\EasyWinGet", "runas", 0
