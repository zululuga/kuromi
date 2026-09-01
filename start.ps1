$host.UI.RawUI.WindowTitle = "KUROMI Control Panel"

# Guarda o processo do bot em execução para monitorar o status da aplicação.
$script:BotProcess = $null

function ShowHeader {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "             KUROMI - DISCORD BOT             " -ForegroundColor Magenta
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
}

function ShowStatusLine($label, $value, $color) {
    Write-Host ("[" + $label + "] " + $value) -ForegroundColor $color
}

function GetBotNodeProcesses {
    $scriptRoot = $PSScriptRoot
    $pattern = [regex]::Escape((Join-Path $scriptRoot 'index.js'))

    return Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -eq 'node.exe' -and $_.CommandLine -match $pattern
        }
}

function RegisterSlashCommands {
    Write-Host "[INFO] Registrando comandos slash..." -ForegroundColor Cyan
    & node.exe "$PSScriptRoot\src\registerSlashCommands.js"

    if ($LASTEXITCODE -ne 0) {
        ShowStatusLine "ERROR" "Falha ao registrar slash commands." Red
    } else {
        ShowStatusLine "INFO" "Slash commands registrados." Green
    }

    Start-Sleep -Milliseconds 1200
}

function ShowPanel {
    $status = if ($script:BotProcess -and -not $script:BotProcess.HasExited) { "ONLINE" } else { "OFFLINE" }
    $color = if ($status -eq "ONLINE") { "Green" } else { "Red" }

    Write-Host ""
    Write-Host "+------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "|            PAINEL DE CONTROLE            |" -ForegroundColor DarkGray
    Write-Host "+------------------------------------------+" -ForegroundColor DarkGray
    Write-Host ("| STATUS: " + $status.PadRight(18) + " |") -ForegroundColor $color
    Write-Host "|                                          |" -ForegroundColor DarkGray
    Write-Host "| start | stop | register | quit           |" -ForegroundColor DarkGray
    Write-Host "+------------------------------------------+" -ForegroundColor DarkGray
    Write-Host ""
}

function ShowAsciiKuromi {
    # Arte ASCII inspirada em Kuromi, com tons rosa e preto para combinar com o visual do bot.
    Write-Host "                 ___" -ForegroundColor Magenta
    Write-Host "           .-""   ""-." -ForegroundColor Magenta
    Write-Host "          /  .-. .-.  \" -ForegroundColor Magenta
    Write-Host "         |  ( o o )  |" -ForegroundColor Magenta
    Write-Host "         |   `-^-'   |" -ForegroundColor Magenta
    Write-Host "          \  `-._.-' /" -ForegroundColor Magenta
    Write-Host "           `-._   _.-'" -ForegroundColor Magenta
    Write-Host "               `-`" -ForegroundColor Magenta
    Write-Host ""
}

function StartBot {
    # Evita duas instâncias rodando ao mesmo tempo.
    $nodeProcesses = GetBotNodeProcesses
    if ($nodeProcesses) {
        ShowStatusLine "INFO" "O bot ja esta online." Yellow
        $script:BotProcess = Get-Process -Id $nodeProcesses[0].ProcessId -ErrorAction SilentlyContinue
        return
    }

    # Inicia o processo do Node em segunda linha, mas sem abrir janela separada.
    $script:BotProcess = Start-Process -FilePath "node.exe" -ArgumentList "index.js" -WorkingDirectory $PSScriptRoot -PassThru -NoNewWindow
    ShowStatusLine "INFO" "Bot iniciando..." Cyan
    Start-Sleep -Milliseconds 1200
}

function StopBot {
    # Mata o processo principal do bot.
    $nodeProcesses = GetBotNodeProcesses

    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            try {
                Stop-Process -Id $process.ProcessId -Force
            } catch {}
        }
        ShowStatusLine "INFO" "Bot parado." Red
    } else {
        ShowStatusLine "INFO" "O bot ja esta offline." Yellow
    }

    $script:BotProcess = $null
    Start-Sleep -Milliseconds 600
}

while ($true) {
    Clear-Host
    ShowHeader
    ShowPanel
    ShowAsciiKuromi

    $status = if ($script:BotProcess -and -not $script:BotProcess.HasExited) { "ONLINE" } else { "OFFLINE" }
    $color = if ($status -eq "ONLINE") { "Green" } else { "Red" }
    ShowStatusLine "STATUS" $status $color
    Write-Host ""
    Write-Host "Digite uma opcao: start | stop | register | quit" -ForegroundColor Gray

    $op = (Read-Host "Opcao").Trim().ToLower()

    switch ($op) {
        "start" { StartBot }
        "stop" { StopBot }
        "register" { RegisterSlashCommands }
        "quit" {
            if ($script:BotProcess -and -not $script:BotProcess.HasExited) {
                StopBot
            } elseif (GetBotNodeProcesses) {
                StopBot
            }

            Write-Host ""
            Write-Host "Sistema encerrado." -ForegroundColor Yellow
            exit
        }
        default {
            ShowStatusLine "INFO" "Opcao invalida. Tente: start, stop, register, quit." Yellow
            Start-Sleep -Milliseconds 600
        }
    }
}
