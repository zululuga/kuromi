const fs = require('node:fs');
const path = require('node:path');
const { getEconomyConfig } = require('./database');

const economyFile = path.join(__dirname, '..', '..', 'data', 'economy.json');
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const WORK_COOLDOWN_MS = 3 * 60 * 60 * 1000;

const CURRENCY_DEFINITIONS = [
  { key: 'coins', label: 'Moedinhas', emoji: '🪙' },
  { key: 'magicBeans', label: 'Feijões Mágicos', emoji: '🌱' },
];

const TITLES_CATALOG = {
  cultivador: {
    id: 'cultivador',
    name: 'Cultivador de Feijões',
    emoji: '🌱',
    cost: 1,
    desc: 'Para quem sabe que até o menor grão pode florescer.',
  },
  explorador: {
    id: 'explorador',
    name: 'Conquistador de Masmorras',
    emoji: '⚔️',
    cost: 2,
    desc: 'Desbravador intrépido dos labirintos procedurais.',
  },
  shinychaser: {
    id: 'shinychaser',
    name: 'Caçador de Shinies',
    emoji: '✨',
    cost: 3,
    desc: 'Colecionador obstinado de criaturas radiantes.',
  },
  soberano: {
    id: 'soberano',
    name: 'Soberano Supremo',
    emoji: '👑',
    cost: 4,
    desc: 'Uma presença de autoridade e liderança incontestável.',
  },
  graomestre: {
    id: 'graomestre',
    name: 'Grão-Mestre Arcano',
    emoji: '🧙‍♂️',
    cost: 5,
    desc: 'Detentor de conhecimentos místicos e magia ancestral.',
  },
  lendaviva: {
    id: 'lendaviva',
    name: 'Lenda Viva',
    emoji: '🌌',
    cost: 10,
    desc: 'Seu nome ecoa com prestígio em todos os reinos.',
  },
  magnata: {
    id: 'magnata',
    name: 'Magnata Cósmico',
    emoji: '💎',
    cost: 15,
    desc: 'A personificação máxima da prosperidade e riqueza.',
  },
};

const THEMES_CATALOG = {
  default: { id: 'default', name: 'Padrão Pyxie', emoji: '🌸', color: '#e60067', cost: 0, desc: 'O clássico magenta da Pyxie.' },
  ouro: { id: 'ouro', name: 'Ouro Real', emoji: '👑', color: '#facc15', cost: 2, desc: 'Dourado brilhante para os mais prósperos.' },
  esmeralda: { id: 'esmeralda', name: 'Esmeralda Mística', emoji: '🌲', color: '#10b981', cost: 2, desc: 'Verde vibrante das florestas dos Pymons.' },
  galaxia: { id: 'galaxia', name: 'Nebulosa Cósmica', emoji: '🌌', color: '#8b5cf6', cost: 3, desc: 'Violeta estelar profundo e misterioso.' },
  cyberpunk: { id: 'cyberpunk', name: 'Rosa Neon', emoji: '⚡', color: '#ff1493', cost: 3, desc: 'Brilho neon intenso e futurista.' },
  chama: { id: 'chama', name: 'Fogo Carmesim', emoji: '🔥', color: '#ef4444', cost: 4, desc: 'Vermelho flamejante de pura bravura.' },
  diamante: { id: 'diamante', name: 'Diamante Glacial', emoji: '💎', color: '#00f5d4', cost: 5, desc: 'Ciano radiante e cristalino.' },
};

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

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

function normalizeAccount(account) {
  const acc = account || {};
  return {
    ...acc,
    coins: normalizeNumber(acc.coins, 0),
    magicBeans: normalizeNumber(acc.magicBeans, 0),
    profession: acc.profession || null,
    workCount: normalizeNumber(acc.workCount, 0),
    lastWorkAt: acc.lastWorkAt || null,
    lastDailyAt: acc.lastDailyAt || null,
    titles: Array.isArray(acc.titles) ? acc.titles : [],
    equippedTitle: acc.equippedTitle || null,
    themes: Array.isArray(acc.themes) ? acc.themes : ['default'],
    equippedTheme: acc.equippedTheme || 'default',
    bio: typeof acc.bio === 'string' ? acc.bio.trim().slice(0, 150) : null,
  };
}

