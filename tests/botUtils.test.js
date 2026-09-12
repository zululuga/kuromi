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
  assert.ok(help.some((item) => item.name === '/ajuda' || item.name === '/py-ajuda'), 'O comando de ajuda deve estar na lista.');

  const helpPage1 = buildHelpMessage('todos', 'user-123');
  assert.ok(helpPage1.embed, 'O embed do menu de ajuda deve ser gerado.');
  assert.ok(helpPage1.components.length > 0, 'Componentes do menu devem estar presentes.');
  
  const rawComponents = helpPage1.components[0].toJSON();
  assert.equal(rawComponents.components[0].type, 3, 'Deve conter um StringSelectMenu (tipo 3).');
  assert.ok(rawComponents.components[0].options.length >= 6, 'Deve conter opções para todos os 6 módulos temáticos.');

  const defaultPrefix = getPrefix();
  assert.equal(defaultPrefix, 'py!', 'O prefixo padrão deve ser py!.');

  const configuredChannel = setWelcomeChannel('guild-123', '123456789');
  assert.equal(configuredChannel, '123456789', 'O canal de boas-vindas deve ser salvo corretamente.');
  assert.equal(getWelcomeChannel('guild-123'), '123456789', 'O canal configurado deve ser lido do banco.');

  const mentionChannel = setWelcomeChannel('guild-mention', '<#987654321>');
  assert.equal(mentionChannel, '987654321', 'Uma menção de canal deve ser convertida para o ID real.');
  assert.equal(getWelcomeChannel('guild-mention'), '987654321', 'O canal convertido deve ser persistido e lido corretamente.');

  const urlChannel = setWelcomeChannel('guild-url', 'https://discord.com/channels/111111111111111111/222222222222222222/333333333333333333');
  assert.equal(urlChannel, '333333333333333333', 'Um link de canal deve ser convertido para o ID do canal.');
  assert.equal(getWelcomeChannel('guild-url'), '333333333333333333', 'O link convertido deve ser persistido e lido corretamente.');

  // Verificação de Internacionalização (i18n):
  const { getLanguage, setGuildLanguage, CRINGELANDIA_GUILD_ID, t, getCanvasStrings } = require('../src/utils/i18n');
  assert.equal(getLanguage(CRINGELANDIA_GUILD_ID), 'pt', 'Servidor Cringelândia deve ter Português como padrão.');
  assert.equal(getLanguage('outro-servidor-qualquer'), 'en', 'Servidores externos devem ter Inglês como padrão.');
  
  setGuildLanguage('servidor-customizado', 'pt');
  assert.equal(getLanguage('servidor-customizado'), 'pt', 'Servidor customizado deve salvar idioma escolhido.');

  assert.ok(t('vote.title', 'pt').includes('Vote na Pyxie'), 'Tradução pt deve funcionar');
  assert.ok(t('vote.title', 'en').includes('Vote for Pyxie'), 'Tradução en deve funcionar');
  assert.equal(getCanvasStrings('pt').pet.level, 'Nível');
  assert.equal(getCanvasStrings('en').pet.level, 'Level');

  // Testes de renderização Canvas em múltiplos idiomas:
  const { renderPetCard, renderDexCard, renderExpeditionMap } = require('../src/services/petRenderer');
  const { renderShipCard } = require('../src/services/shipRenderer');
  const { renderTarotCard } = require('../src/services/tarotRenderer');

  const mockPet = {
    id: 'test-pet-1',
    key: 'cinna',
    name: 'Cinna',
    element: 'CHARME',
    species: 'Cinna',
    level: 5,
    hunger: 80,
    happiness: 90,
    energy: 100,
    xp: 50,
    xpToNext: 200,
    stats: { hp: 60, maxHp: 60, atk: 15, def: 12, spd: 20 },
  };

  const petCardPt = renderPetCard(mockPet, 'pt');
  const petCardEn = renderPetCard(mockPet, 'en');
  assert.ok(Buffer.isBuffer(petCardPt) && petCardPt.length > 1000, 'Pet card PT deve renderizar buffer válido');
  assert.ok(Buffer.isBuffer(petCardEn) && petCardEn.length > 1000, 'Pet card EN deve renderizar buffer válido');

  const mockMonsterDef = {
    key: 'cinna',
    name: 'Cinna',
    element: 'CHARME',
    rarity: 'INICIAL',
    description: 'Coelhinha mística.',
    baseStats: { hp: 55, atk: 12, def: 10, spd: 18 },
  };
  const dexCardPt = renderDexCard(mockMonsterDef, false, true, false, 'pt');
  const dexCardEn = renderDexCard(mockMonsterDef, false, true, false, 'en');
  const dexCardLockedEn = renderDexCard(mockMonsterDef, false, false, false, 'en');
  const dexCardShinyLockedEn = renderDexCard(mockMonsterDef, true, true, false, 'en');
  assert.ok(Buffer.isBuffer(dexCardPt) && dexCardPt.length > 1000);
  assert.ok(Buffer.isBuffer(dexCardEn) && dexCardEn.length > 1000);
  assert.ok(Buffer.isBuffer(dexCardLockedEn) && dexCardLockedEn.length > 1000);
  assert.ok(Buffer.isBuffer(dexCardShinyLockedEn) && dexCardShinyLockedEn.length > 1000);

  const mockRun = {
    zone: { id: 'bosque', name: 'Bosque dos Guizos' },
    coinsAccumulated: 250,
    chestsFound: [{}],
    eggsFound: [{}],
    step: 8,
    playerPos: { x: 1, y: 2 },
    exitPos: { x: 4, y: 4 },
    grid: [
      [{ revealed: true, visited: true, eventType: 'EMPTY' }, { revealed: true, visited: false, eventType: 'CHEST' }],
    ],
  };
  const mapPt = renderExpeditionMap(mockRun, mockPet, 'pt');
  const mapEn = renderExpeditionMap(mockRun, mockPet, 'en');
  assert.ok(Buffer.isBuffer(mapPt) && mapPt.length > 1000);
  assert.ok(Buffer.isBuffer(mapEn) && mapEn.length > 1000);

  const mockMemberA = { id: 'userA', displayName: 'Hero' };
  const mockMemberB = { id: 'userB', displayName: 'Companion' };
  const shipCardPt = renderShipCard(mockMemberA, mockMemberB, 75, 'pt');
  const shipCardEn = renderShipCard(mockMemberA, mockMemberB, 75, 'en');
  assert.ok(shipCardPt instanceof Promise);

  const mockTarotCard = {
    id: 'major_00',
    num: '0',
    name: 'O LOUCO',
    arcana: 'Arcanos Maiores',
    keywords: ['Liberdade', 'Inocência'],
    upright: 'Aja antes de ter medo.',
    reversed: 'Falta de coragem.',
  };
  const tarotCardPt = renderTarotCard(mockTarotCard, 'UPRIGHT', 'pt');
  const tarotCardEn = renderTarotCard(mockTarotCard, 'REVERSED', 'en');
  assert.ok(Buffer.isBuffer(tarotCardPt) && tarotCardPt.length > 1000);
  assert.ok(Buffer.isBuffer(tarotCardEn) && tarotCardEn.length > 1000);

  // Testes de comandos em múltiplos idiomas:
  const trabalhoCmd = require('../src/commands/trabalho');
  const tarotCmd = require('../src/commands/tarot');
  const shipCmd = require('../src/commands/ship');
  const perfilCmd = require('../src/commands/perfil');
  const trocarCmd = require('../src/commands/trocar');
  const dailyCmd = require('../src/commands/daily');
  const votarCmd = require('../src/commands/votar');
  const agendaCmd = require('../src/commands/agenda');

  // 1. Trocar
  assert.ok(trocarCmd.data.description.length <= 100, 'Descrição do slash /trocar deve ter <= 100 caracteres');
  assert.ok(t('trade.proposalTitle', 'pt').includes('Proposta de Troca'), 'Trocar PT ok');
  assert.ok(t('trade.proposalTitle', 'en').includes('Trade Proposal'), 'Trocar EN ok');

  // 2. Trabalho
  assert.ok(trabalhoCmd.data.description.length <= 100, 'Descrição do slash /trabalho deve ter <= 100 caracteres');
  assert.ok(t('workMinigame.successTitle', 'pt', { profession: 'Programador' }).includes('Concluído'), 'Trabalho PT ok');
  assert.ok(t('workMinigame.successTitle', 'en', { profession: 'Programmer' }).includes('Completed'), 'Trabalho EN ok');

  // 3. Tarot
  assert.ok(tarotCmd.data.description.length <= 100, 'Descrição do slash /tarot deve ter <= 100 caracteres');
  const tarotEmbedPt = tarotCmd.buildTarotEmbed({ card: mockTarotCard, orientation: 'UPRIGHT', paid: false }, 'pt');
  const tarotEmbedEn = tarotCmd.buildTarotEmbed({ card: mockTarotCard, orientation: 'REVERSED', paid: false }, 'en');
  assert.ok(tarotEmbedPt.data.description.includes('CARTA'), 'Tarot PT deve conter CARTA');
  assert.ok(tarotEmbedEn.data.description.includes('CARD'), 'Tarot EN deve conter CARD');

  // 4. Ship
  assert.ok(shipCmd.data.description.length <= 100, 'Descrição do slash /ship deve ter <= 100 caracteres');
  const shipEmbedPt = shipCmd.buildShipEmbed(mockMemberA, mockMemberB, 80, 'pt');
  const shipEmbedEn = shipCmd.buildShipEmbed(mockMemberA, mockMemberB, 80, 'en');
  assert.ok(shipEmbedPt.data.description.includes('NOME DO CASAL'), 'Ship PT deve conter NOME DO CASAL');
  assert.ok(shipEmbedEn.data.description.includes('COUPLE NAME'), 'Ship EN deve conter COUPLE NAME');

  // 5. Perfil
  assert.ok(perfilCmd.data.description.length <= 100, 'Descrição do slash /perfil deve ter <= 100 caracteres');
  const mockTargetUser = { id: 'test-user-1', username: 'TestUser', displayName: 'TestUser', displayAvatarURL: () => 'https://example.com/avatar.png' };
  const titlesViewPt = perfilCmd.buildTitlesView(mockTargetUser, 'viewer-1', 'pt');
  const titlesViewEn = perfilCmd.buildTitlesView(mockTargetUser, 'viewer-1', 'en');
  assert.ok(titlesViewPt.embeds[0].data.title.includes('Galeria de Títulos'), 'Títulos PT ok');
  assert.ok(titlesViewEn.embeds[0].data.title.includes('Titles Gallery'), 'Títulos EN ok');

  const themesViewPt = perfilCmd.buildThemesView(mockTargetUser, 'viewer-1', 'pt');
  const themesViewEn = perfilCmd.buildThemesView(mockTargetUser, 'viewer-1', 'en');
  assert.ok(themesViewPt.embeds[0].data.title.includes('Temas & Cores'), 'Temas PT ok');
  assert.ok(themesViewEn.embeds[0].data.title.includes('Themes & Colors'), 'Temas EN ok');

  // 6. Daily & Votar
  const dailyPt = dailyCmd.buildDailyView('test-user-1', 'pt');
  const dailyEn = dailyCmd.buildDailyView('test-user-1', 'en');
  assert.ok(dailyPt.embeds[0].data.title.length > 0);
  assert.ok(dailyEn.embeds[0].data.title.length > 0);

  const votePt = votarCmd.buildVoteView('pt');
  const voteEn = votarCmd.buildVoteView('en');
  assert.ok(votePt.embeds[0].data.title.includes('Vote na Pyxie'), 'Vote PT ok');
  assert.ok(voteEn.embeds[0].data.title.includes('Vote for Pyxie'), 'Vote EN ok');

  // 7. Agenda
  const agendaEmbedPt = agendaCmd.buildAgendaEmbed(null, Date.now(), 'pt');
  const agendaEmbedEn = agendaCmd.buildAgendaEmbed(null, Date.now(), 'en');
  assert.ok(agendaEmbedPt.data.title.includes('Agenda de Automações'), 'Agenda PT ok');
  assert.ok(agendaEmbedEn.data.title.includes('Automation Schedule'), 'Agenda EN ok');
  // 8. Pet Duelo, Boss, Expedição, Loja, Inventário, Adoção e Dex:
  const petdueloCmd = require('../src/commands/petduelo');
  const bossCmd = require('../src/commands/boss');
  const expedicaoCmd = require('../src/commands/expedicao');
  const lojaCmd = require('../src/commands/loja');
  const inventarioCmd = require('../src/commands/inventario');
  const adocaoCmd = require('../src/commands/adocao');
  const dexCmd = require('../src/commands/dex');

  assert.ok(t('duel.embedTitle', 'pt').includes('Coliseu de Pymons'), 'Duelo PT ok');
  assert.ok(t('duel.embedTitle', 'en').includes('Colosseum'), 'Duelo EN ok');

  assert.ok(t('boss.title', 'pt', { name: 'Titã' }).includes('World Boss Semanal'), 'Boss PT ok');
  assert.ok(t('boss.title', 'en', { name: 'Titan' }).includes('Weekly World Boss'), 'Boss EN ok');

  assert.ok(t('expedition.availableTitle', 'pt').includes('Expedições Passivas'), 'Expedição PT ok');
  assert.ok(t('expedition.availableTitle', 'en').includes('Passive Pymon Expeditions'), 'Expedição EN ok');

  const shopEmbedPt = lojaCmd.buildShopEmbed('comida', 'pt');
  const shopEmbedEn = lojaCmd.buildShopEmbed('comida', 'en');
  assert.ok(shopEmbedPt.data.title.includes('Lojinha'), 'Loja PT ok');
  assert.ok(shopEmbedEn.data.title.includes('Shop'), 'Loja EN ok');

  const invEmbedPt = inventarioCmd.buildInventoryEmbed('user-1', 'Aventureiro', null, 'pt');
  const invEmbedEn = inventarioCmd.buildInventoryEmbed('user-1', 'Adventurer', null, 'en');
  assert.ok(invEmbedPt.data.title.includes('Mochila'), 'Inventario PT ok');
  assert.ok(invEmbedEn.data.title.includes('Backpack'), 'Inventario EN ok');

  const adocaoEmbedPt = adocaoCmd.buildDexEmbed('cinna', 'pt');
  const adocaoEmbedEn = adocaoCmd.buildDexEmbed('cinna', 'en');
  assert.ok(adocaoEmbedPt.data.title.includes('Escolha seu Inicial'), 'Adoção PT ok');
  assert.ok(adocaoEmbedEn.data.title.includes('Choose Your Starter'), 'Adoção EN ok');

  const dexEmbedPt = dexCmd.buildDexView('user-1', 'Explorador', 'cinna', false, 'pt');
  const dexEmbedEn = dexCmd.buildDexView('user-1', 'Explorer', 'cinna', false, 'en');
  assert.ok(dexEmbedPt.embeds[0].data.description.includes('COMPÊNDIO'), 'Dex PT ok');
  assert.ok(dexEmbedEn.embeds[0].data.description.includes('COMPENDIUM'), 'Dex EN ok');

  releaseBotLock();
  assert.equal(fs.existsSync(lockFile), false, 'O lock deve ser removido ao encerrar.');

  console.log('Verificação do lock, banco, prefixo padrão, internacionalização (i18n) e ajuda: OK');
} finally {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }

  if (fs.existsSync(prefixFile)) {
    fs.unlinkSync(prefixFile);
  }

  fs.writeFileSync(settingsFile, originalSettings, 'utf8');
}
