const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  acquireBotLock,
  releaseBotLock,
  getCommandList,
  getPrefix,
} = require('../src/utils/botUtils');
const { buildHelpMessage, buildHelpComponents } = require('../src/commands/commandHelpers');
const { getWelcomeChannel, setWelcomeChannel } = require('../src/services/database');

const lockFile = path.join(__dirname, '..', '.botmelody.lock');
const prefixFile = path.join(__dirname, '..', 'prefix.json');
const settingsFile = path.join(__dirname, '..', 'data', 'settings.json');
const originalSettings = fs.existsSync(settingsFile) ? fs.readFileSync(settingsFile, 'utf8') : '{}';

if (fs.existsSync(lockFile)) {
  fs.unlinkSync(lockFile);
}

if (fs.existsSync(prefixFile)) {
  fs.unlinkSync(prefixFile);
}

try {
  const first = acquireBotLock();
  assert.equal(first, true, 'A primeira instância deve adquirir o lock.');

  const second = acquireBotLock();
  assert.equal(second, false, 'A segunda instância não deve conseguir iniciar.');

  const help = getCommandList();
  assert.ok(Array.isArray(help), 'A lista de comandos deve existir.');
  assert.ok(help.some((item) => item.name === '/ajuda'), 'O comando /ajuda deve estar na lista.');

  const helpPage1 = buildHelpMessage(1, 'user-123');
  assert.ok(helpPage1.embed, 'O embed da página 1 deve ser gerado.');
  assert.equal(helpPage1.page, 1, 'A página retornada deve ser 1.');
  assert.ok(helpPage1.components.length > 0, 'Componentes de botões devem estar presentes.');
  
  const rawComponents = helpPage1.components[0].toJSON();
  assert.equal(rawComponents.components.length, 3, 'Deve conter 3 botões (Anterior, Indicador, Próximo).');
  assert.equal(rawComponents.components[0].disabled, true, 'O botão Anterior deve estar desativado na página 1.');
  assert.equal(rawComponents.components[1].disabled, true, 'O indicador de página deve estar desativado.');
  assert.equal(rawComponents.components[2].disabled, helpPage1.totalPages <= 1, 'O botão Próximo deve estar ativado se houver mais de 1 página.');

  const defaultPrefix = getPrefix();
  assert.equal(defaultPrefix, 'ku!', 'O prefixo padrão deve ser ku!.');

  const configuredChannel = setWelcomeChannel('guild-123', '123456789');
  assert.equal(configuredChannel, '123456789', 'O canal de boas-vindas deve ser salvo corretamente.');
  assert.equal(getWelcomeChannel('guild-123'), '123456789', 'O canal configurado deve ser lido do banco.');

  const mentionChannel = setWelcomeChannel('guild-mention', '<#987654321>');
  assert.equal(mentionChannel, '987654321', 'Uma menção de canal deve ser convertida para o ID real.');
  assert.equal(getWelcomeChannel('guild-mention'), '987654321', 'O canal convertido deve ser persistido e lido corretamente.');

  const urlChannel = setWelcomeChannel('guild-url', 'https://discord.com/channels/111111111111111111/222222222222222222/333333333333333333');
  assert.equal(urlChannel, '333333333333333333', 'Um link de canal deve ser convertido para o ID do canal.');
  assert.equal(getWelcomeChannel('guild-url'), '333333333333333333', 'O link convertido deve ser persistido e lido corretamente.');

  releaseBotLock();
  assert.equal(fs.existsSync(lockFile), false, 'O lock deve ser removido ao encerrar.');

  console.log('Verificação do lock, banco, prefixo padrão e ajuda: OK');
} finally {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }

  if (fs.existsSync(prefixFile)) {
    fs.unlinkSync(prefixFile);
  }

  fs.writeFileSync(settingsFile, originalSettings, 'utf8');
}
