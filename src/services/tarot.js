const fs = require('node:fs');
const path = require('node:path');
const cards = require('../data/tarot.json');
const { getBalance, spendCoins } = require('./economy');

const stateFile = path.join(__dirname, '..', '..', 'data', 'tarot-state.json');
const BRIBE_COST = 350;

function getBrasiliaDate(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}

function getTimeUntilMidnight(now = Date.now()) {
  const todayStr = getBrasiliaDate(now);
  // Meia-noite em Brasília (00:00 BRT) corresponde a 03:00 UTC do dia seguinte
  const nextMidnightUtc = Date.parse(`${todayStr}T03:00:00.000Z`) + 24 * 60 * 60 * 1000;
  const diffMs = Math.max(0, nextMidnightUtc - now);
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    hours,
    minutes,
    totalMinutes,
    diffMs,
    formatted: `${hours}h ${minutes}min`,
  };
}

function readState() {
  if (!fs.existsSync(stateFile)) return { cycle: getBrasiliaDate(), users: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : { cycle: getBrasiliaDate(), users: {} };
  } catch (error) {
    return { cycle: getBrasiliaDate(), users: {} };
  }
}

function writeState(state) {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

function ensureCurrentCycle(now = Date.now()) {
  const state = readState();
  const cycle = getBrasiliaDate(now);
  if (state.cycle !== cycle) {
    state.cycle = cycle;
    state.users = {};
    writeState(state);
  }
  return state;
}

function drawCard(random = Math.random) {
  const card = cards[Math.min(cards.length - 1, Math.floor(random() * cards.length))];
  const reversed = random() >= 0.5;
  return { card, orientation: reversed ? 'REVERSED' : 'UPRIGHT' };
}

function drawTarot(userId, now = Date.now(), random = Math.random) {
  const state = ensureCurrentCycle(now);
  if (state.users[userId]) {
    return {
      drawn: false,
      reason: 'already_drawn',
      cycle: state.cycle,
      remainingTime: getTimeUntilMidnight(now),
      lastDraw: state.users[userId],
    };
  }

  const result = drawCard(random);
  state.users[userId] = {
    drawnAt: new Date(now).toISOString(),
    ...result,
    paid: false,
  };
  writeState(state);
  return { drawn: true, paid: false, cycle: state.cycle, ...result };
}

function bribeKuromi(userId, now = Date.now(), random = Math.random) {
  const state = ensureCurrentCycle(now);
  const currentBalance = getBalance(userId);

  if (currentBalance < BRIBE_COST) {
    return {
      bribed: false,
      reason: 'insufficient_funds',
      balance: currentBalance,
      required: BRIBE_COST,
    };
  }

  const payment = spendCoins(userId, BRIBE_COST);
  if (!payment.spent) {
    return {
      bribed: false,
      reason: 'insufficient_funds',
      balance: payment.balance,
      required: BRIBE_COST,
    };
  }

  const result = drawCard(random);
  state.users[userId] = {
    drawnAt: new Date(now).toISOString(),
    ...result,
    paid: true,
    bribed: true,
  };
  writeState(state);

  return {
    bribed: true,
    paid: true,
    cycle: state.cycle,
    balance: payment.balance,
    ...result,
  };
}

function hasActiveDraw(userId, now = Date.now()) {
  const state = ensureCurrentCycle(now);
  return Boolean(state.users[userId]);
}

function resetDailyDraws(now = Date.now()) {
  const state = readState();
  state.cycle = getBrasiliaDate(now);
  state.users = {};
  writeState(state);
  return state.cycle;
}

function getCardCount() {
  return cards.length;
}

module.exports = {
  BRIBE_COST,
  cards,
  bribeKuromi,
  bribeDestiny: bribeKuromi,
  bribePyxie: bribeKuromi,
  drawTarot,
  drawCard,
  getBrasiliaDate,
  getCardCount,
  getTimeUntilMidnight,
  hasActiveDraw,
  resetDailyDraws,
};