function getUserAccount(userId) {
  const economy = readEconomy();
  return normalizeAccount(economy[userId]);
}

function updateUserAccount(userId, updater) {
  const economy = readEconomy();
  const account = normalizeAccount(economy[userId]);
  updater(account);
  economy[userId] = account;
  writeEconomy(economy);
  return account;
}

function getBalance(userId) {
  return getUserAccount(userId).coins;
}

function addCoins(userId, amount) {
  const qty = Math.max(0, normalizeNumber(amount, 0));
  if (qty === 0) return getUserAccount(userId).coins;

  const updated = updateUserAccount(userId, (acc) => {
    acc.coins = (acc.coins || 0) + qty;
  });
  return updated.coins;
}

function getMagicBeans(userId) {
  return getUserAccount(userId).magicBeans;
}

function addMagicBeans(userId, amount) {
  const qty = Math.max(0, normalizeNumber(amount, 0));
  if (qty === 0) return getUserAccount(userId).magicBeans;

  const updated = updateUserAccount(userId, (acc) => {
    acc.magicBeans = (acc.magicBeans || 0) + qty;
  });
  return updated.magicBeans;
}

function spendMagicBeans(userId, amount) {
  const qty = Math.max(0, normalizeNumber(amount, 0));
  const account = getUserAccount(userId);
  if (account.magicBeans < qty) {
    return { spent: false, balance: account.magicBeans };
  }

  const updated = updateUserAccount(userId, (acc) => {
    acc.magicBeans -= qty;
  });
  return { spent: true, balance: updated.magicBeans };
}

function getCurrencyBalances(userId) {
  const account = getUserAccount(userId);
  return CURRENCY_DEFINITIONS.map((currency) => ({
    ...currency,
    amount: Number(account[currency.key]) || 0,
  }));
}

function spendCoins(userId, amount) {
  const account = getUserAccount(userId);
  const cost = normalizeNumber(amount, 0);
  if (account.coins < cost) {
    return { spent: false, balance: account.coins };
  }

  const updated = updateUserAccount(userId, (acc) => {
    acc.coins -= cost;
  });
  return { spent: true, balance: updated.coins };
}

function setUserBalance(userId, amount) {
  return updateUserAccount(userId, (acc) => {
    acc.coins = normalizeNumber(amount, 0);
  });
}

function resetUserEconomy(userId) {
  return updateUserAccount(userId, (acc) => {
    acc.coins = 0;
    acc.magicBeans = 0;
    acc.lastDailyAt = null;
  });
}

function getTitlesCatalog() {
  return TITLES_CATALOG;
}

function getUserTitles(userId) {
  const account = getUserAccount(userId);
  return account.titles || [];
}

function buyTitle(userId, titleId) {
  const title = TITLES_CATALOG[titleId];
  if (!title) {
    return { success: false, reason: 'title_not_found', message: 'Título não encontrado no catálogo.' };
  }

  const account = getUserAccount(userId);
  const userTitles = account.titles || [];
  if (userTitles.includes(titleId)) {
    return { success: false, reason: 'already_owned', message: `Você já possui o título **${title.name}**!` };
  }

  if (account.magicBeans < title.cost) {
    return {
      success: false,
      reason: 'insufficient_beans',
      message: `Você precisa de **${title.cost} 🌱 Feijões Mágicos** para adquirir este título (Saldo atual: ${account.magicBeans} 🌱).`,
    };
  }

  const updated = updateUserAccount(userId, (acc) => {
    acc.magicBeans -= title.cost;
    acc.titles.push(titleId);
    acc.equippedTitle = titleId; // Equipa automaticamente ao comprar
  });

  return {
    success: true,
    title,
    equipped: true,
    remainingBeans: updated.magicBeans,
    message: `👑 **Título Adquirido e Equipado!** Você agora ostenta: **${title.emoji} ${title.name}**!`,
  };
}

