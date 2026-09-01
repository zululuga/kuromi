const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const logsFile = path.join(dataDir, 'logs.json');
const statsFile = path.join(dataDir, 'stats.json');

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJsonFile(filePath, fallback = {}) {
  ensureStorage();

  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  ensureStorage();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function addLog(message) {
  const timestamp = new Date().toISOString();
  const logs = readJsonFile(logsFile, { entries: [] });

  logs.entries.push({
    timestamp,
    message,
  });

  if (logs.entries.length > 500) {
    logs.entries = logs.entries.slice(-500);
  }

  writeJsonFile(logsFile, logs);
}

function getLogs(limit = 100) {
  const logs = readJsonFile(logsFile, { entries: [] });
  return logs.entries.slice(-limit).reverse();
}

function clearLogs() {
  writeJsonFile(logsFile, { entries: [] });
}

function normalizeStats(stats = {}) {
  const safeStats = {
    startTime: stats.startTime || new Date().toISOString(),
    commandsExecuted: Number(stats.commandsExecuted || 0),
    messagesProcessed: Number(stats.messagesProcessed || 0),
    usersEngaged: Number(stats.usersEngaged || 0),
    uniqueUsers: Array.isArray(stats.uniqueUsers)
      ? stats.uniqueUsers.join(',')
      : typeof stats.uniqueUsers === 'string'
        ? stats.uniqueUsers
        : '',
    uptimeMs: Number(stats.uptimeMs || 0),
  };

  return safeStats;
}

function getStats() {
  const stats = readJsonFile(statsFile, {
    startTime: new Date().toISOString(),
    commandsExecuted: 0,
    messagesProcessed: 0,
    usersEngaged: 0,
    uniqueUsers: '',
    uptimeMs: 0,
  });

  const normalized = normalizeStats(stats);
  writeJsonFile(statsFile, normalized);
  return normalized;
}

function updateStats(updates) {
  const stats = getStats();
  const updated = normalizeStats({ ...stats, ...updates });
  writeJsonFile(statsFile, updated);
  return updated;
}

function incrementCommand() {
  const stats = getStats();
  return updateStats({
    commandsExecuted: Number(stats.commandsExecuted || 0) + 1,
  });
}

function incrementMessages() {
  const stats = getStats();
  return updateStats({
    messagesProcessed: Number(stats.messagesProcessed || 0) + 1,
  });
}

function recordUniqueUser(userId) {
  const stats = getStats();
  const uniqueUsersStr = typeof stats.uniqueUsers === 'string' ? stats.uniqueUsers : '';
  const users = new Set(uniqueUsersStr.split(',').filter(Boolean));
  users.add(String(userId));

  const updated = {
    uniqueUsers: Array.from(users).join(','),
    usersEngaged: users.size,
  };

  return updateStats(updated);
}

function resetStats() {
  const stats = {
    startTime: new Date().toISOString(),
    commandsExecuted: 0,
    messagesProcessed: 0,
    usersEngaged: 0,
    uniqueUsers: '',
    uptimeMs: 0,
  };

  writeJsonFile(statsFile, stats);
  return stats;
}

module.exports = {
  addLog,
  getLogs,
  clearLogs,
  getStats,
  updateStats,
  incrementCommand,
  incrementMessages,
  recordUniqueUser,
  resetStats,
};
