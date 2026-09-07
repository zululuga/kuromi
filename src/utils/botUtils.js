const fs = require('node:fs');
const path = require('node:path');

const lockFilePath = path.join(__dirname, '..', '..', '.botmelody.lock');
const prefixFilePath = path.join(__dirname, '..', '..', 'prefix.json');

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function acquireBotLock() {
  try {
    if (fs.existsSync(lockFilePath)) {
      const currentPid = Number(fs.readFileSync(lockFilePath, 'utf8').trim());

      if (isProcessAlive(currentPid)) {
        return false;
      }

      fs.unlinkSync(lockFilePath);
    }

    fs.writeFileSync(lockFilePath, String(process.pid), { flag: 'wx' });
    return true;
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      try {
        const currentPid = Number(fs.readFileSync(lockFilePath, 'utf8').trim());

        if (!isProcessAlive(currentPid)) {
          fs.unlinkSync(lockFilePath);
          return acquireBotLock();
        }
      } catch (readError) {
        // Ignora falha de leitura do lock.
      }

      return false;
    }

    throw error;
  }
}

function releaseBotLock() {
  try {
    if (!fs.existsSync(lockFilePath)) {
      return;
    }

    const currentPid = Number(fs.readFileSync(lockFilePath, 'utf8').trim());

    if (!Number.isInteger(currentPid) || currentPid === process.pid) {
      fs.unlinkSync(lockFilePath);
    }
  } catch (error) {
    // Ignora falha ao remover o lock residual.
  }
}

function readJsonFile(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function getPrefix() {
  const storedPrefix = readJsonFile(prefixFilePath, { prefix: '!' }).prefix;
  return typeof storedPrefix === 'string' && storedPrefix.trim().length > 0 ? storedPrefix.trim() : '!';
}

function setPrefix(prefix) {
  const normalizedPrefix = typeof prefix === 'string' ? prefix.trim() : '!';
  const safePrefix = normalizedPrefix.length > 0 ? normalizedPrefix : '!';

  writeJsonFile(prefixFilePath, { prefix: safePrefix });
  return safePrefix;
}

function getCommandList() {
  const prefix = getPrefix();
  const { commands } = require('../commands');

  return commands.flatMap((command) => {
    const slashCommand = command.data.toJSON();
    const commandInfo = {
      name: `/${command.name}`,
      description: slashCommand.description,
      usage: `/${command.name}`,
    };

    if (command.name === 'prefix') {
      commandInfo.usage = '/prefix [valor] (ex.: /prefix ?)';
    }

    if (command.name === 'setwelcome') {
      commandInfo.usage = '/setwelcome #canal';
    }

    if (command.name === 'sixseven' || command.name === 'ship') {
      return [
        commandInfo,
        {
          name: `${prefix}${command.name}`,
          description: slashCommand.description,
          usage: `${prefix}${command.name}`,
        },
      ];
    }

    return [commandInfo];
  });
}

module.exports = {
  acquireBotLock,
  releaseBotLock,
  getCommandList,
  getPrefix,
  setPrefix,
};