function equipTitle(userId, titleId) {
  if (!titleId) {
    updateUserAccount(userId, (acc) => {
      acc.equippedTitle = null;
    });
    return { success: true, equipped: null, message: 'Você desequipou seu título atual.' };
  }

  const title = TITLES_CATALOG[titleId];
  if (!title) {
    return { success: false, reason: 'title_not_found', message: 'Título não encontrado.' };
  }

  const account = getUserAccount(userId);
  const userTitles = account.titles || [];
  if (!userTitles.includes(titleId)) {
    return { success: false, reason: 'not_owned', message: `Você ainda não desbloqueou o título **${title.name}**!` };
  }

  updateUserAccount(userId, (acc) => {
    acc.equippedTitle = titleId;
  });

  return {
    success: true,
    title,
    message: `✨ Título **${title.emoji} ${title.name}** equipado com sucesso!`,
  };
}

function unequipTitle(userId) {
  return equipTitle(userId, null);
}

function setUserBio(userId, bioText) {
  const cleanBio = typeof bioText === 'string' ? bioText.trim().slice(0, 150) : '';
  const updated = updateUserAccount(userId, (acc) => {
    acc.bio = cleanBio || null;
  });
  return { success: true, bio: updated.bio };
}

function getThemesCatalog() {
  return THEMES_CATALOG;
}

function getUserThemes(userId) {
  const account = getUserAccount(userId);
  return account.themes || ['default'];
}

function buyTheme(userId, themeId) {
  const theme = THEMES_CATALOG[themeId];
  if (!theme) {
    return { success: false, reason: 'theme_not_found', message: 'Tema não encontrado no catálogo.' };
  }

  const account = getUserAccount(userId);
  const userThemes = account.themes || ['default'];
  if (userThemes.includes(themeId)) {
    return { success: false, reason: 'already_owned', message: `Você já possui o tema visual **${theme.name}**!` };
  }

  if (account.magicBeans < theme.cost) {
    return {
      success: false,
      reason: 'insufficient_beans',
      message: `Você precisa de **${theme.cost} 🌱 Feijões Mágicos** para adquirir este tema visual (Saldo atual: ${account.magicBeans} 🌱).`,
    };
  }

  const updated = updateUserAccount(userId, (acc) => {
    acc.magicBeans -= theme.cost;
    acc.themes = Array.isArray(acc.themes) ? [...acc.themes, themeId] : ['default', themeId];
    acc.equippedTheme = themeId;
  });

  return {
    success: true,
    theme,
    equipped: true,
    remainingBeans: updated.magicBeans,
    message: `🎨 **Tema Visual Desbloqueado e Equipado!** Seu perfil agora brilha com: **${theme.emoji} ${theme.name}**!`,
  };
}

function equipTheme(userId, themeId) {
  const finalThemeId = themeId || 'default';
  const theme = THEMES_CATALOG[finalThemeId];
  if (!theme) {
    return { success: false, reason: 'theme_not_found', message: 'Tema visual não encontrado.' };
  }

  const account = getUserAccount(userId);
  const userThemes = account.themes || ['default'];
  if (!userThemes.includes(finalThemeId)) {
    return { success: false, reason: 'not_owned', message: `Você ainda não desbloqueou o tema **${theme.name}**!` };
  }

  updateUserAccount(userId, (acc) => {
    acc.equippedTheme = finalThemeId;
  });

  return {
    success: true,
    theme,
    message: `🎨 Tema visual **${theme.emoji} ${theme.name}** equipado com sucesso!`,
  };
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

  const charged = hasProfession ? cost : 0;
  const updated = updateUserAccount(userId, (current) => {
    current.profession = profession;
    if (hasProfession) current.coins -= cost;
  });

  return {
    changed: true,
    charged,
    balance: updated.coins,
    account: updated,
  };
}

