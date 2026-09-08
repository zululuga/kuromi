const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  BRIBE_COST,
  cards,
  bribeKuromi,
  drawTarot,
  drawCard,
  getBrasiliaDate,
  getCardCount,
  getTimeUntilMidnight,
  hasActiveDraw,
  resetDailyDraws,
} = require('../src/services/tarot');
const { renderTarotCard, createTarotAttachment } = require('../src/services/tarotRenderer');
const { setUserBalance, getBalance } = require('../src/services/economy');

const stateFile = path.join(__dirname, '..', 'data', 'tarot-state.json');
const economyFile = path.join(__dirname, '..', 'data', 'economy.json');
const originalState = fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : null;
const originalEconomy = fs.existsSync(economyFile) ? fs.readFileSync(economyFile, 'utf8') : null;

try {
  // 1. Validar contagem de cartas e nomes obrigatórios
  assert.equal(getCardCount(), 78, 'O baralho de tarot deve possuir exatamente 78 cartas.');
  
  const card6 = cards.find((c) => c.id === 'major_06');
  assert.ok(card6, 'A carta VI deve existir.');
  assert.equal(card6.name, 'OS NAMORADOS', 'A carta VI deve se chamar OS NAMORADOS.');
  
  const card7 = cards.find((c) => c.id === 'major_07');
  assert.ok(card7, 'A carta VII deve existir.');
  assert.equal(card7.name, 'A CARRUAGEM', 'A carta VII deve se chamar A CARRUAGEM.');

  // 2. Validar renderização em Canvas
  const sampleCard = cards[0];
  const uprightBuf = renderTarotCard(sampleCard, 'UPRIGHT');
  assert.ok(Buffer.isBuffer(uprightBuf), 'A renderização direta deve retornar um Buffer.');
  assert.ok(uprightBuf.length > 10000, 'O buffer da imagem deve ter tamanho válido.');

  const reversedBuf = renderTarotCard(sampleCard, 'REVERSED');
  assert.ok(Buffer.isBuffer(reversedBuf), 'A renderização invertida deve retornar um Buffer.');
  assert.ok(reversedBuf.length > 10000, 'O buffer invertido deve ter tamanho válido.');

  const attachment = createTarotAttachment(sampleCard, 'UPRIGHT');
  assert.equal(attachment.name, 'tarot_cringelandia.png', 'O anexo deve ter o nome correto.');

  // 3. Validar sorteio diário e ciclo
  const testUser = 'user-tarot-test-123';
  resetDailyDraws();

  const draw1 = drawTarot(testUser);
  assert.equal(draw1.drawn, true, 'A primeira tiragem diária deve ser bem-sucedida.');
  assert.equal(draw1.paid, false, 'A primeira tiragem diária deve ser gratuita.');
  assert.ok(draw1.card, 'A tiragem deve retornar uma carta.');
  assert.ok(['UPRIGHT', 'REVERSED'].includes(draw1.orientation), 'A orientação deve ser UPRIGHT ou REVERSED.');

  // Tentativa repetida no mesmo dia
  const draw2 = drawTarot(testUser);
  assert.equal(draw2.drawn, false, 'A segunda tiragem no mesmo dia deve ser bloqueada.');
  assert.equal(draw2.reason, 'already_drawn', 'O motivo do bloqueio deve ser already_drawn.');
  assert.ok(draw2.remainingTime, 'Deve retornar o tempo restante até a meia-noite.');

  // 4. Validar suborno da Kuromi
  const bribeUser = 'user-bribe-test-456';
  // Garantir saldo insuficiente primeiro
  const currentBal = getBalance(bribeUser);
  if (currentBal > 0) {
    const { spendCoins } = require('../src/services/economy');
    spendCoins(bribeUser, currentBal);
  }

  const failedBribe = bribeKuromi(bribeUser);
  assert.equal(failedBribe.bribed, false, 'Suborno sem saldo deve falhar.');
  assert.equal(failedBribe.reason, 'insufficient_funds', 'Motivo da falha deve ser saldo insuficiente.');

  // Adicionar moedas para suborno
  setUserBalance(bribeUser, BRIBE_COST + 100);
  const successBribe = bribeKuromi(bribeUser);
  assert.equal(successBribe.bribed, true, 'Suborno com saldo suficiente deve ter sucesso.');
  assert.equal(successBribe.paid, true, 'Tiragem por suborno deve estar marcada como paga.');
  assert.ok(successBribe.card, 'Suborno deve entregar uma nova carta.');

  // 5. Validar cálculo de tempo
  const remaining = getTimeUntilMidnight();
  assert.ok(remaining.totalMinutes >= 0 && remaining.totalMinutes <= 1440, 'Minutos restantes devem estar entre 0 e 1440.');

  console.log('Verificação do Tarot Cringelândia (78 cartas, Canvas, Sorteio, Suborno): OK');
} finally {
  if (originalState !== null) {
    fs.writeFileSync(stateFile, originalState, 'utf8');
  } else if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }

  if (originalEconomy !== null) {
    fs.writeFileSync(economyFile, originalEconomy, 'utf8');
  } else if (fs.existsSync(economyFile)) {
    fs.unlinkSync(economyFile);
  }
}
