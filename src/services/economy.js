const fs = require('node:fs');
const path = require('node:path');
const { getEconomyConfig } = require('./database');

const economyFile = path.join(__dirname, '..', '..', 'data', 'economy.json');
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CURRENCY_DEFINITIONS = [
  { key: 'coins', label: 'Moedinhas', emoji: '🪙' },
];

function readEconomy() {
  const directory = path.dirname(economyFile);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(economyFile)) return {};

  try {
    const raw = fs.readFileSync(economyFile, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeEconomy(economy) {
  const directory = path.dirname(economyFile);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(economyFile, JSON.stringify(economy, null, 2), 'utf8');
}

function getUserAccount(userId) {
  const economy = readEconomy();
  return economy[userId] || { coins: 0, lastDailyAt: null };
}

function getBalance(userId) {
  return getUserAccount(userId).coins;
}

function getCurrencyBalances(userId) {
  const account = getUserAccount(userId);
  return CURRENCY_DEFINITIONS.map((currency) => ({
    ...currency,
    amount: Number(account[currency.key]) || 0,
  }));
}

function spendCoins(userId, amount) {
  const economy = readEconomy();
  const account = economy[userId] || { coins: 0, lastDailyAt: null };
  if (account.coins < amount) {
    return { spent: false, balance: account.coins };
  }

  account.coins -= amount;
  economy[userId] = account;
  writeEconomy(economy);
  return { spent: true, balance: account.coins };
}

function getDailyStatus(userId, now = Date.now()) {
  const account = getUserAccount(userId);
  const lastDailyAt = account.lastDailyAt ? new Date(account.lastDailyAt).getTime() : 0;
  const remainingMs = Math.max(0, DAILY_COOLDOWN_MS - (now - lastDailyAt));

  return {
    available: remainingMs === 0,
    remainingMs,
    nextClaimAt: remainingMs ? new Date(now + remainingMs).toISOString() : null,
  };
}

function claimDaily(userId, now = Date.now()) {
  const economy = readEconomy();
  const account = economy[userId] || { coins: 0, lastDailyAt: null };
  const status = getDailyStatus(userId, now);

  if (!status.available) {
    return { claimed: false, amount: 0, balance: account.coins, ...status };
  }

  const { minimum, maximum } = getEconomyConfig();
  const amount = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  account.coins += amount;
  account.lastDailyAt = new Date(now).toISOString();
  economy[userId] = account;
  writeEconomy(economy);

  return {
    claimed: true,
    amount,
    balance: account.coins,
    nextClaimAt: new Date(now + DAILY_COOLDOWN_MS).toISOString(),
    remainingMs: DAILY_COOLDOWN_MS,
  };
}

function getRanking(limit = 10, userIds = null) {
  return Object.entries(readEconomy())
    .filter(([userId]) => !userIds || userIds.has(userId))
    .map(([userId, account]) => ({ userId, coins: Number(account.coins) || 0 }))
    .sort((left, right) => right.coins - left.coins)
    .slice(0, limit);
}

function getUserRank(userId, userIds = null) {
  const accounts = Object.entries(readEconomy())
    .filter(([id]) => !userIds || userIds.has(id))
    .map(([id, account]) => ({ userId: id, coins: Number(account.coins) || 0 }))
    .sort((left, right) => right.coins - left.coins);
  const index = accounts.findIndex((account) => account.userId === userId);

  return index === -1 ? null : { position: index + 1, coins: accounts[index].coins };
}

module.exports = {
  DAILY_COOLDOWN_MS,
  CURRENCY_DEFINITIONS,
  getUserAccount,
  getBalance,
  getCurrencyBalances,
  spendCoins,
  getDailyStatus,
  claimDaily,
  getRanking,
  getUserRank,
};