const express = require('express');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { setWelcomeChannel, getWelcomeChannel, normalizeChannelValue, getEconomyConfig, setEconomyConfig } = require('./src/services/database');
const { addLog: savePersistentLog, getLogs, getStats, updateStats, resetStats, clearLogs, flushSync } = require('./src/services/logging');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const appRoot = __dirname;

let botProcess = null;
let botLogs = [];
let botStartTime = null;

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  botLogs.push(`[${timestamp}] ${message}`);
  savePersistentLog(message);

  if (botLogs.length > 200) {
    botLogs = botLogs.slice(-200);
  }
}

function getBotStatus() {
  const running = !!botProcess && !botProcess.killed && botProcess.exitCode === null;
  const stats = getStats();
  const uptime = botStartTime ? Date.now() - botStartTime : 0;

  return {
    running,
    pid: botProcess ? botProcess.pid : null,
    logs: botLogs.slice(-50),
    welcomeChannelId: getWelcomeChannel('global') || null,
    uptime,
    stats,
  };
}

function startBot() {
  if (botProcess && !botProcess.killed && botProcess.exitCode === null) {
    return { running: true, message: 'O bot já está em execução.' };
  }

  botStartTime = Date.now();
  addLog('Iniciando bot Kuromiga...');
  addLog('Iniciando bot Pyxie...');
  botProcess = spawn('node', ['--max-old-space-size=192', 'index.js'], {
    cwd: appRoot,
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  });

  botProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    text.split(/\r?\n/).filter(Boolean).forEach((line) => addLog(line));
  });

  botProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    text.split(/\r?\n/).filter(Boolean).forEach((line) => addLog(line));
  });

  botProcess.on('exit', (code, signal) => {
    addLog(`Bot encerrado com code=${code} signal=${signal ?? 'none'}`);
    botStartTime = null;
    botProcess = null;
  });

  return { running: true, message: 'Bot iniciado com sucesso.' };
}

async function stopBot() {
  if (!botProcess || botProcess.killed || botProcess.exitCode !== null) {
    botProcess = null;
    botStartTime = null;
    return { running: false, message: 'O bot já está offline.' };
  }

  addLog('Encerrando bot Kuromiga...');
  addLog('Encerrando bot Pyxie...');
  botProcess.kill('SIGTERM');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (botProcess && !botProcess.killed) {
        botProcess.kill('SIGKILL');
      }
      botProcess = null;
      botStartTime = null;
      resolve({ running: false, message: 'Bot parado com sucesso.' });
    }, 3000);

    botProcess.once('exit', () => {
      clearTimeout(timeout);
      botProcess = null;
      botStartTime = null;
      resolve({ running: false, message: 'Bot parado com sucesso.' });
    });
  });
}

async function restartBot() {
  await stopBot();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return startBot();
}

function registerSlashCommands() {
  return new Promise((resolve, reject) => {
    execFile('node', ['src/registerSlashCommands.js'], { cwd: appRoot }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join('\n').trim();

      if (error) {
        addLog(`Registro falhou: ${error.message}`);
        resolve({ ok: false, output: output || error.message });
        return;
      }

      addLog('Slash commands registrados com sucesso.');
      resolve({ ok: true, output: output || 'Registro concluído.' });
    });
  });
}

const { processPostback } = require('./src/services/lootlabs');

function requireAdminAuth(req, res, next) {
  const secret = process.env.API_SECRET_TOKEN || process.env.PANEL_SECRET;
  if (!secret) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || req.headers['x-api-key']);

  if (token !== secret) {
    return res.status(401).json({ error: 'Acesso administrativo não autorizado.' });
  }

  next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// 1. Healthcheck e status público
app.get('/api/status', (req, res) => {
  res.json(getBotStatus());
});

// 2. Webhook / Postback do LootLabs (Recompensas Diárias)
app.all('/api/lootlabs/postback', (req, res) => {
  const payload = {
    userId: req.query.userId || req.query.user_id || req.body?.userId || req.body?.user_id,
    puid: req.query.puid || req.body?.puid,
    txId: req.query.txId || req.query.tx_id || req.query.p || req.body?.txId || req.body?.tx_id || req.body?.p,
    taskId: req.query.taskId || req.query.task_id || req.body?.taskId || req.body?.task_id,
    ip: req.ip,
  };

  const result = processPostback(payload);
  addLog(`[LootLabs Postback] uid=${payload.puid || payload.userId} tx=${result.txId} success=${result.success}`);
  return res.status(200).json({ status: 'success', data: result });
});