function isTestUser(userId) {
  return !userId || /^(user_)?test_/i.test(userId) || userId === 'user_123';
}

function startWork(userId, data = {}, now = Date.now()) {
  const status = getWorkStatus(userId, now);
  if (!status.available) return { started: false, ...status };

  const account = updateUserAccount(userId, (current) => {
    current.lastWorkAt = new Date(now).toISOString();
  });
  return {
    started: true,
    data,
    workCount: Number(account.workCount) || 0,
    ...getWorkStatus(userId, now),
  };
}

function finishWork(userId, success, amount, bonusBean = false) {
  if (!success) return { earned: false, amount: 0, balance: getBalance(userId), magicBeans: getMagicBeans(userId), bonusBean: false };
  const account = updateUserAccount(userId, (current) => {
    current.coins = (Number(current.coins) || 0) + amount;
    current.workCount = (Number(current.workCount) || 0) + 1;
    if (bonusBean) {
      current.magicBeans = (Number(current.magicBeans) || 0) + 1;
    }
  });
  return {
    earned: true,
    amount,
    balance: account.coins,
    magicBeans: account.magicBeans,
    bonusBean,
    workCount: account.workCount,
  };
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
  const status = getDailyStatus(userId, now);
  if (!status.available) {
    const acc = getUserAccount(userId);
    return { claimed: false, amount: 0, balance: acc.coins, magicBeans: acc.magicBeans, magicBeanBonus: false, ...status };
  }

  const { minimum, maximum } = getEconomyConfig();
  const amount = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  const wonMagicBean = Math.random() < 0.01; // 1% de chance de Feijão Mágico

  const updated = updateUserAccount(userId, (acc) => {
    acc.coins += amount;
    if (wonMagicBean) {
      acc.magicBeans = (acc.magicBeans || 0) + 1;
    }
    acc.lastDailyAt = new Date(now).toISOString();
  });

  return {
    claimed: true,
    amount,
    magicBeanBonus: wonMagicBean,
    balance: updated.coins,
    magicBeans: updated.magicBeans,
    nextClaimAt: new Date(now + DAILY_COOLDOWN_MS).toISOString(),
    remainingMs: DAILY_COOLDOWN_MS,
  };
}

function getRanking(limit = 10, userIds = null) {
  return Object.entries(readEconomy())
    .filter(([userId]) => (!userIds || userIds.has(userId)) && !isTestUser(userId))
    .map(([userId, account]) => ({ userId, coins: Number(account.coins) || 0, magicBeans: Number(account.magicBeans) || 0 }))
    .sort((left, right) => right.coins - left.coins)
    .slice(0, limit);
}

function getUserRank(userId, userIds = null) {
  const accounts = Object.entries(readEconomy())
    .filter(([id]) => (!userIds || userIds.has(id)) && !isTestUser(id))
    .map(([id, account]) => ({ userId: id, coins: Number(account.coins) || 0 }))
    .sort((left, right) => right.coins - left.coins);
  const index = accounts.findIndex((account) => account.userId === userId);

  return index === -1 ? null : { position: index + 1, coins: accounts[index].coins };
}

module.exports = {
  DAILY_COOLDOWN_MS,
  WORK_COOLDOWN_MS,
  CURRENCY_DEFINITIONS,
  TITLES_CATALOG,
  THEMES_CATALOG,
  getUserAccount,
  getBalance,
  addCoins,
  getMagicBeans,
  addMagicBeans,
  spendMagicBeans,
  getCurrencyBalances,
  spendCoins,
  setUserBalance,
  resetUserEconomy,
  updateUserAccount,
  getTitlesCatalog,
  getUserTitles,
  buyTitle,
  equipTitle,
  unequipTitle,
  setUserBio,
  getThemesCatalog,
  getUserThemes,
  buyTheme,
  equipTheme,
  getWorkStatus,
  setProfession,
  startWork,
  finishWork,
  getDailyStatus,
  claimDaily,
  getRanking,
  getUserRank,
};