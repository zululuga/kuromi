const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const economyFile = path.join(__dirname, '..', 'data', 'economy.json');
const settingsFile = path.join(__dirname, '..', 'data', 'settings.json');
const marriageFile = path.join(__dirname, '..', 'data', 'marriages.json');
const originalEconomy = fs.existsSync(economyFile) ? fs.readFileSync(economyFile, 'utf8') : '{}';
const originalSettings = fs.readFileSync(settingsFile, 'utf8');
const originalMarriage = fs.existsSync(marriageFile) ? fs.readFileSync(marriageFile, 'utf8') : null;

const { setEconomyConfig } = require('../src/services/database');
const {
  claimDaily,
  getBalance,
  getMagicBeans,
  addMagicBeans,
  spendMagicBeans,
  getCurrencyBalances,
  getDailyStatus,
  getUserRank,
  finishWork,
  getWorkStatus,
  resetUserEconomy,
  setProfession,
  setUserBalance,
  spendCoins,
  startWork,
  getTitlesCatalog,
  getUserTitles,
  buyTitle,
  equipTitle,
  unequipTitle,
  setUserBio,
  getUserAccount,
} = require('../src/services/economy');
const { createMarriageRequest, endMarriage, getSpouseId, resolveMarriageRequest } = require('../src/services/marriage');

