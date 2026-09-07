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
  getCurrencyBalances,
  getDailyStatus,
  getUserRank,
  spendCoins,
} = require('../src/services/economy');
const { createMarriageRequest, getSpouseId, resolveMarriageRequest } = require('../src/services/marriage');

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

  fs.writeFileSync(economyFile, JSON.stringify({ proposer: { coins: 1200, lastDailyAt: null } }), 'utf8');
  assert.equal(getCurrencyBalances('proposer')[0].label, 'Moedinhas');
  const request = createMarriageRequest('proposer', 'recipient', 'test-guild');
  assert.equal(request.created, true, 'O pedido de casamento deve ser criado.');
  assert.equal(spendCoins('proposer', 1000).spent, true, 'O pedido deve cobrar 1000 Moedinhas.');
  assert.equal(getBalance('proposer'), 200, 'O saldo deve descontar o custo do casamento.');
  assert.equal(resolveMarriageRequest(request.id, 'recipient', true).resolved, true, 'O destinatário deve poder aceitar.');
  assert.equal(getSpouseId('proposer'), 'recipient', 'O vínculo deve ser salvo para quem solicitou.');
  assert.equal(getSpouseId('recipient'), 'proposer', 'O vínculo deve ser salvo para quem aceitou.');

  console.log('Verificação da economia, cooldown e ranking: OK');
} finally {
  fs.writeFileSync(economyFile, originalEconomy, 'utf8');
  fs.writeFileSync(settingsFile, originalSettings, 'utf8');
  if (originalMarriage === null) {
    if (fs.existsSync(marriageFile)) fs.unlinkSync(marriageFile);
  } else {
    fs.writeFileSync(marriageFile, originalMarriage, 'utf8');
  }
}