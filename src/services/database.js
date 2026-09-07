const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const settingsFile = path.join(dataDir, 'settings.json');
const settingsBackupFile = `${settingsFile}.bak`;
const legacyPrefixFile = path.join(__dirname, '..', '..', 'prefix.json');
let settingsCache;

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({}, null, 2), 'utf8');
  }
}

function readSettings() {
  ensureStorage();

  if (settingsCache) {
    return settingsCache;
  }

  try {
    const raw = fs.readFileSync(settingsFile, 'utf8');
    settingsCache = raw ? JSON.parse(raw) : {};
  } catch (error) {
    try {
      const backup = fs.readFileSync(settingsBackupFile, 'utf8');
      settingsCache = backup ? JSON.parse(backup) : {};
    } catch (backupError) {
      settingsCache = {};
    }
  }

  return settingsCache;
}

function writeSettings(settings) {
  ensureStorage();
  const temporaryFile = `${settingsFile}.${process.pid}.${Date.now()}.tmp`;
  const serialized = JSON.stringify(settings, null, 2);

  fs.writeFileSync(temporaryFile, serialized, 'utf8');
  try {
    if (fs.existsSync(settingsFile)) {
      fs.copyFileSync(settingsFile, settingsBackupFile);
    }
    fs.renameSync(temporaryFile, settingsFile);
  } catch (error) {
    if (fs.existsSync(temporaryFile)) {
      fs.unlinkSync(temporaryFile);
    }
    throw error;
  }

  settingsCache = settings;
}

function getGuildSettings(guildId) {
  const settings = readSettings();
  return settings[guildId] || {};
}

function setGuildSettings(guildId, updates) {
  const settings = readSettings();
  settings[guildId] = {
    ...(settings[guildId] || {}),
    ...updates,
  };
  writeSettings(settings);
  return settings[guildId];
}

function normalizeChannelValue(input) {
  if (typeof input !== 'string') {
    return '';
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const mentionMatch = trimmed.match(/^<#?(\d+)>?$/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  const urlMatch = trimmed.match(/\/channels\/\d+\/\d+\/(\d+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  const directId = trimmed.match(/(\d{17,20})/);
  return directId ? directId[1] : trimmed;
}

function getWelcomeChannel(guildId) {
  const storedValue = getGuildSettings(guildId).welcomeChannelId || null;
  return storedValue ? normalizeChannelValue(storedValue) : null;
}

function setWelcomeChannel(guildId, channelId) {
  const normalized = normalizeChannelValue(channelId);
  return setGuildSettings(guildId, { welcomeChannelId: normalized }).welcomeChannelId;
}

function getGlobalSettings() {
  return getGuildSettings('global');
}

function getGlobalPrefix() {
  const settings = getGlobalSettings();
  if (settings.prefix) return settings.prefix;

  try {
    if (fs.existsSync(legacyPrefixFile)) {
      const legacy = JSON.parse(fs.readFileSync(legacyPrefixFile, 'utf8'));
      if (typeof legacy.prefix === 'string' && legacy.prefix.trim()) {
        setGlobalPrefix(legacy.prefix.trim());
        return legacy.prefix.trim();
      }
    }
  } catch (error) {
    // Ignora um arquivo de prefixo legado inválido.
  }

  return 'ku!';
}

function setGlobalPrefix(prefix) {
  return setGuildSettings('global', { prefix }).prefix;
}

function getEconomyConfig() {
  const economy = getGlobalSettings().economy || {};
  const minimum = Number.isFinite(Number(economy.minimum)) ? Math.max(0, Math.floor(Number(economy.minimum))) : 0;
  const maximum = Number.isFinite(Number(economy.maximum)) ? Math.max(minimum, Math.floor(Number(economy.maximum))) : 100;

  return { minimum, maximum };
}

function setEconomyConfig(minimum, maximum) {
  const normalizedMinimum = Math.max(0, Math.floor(Number(minimum)));
  const normalizedMaximum = Math.max(normalizedMinimum, Math.floor(Number(maximum)));

  return setGuildSettings('global', {
    economy: {
      minimum: normalizedMinimum,
      maximum: normalizedMaximum,
    },
  }).economy;
}

module.exports = {
  getGuildSettings,
  setGuildSettings,
  getWelcomeChannel,
  setWelcomeChannel,
  getGlobalSettings,
  getGlobalPrefix,
  setGlobalPrefix,
  getEconomyConfig,
  setEconomyConfig,
  normalizeChannelValue,
};