try {
  fs.writeFileSync(economyFile, '{}', 'utf8');
  setEconomyConfig(10, 10);

  const firstClaim = claimDaily('economy-test-user', Date.parse('2026-01-01T00:00:00.000Z'));
  assert.equal(firstClaim.claimed, true, 'O primeiro daily deve ser aceito.');
  assert.equal(firstClaim.amount, 10, 'O daily deve respeitar o mínimo e máximo configurados.');
  assert.equal(getBalance('economy-test-user'), 10, 'O saldo deve ser persistido.');

  const secondClaim = claimDaily('economy-test-user', Date.parse('2026-01-01T12:00:00.000Z'));
  assert.equal(secondClaim.claimed, false, 'O segundo daily antes de 24h deve ser bloqueado.');

  const afterCooldown = claimDaily('economy-test-user', Date.parse('2026-01-02T00:00:00.000Z'));
  assert.equal(afterCooldown.claimed, true, 'O daily deve voltar após 24h.');
  assert.equal(getUserRank('economy-test-user').position, 1, 'O usuário deve aparecer no ranking.');
  assert.equal(getDailyStatus('economy-test-user', Date.parse('2026-01-02T01:00:00.000Z')).available, false);

  fs.writeFileSync(economyFile, JSON.stringify({ 'string-balance': { coins: '150', lastDailyAt: null } }), 'utf8');
  setEconomyConfig(1, 1);
  const stringBalanceClaim = claimDaily('string-balance', Date.parse('2026-01-01T00:00:00.000Z'));
  assert.equal(stringBalanceClaim.balance, 151, 'O diário deve tratar saldos persistidos como números.');
  assert.equal(getBalance('string-balance'), 151, 'O saldo não deve concatenar a recompensa como texto.');

  fs.writeFileSync(economyFile, JSON.stringify({ proposer: { coins: 1200, lastDailyAt: null } }), 'utf8');
  assert.equal(getCurrencyBalances('proposer')[0].label, 'Moedinhas');
  assert.equal(getCurrencyBalances('proposer')[1].label, 'Feijões Mágicos');
  const request = createMarriageRequest('proposer', 'recipient', 'test-guild');
  assert.equal(request.created, true, 'O pedido de casamento deve ser criado.');
  assert.equal(spendCoins('proposer', 1000).spent, true, 'O pedido deve cobrar 1000 Moedinhas.');
  assert.equal(getBalance('proposer'), 200, 'O saldo deve descontar o custo do casamento.');
  assert.equal(resolveMarriageRequest(request.id, 'recipient', true).resolved, true, 'O destinatário deve poder aceitar.');
  assert.equal(getSpouseId('proposer'), 'recipient', 'O vínculo deve ser salvo para quem solicitou.');
  assert.equal(getSpouseId('recipient'), 'proposer', 'O vínculo deve ser salvo para quem aceitou.');
  setUserBalance('proposer', 700);
  assert.equal(spendCoins('proposer', 500).spent, true, 'O divórcio deve cobrar 500 Moedinhas.');
  assert.equal(endMarriage('proposer').ended, true, 'O casamento deve ser encerrado.');
  assert.equal(getSpouseId('proposer'), null, 'O vínculo de quem pediu o divórcio deve ser removido.');
  assert.equal(getSpouseId('recipient'), null, 'O vínculo do cônjuge também deve ser removido.');

  setUserBalance('admin-target', 500);
  const cooldownAccount = JSON.parse(fs.readFileSync(economyFile, 'utf8'))['admin-target'];
  cooldownAccount.lastDailyAt = '2026-01-02T00:00:00.000Z';
  fs.writeFileSync(economyFile, JSON.stringify({ ...JSON.parse(fs.readFileSync(economyFile, 'utf8')), 'admin-target': cooldownAccount }), 'utf8');
  setUserBalance('admin-target', 900);
  assert.equal(getDailyStatus('admin-target', Date.parse('2026-01-02T01:00:00.000Z')).available, false, 'Setar saldo deve preservar o cooldown.');
  resetUserEconomy('admin-target');
  assert.equal(getBalance('admin-target'), 0, 'Resetar economia deve zerar o saldo.');
  assert.equal(getMagicBeans('admin-target'), 0, 'Resetar economia deve zerar os feijões mágicos.');
  assert.equal(getDailyStatus('admin-target').available, true, 'Resetar economia deve liberar o diário.');

  // Testes de Feijões Mágicos & Títulos
  assert.equal(getMagicBeans('beans-user'), 0, 'Saldo inicial de feijões deve ser 0.');
  addMagicBeans('beans-user', 5);
  assert.equal(getMagicBeans('beans-user'), 5, 'Deve creditar 5 feijões mágicos.');
  assert.equal(spendMagicBeans('beans-user', 2).spent, true, 'Deve gastar 2 feijões.');
  assert.equal(getMagicBeans('beans-user'), 3, 'Saldo deve ser 3 feijões.');
  assert.equal(spendMagicBeans('beans-user', 10).spent, false, 'Não deve permitir saldo negativo de feijões.');

  const titlesCatalog = getTitlesCatalog();
  assert.ok(titlesCatalog.cultivador, 'O título cultivador deve existir.');
  assert.equal(titlesCatalog.cultivador.cost, 1, 'Cultivador deve custar 1 feijão.');

  const buyRes = buyTitle('beans-user', 'cultivador');
  assert.equal(buyRes.success, true, 'Compra de título deve ser bem-sucedida.');
  assert.equal(getUserAccount('beans-user').equippedTitle, 'cultivador', 'Título recém-adquirido deve ser equipado.');
  assert.equal(getUserTitles('beans-user').includes('cultivador'), true, 'Título deve constar na lista de possuídos.');
  assert.equal(getMagicBeans('beans-user'), 2, 'Deve debitar 1 feijão (3 - 1 = 2).');

  unequipTitle('beans-user');
  assert.equal(getUserAccount('beans-user').equippedTitle, null, 'Desequipar título deve limpar o campo.');
  equipTitle('beans-user', 'cultivador');
  assert.equal(getUserAccount('beans-user').equippedTitle, 'cultivador', 'Equipar título possuído deve funcionar.');

  setUserBio('beans-user', 'Colecionador de Pymons e mestre das masmorras.');
  assert.equal(getUserAccount('beans-user').bio, 'Colecionador de Pymons e mestre das masmorras.', 'Biografia deve ser salva corretamente.');
  setUserBio('beans-user', '   ');
  assert.equal(getUserAccount('beans-user').bio, null, 'Biografia vazia deve ser redefinida para null.');

  const firstProfession = setProfession('worker', 'agricultor');
  assert.equal(firstProfession.changed, true, 'A primeira profissão deve ser gratuita.');
  setUserBalance('worker', 60);
  const changedProfession = setProfession('worker', 'programador');
  assert.equal(changedProfession.charged, 50, 'A troca de profissão deve custar 50 Moedinhas.');
  const work = startWork('worker', { profession: 'programador' }, Date.parse('2026-01-03T00:00:00.000Z'));
  assert.equal(work.started, true, 'O trabalho deve iniciar quando o cooldown estiver disponível.');
  assert.equal(work.workCount, 0, 'O trabalho não deve incrementar o contador antes de concluído com sucesso.');
  assert.equal(getWorkStatus('worker', Date.parse('2026-01-03T01:00:00.000Z')).available, false, 'O trabalho deve ter cooldown de 3 horas.');

  const workFinish = finishWork('worker', true, 35, true);
  assert.equal(workFinish.amount, 35, 'O trabalho concluído deve pagar o salário.');
  assert.equal(workFinish.workCount, 1, 'O trabalho concluído com sucesso deve incrementar o contador.');
  assert.equal(getUserAccount('worker').workCount, 1, 'Conta deve ter 1 trabalho registrado.');
  assert.equal(workFinish.bonusBean, true, 'O bônus de feijão mágico deve ser registrado.');
  assert.equal(getMagicBeans('worker'), 1, 'Trabalhador deve ter recebido 1 feijão de bônus.');

  console.log('Verificação da economia, cooldown, ranking, Feijões Mágicos e Títulos: OK');
} finally {
  fs.writeFileSync(economyFile, originalEconomy, 'utf8');
  fs.writeFileSync(settingsFile, originalSettings, 'utf8');
  if (originalMarriage === null) {
    if (fs.existsSync(marriageFile)) fs.unlinkSync(marriageFile);
  } else {
    fs.writeFileSync(marriageFile, originalMarriage, 'utf8');
  }
}