// 2.1 Página de Destino do LootLabs (Bônus Concluído)
app.get('/bonus-concluido', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bônus Confirmado! ✨ Pyxie Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: radial-gradient(circle at top, #1e1035 0%, #0d0914 100%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(230, 0, 103, 0.3);
      border-radius: 20px;
      padding: 40px 30px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(230, 0, 103, 0.2);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    h1 {
      color: #ff60a8;
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    p {
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #e60067, #a855f7);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(230, 0, 103, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(230, 0, 103, 0.6);
    }
    .footer {
      margin-top: 25px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎁✨</div>
    <h1>Missão Concluída!</h1>
    <p>Obrigado por apoiar a <strong>Pyxie</strong>! Suas moedinhas e recompensas já foram validadas e creditadas na sua carteira do Discord.</p>
    <a href="https://discord.com/channels/@me" class="btn">Voltar ao Discord</a>
    <div class="footer">Pyxie • Bot Oficial de Entretenimento & RPG</div>
  </div>
</body>
</html>`);
});

// 3. Rotas administrativas protegidas
app.post('/api/start', requireAdminAuth, (req, res) => {
  res.json(startBot());
});

app.post('/api/stop', requireAdminAuth, async (req, res) => {
  const result = await stopBot();
  res.json(result);
});

app.post('/api/restart', requireAdminAuth, async (req, res) => {
  const result = await restartBot();
  res.json(result);
});

app.post('/api/register', requireAdminAuth, async (req, res) => {
  const response = await registerSlashCommands();
  res.json(response);
});

app.get('/api/config', requireAdminAuth, (req, res) => {
  res.json({
    welcomeChannelId: getWelcomeChannel('global') || null,
    economy: getEconomyConfig(),
  });
});

app.post('/api/config/welcome-channel', requireAdminAuth, (req, res) => {
  const { channelId } = req.body || {};
  const normalized = String(channelId || '').trim();
  const result = setWelcomeChannel('global', normalized);
  res.json({ success: true, welcomeChannelId: result });
});

app.post('/api/config/economy', requireAdminAuth, (req, res) => {
  const minimum = Number(req.body?.minimum);
  const maximum = Number(req.body?.maximum);

  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || maximum < minimum) {
    return res.status(400).json({ success: false, message: 'Informe valores inteiros válidos.' });
  }

  res.json({ success: true, economy: setEconomyConfig(minimum, maximum) });
});

app.get('/api/logs', requireAdminAuth, (req, res) => {
  const limit = parseInt(req.query.limit || '100', 10);
  res.json({ logs: getLogs(limit) });
});

app.get('/api/stats', (req, res) => {
  const stats = getStats();
  const uptime = botStartTime ? Date.now() - botStartTime : 0;
  res.json({ ...stats, uptime });
});

app.post('/api/stats/reset', requireAdminAuth, (req, res) => {
  const newStats = resetStats();
  res.json({ success: true, stats: newStats });
});

app.post('/api/logs/clear', requireAdminAuth, (req, res) => {
  clearLogs();
  res.json({ success: true, message: 'Logs limpos com sucesso.' });
});

app.post('/api/embed/send', requireAdminAuth, (req, res) => {
  const { channelId, title, description, color, fields } = req.body || {};
  
  if (!botProcess || botProcess.killed || botProcess.exitCode !== null) {
    return res.status(400).json({ success: false, message: 'Bot não está online.' });
  }
  
  if (!channelId || !title) {
    return res.status(400).json({ success: false, message: 'channelId e title são obrigatórios.' });
  }

  const normalizedChannelId = normalizeChannelValue(channelId);

  const message = JSON.stringify({ type: 'SEND_EMBED', channelId: normalizedChannelId, title, description, color, fields: fields || [] });
  botProcess.stdin?.write(message + '\n');
  
  addLog(`Tentativa de enviar embed para canal ${normalizedChannelId}`);
  res.json({ success: true, message: 'Embed enviado.' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado.' });
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  const publicUrl = `http://34.173.207.172:${PORT}`;
  addLog(`Painel web do Kuromiga iniciado em ${publicUrl}`);
  console.log(`Painel do Kuromiga rodando em ${publicUrl}`);
  addLog(`Painel web do Pyxie iniciado em ${publicUrl}`);
  console.log(`Painel do Pyxie rodando em ${publicUrl}`);
  startBot();
});

function handleServerShutdown() {
  flushSync();
  if (botProcess && !botProcess.killed) {
    try { botProcess.kill('SIGTERM'); } catch (_) {}
  }
  process.exit(0);
}

process.on('SIGINT', handleServerShutdown);
process.on('SIGTERM', handleServerShutdown);
process.on('exit', () => { flushSync(); });
