const fs = require('node:fs');
const path = require('node:path');

const cards = require('../../data/tarot.json');
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
    return { drawn: false, reason: 'already_drawn', cycle: state.cycle };
  }

  const result = drawCard(random);
  state.users[userId] = { drawnAt: new Date(now).toISOString(), ...result };
  writeState(state);
  return { drawn: true, paid: false, cycle: state.cycle, ...result };
}

function bribeKuromi(userId, now = Date.now(), random = Math.random) {
  const state = ensureCurrentCycle(now);
  if (!state.users[userId]) return { bribed: false, reason: 'no_draw' };
  const result = drawCard(random);
  state.users[userId] = { drawnAt: new Date(now).toISOString(), ...result, bribed: true };
  writeState(state);
  return { bribed: true, paid: true, cycle: state.cycle, ...result };
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
  drawTarot,
  getBrasiliaDate,
  getCardCount,
  hasActiveDraw,
  resetDailyDraws,
};
