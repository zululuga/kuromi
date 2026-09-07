const fs = require('node:fs');
const path = require('node:path');
const { getEconomyConfig } = require('./database');

const economyFile = path.join(__dirname, '..', '..', 'data', 'economy.json');
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const WORK_COOLDOWN_MS = 3 * 60 * 60 * 1000;
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
  return economy[userId] || { coins: 0, lastDailyAt: null, profession: null, workCount: 0, lastWorkAt: null };
}

function updateUserAccount(userId, updater) {
  const economy = readEconomy();
  const account = economy[userId] || { coins: 0, lastDailyAt: null, profession: null, workCount: 0, lastWorkAt: null };
  updater(account);
  economy[userId] = account;
  writeEconomy(economy);
  return account;
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

function setUserBalance(userId, amount) {
  const economy = readEconomy();
  const account = economy[userId] || { coins: 0, lastDailyAt: null };
  account.coins = amount;
  economy[userId] = account;
  writeEconomy(economy);
  return account;
}

function resetUserEconomy(userId) {
  const economy = readEconomy();
  const account = economy[userId] || { coins: 0, lastDailyAt: null };
  account.coins = 0;
  account.lastDailyAt = null;
  economy[userId] = account;
  writeEconomy(economy);
  return account;
}

function getWorkStatus(userId, now = Date.now()) {
  const account = getUserAccount(userId);
  const lastWorkAt = account.lastWorkAt ? new Date(account.lastWorkAt).getTime() : 0;
  const remainingMs = Math.max(0, WORK_COOLDOWN_MS - (now - lastWorkAt));
  return {
    available: remainingMs === 0,
    remainingMs,
    nextWorkAt: remainingMs ? new Date(now + remainingMs).toISOString() : null,
  };
}

function setProfession(userId, profession, cost = 50) {
  const account = getUserAccount(userId);
  const hasProfession = Boolean(account.profession);
  if (account.profession === profession) return { changed: false, reason: 'same', balance: account.coins, account };
  if (hasProfession && account.coins < cost) return { changed: false, reason: 'insufficient', balance: account.coins, account };

  return {
    changed: true,
    charged: hasProfession ? cost : 0,
    balance: account.coins - (hasProfession ? cost : 0),
    account: updateUserAccount(userId, (current) => {
      current.profession = profession;
      if (hasProfession) current.coins -= cost;
    }),
  };
}

function startWork(userId, words, now = Date.now()) {
  const status = getWorkStatus(userId, now);
  if (!status.available) return { started: false, ...status };

  const account = updateUserAccount(userId, (current) => {
    current.lastWorkAt = new Date(now).toISOString();
    current.workCount = (Number(current.workCount) || 0) + 1;
  });
  return {
    started: true,
    words,
    workCount: account.workCount,
    ...getWorkStatus(userId, now),
  };
}

function finishWork(userId, success, amount) {
  if (!success) return { earned: false, amount: 0, balance: getBalance(userId) };
  const account = updateUserAccount(userId, (current) => {
    current.coins = (Number(current.coins) || 0) + amount;
  });
  return { earned: true, amount, balance: account.coins };
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
  WORK_COOLDOWN_MS,
  CURRENCY_DEFINITIONS,
  getUserAccount,
  getBalance,
  getCurrencyBalances,
  spendCoins,
  setUserBalance,
  resetUserEconomy,
  updateUserAccount,
  getWorkStatus,
  setProfession,
  startWork,
  finishWork,
  getDailyStatus,
  claimDaily,
  getRanking,
  getUserRank,
};