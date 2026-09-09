const fs = require('node:fs');
const path = require('node:path');
const itemsCatalog = require('../data/items.json');
const { spendCoins, updateUserAccount, getUserAccount } = require('./economy');

const dataDir = path.join(__dirname, '..', '..', 'data');
const inventoryFile = path.join(dataDir, 'inventory.json');

const INVENTORY_FLUSH_INTERVAL_MS = 10 * 1000;

let cachedInventory = null;
let inventoryDirty = false;
let inventorySaveTimeout = null;

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJsonFile(filePath, fallback = {}) {
  ensureStorage();
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  ensureStorage();
  const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
  } catch (error) {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

function scheduleInventorySave() {
  inventoryDirty = true;
  if (!inventorySaveTimeout) {
    inventorySaveTimeout = setTimeout(() => {
      inventorySaveTimeout = null;
      if (inventoryDirty && cachedInventory) {
        writeJsonFile(inventoryFile, cachedInventory);
        inventoryDirty = false;
      }
    }, INVENTORY_FLUSH_INTERVAL_MS);
    if (inventorySaveTimeout.unref) inventorySaveTimeout.unref();
  }
}

function flushInventorySync() {
  if (inventoryDirty && cachedInventory) {
    writeJsonFile(inventoryFile, cachedInventory);
    inventoryDirty = false;
  }
}

function getFullInventoryMap() {
  if (!cachedInventory) {
    cachedInventory = readJsonFile(inventoryFile, {});
  }
  return cachedInventory;
}

function getUserInventory(userId) {
  const all = getFullInventoryMap();
  if (!all[userId]) {
    all[userId] = {};
  }
  return all[userId];
}

function getItemDefinition(itemId) {
  return itemsCatalog[itemId] || null;
}

function getAllItems() {
  return Object.values(itemsCatalog);
}

function getItemsByCategory(category) {
  return getAllItems().filter((item) => !category || item.category === category);
}

function hasItem(userId, itemId, amount = 1) {
  const inv = getUserInventory(userId);
  const count = Number(inv[itemId] || 0);
  return count >= amount;
}

function addItem(userId, itemId, amount = 1) {
  if (!getItemDefinition(itemId) || amount <= 0) return false;
  const inv = getUserInventory(userId);
  inv[itemId] = (Number(inv[itemId]) || 0) + amount;
  scheduleInventorySave();
  return inv[itemId];
}

function removeItem(userId, itemId, amount = 1) {
  if (!hasItem(userId, itemId, amount) || amount <= 0) return false;
  const inv = getUserInventory(userId);
  inv[itemId] = Math.max(0, (Number(inv[itemId]) || 0) - amount);
  if (inv[itemId] === 0) {
    delete inv[itemId];
  }
  scheduleInventorySave();
  return true;
}

function buyItem(userId, itemId, amount = 1) {
  const item = getItemDefinition(itemId);
  if (!item || !item.buyPrice || amount <= 0) {
    return { success: false, reason: 'invalid_item' };
  }

  const totalCost = item.buyPrice * amount;
  const spendResult = spendCoins(userId, totalCost);
  if (!spendResult.spent) {
    return {
      success: false,
      reason: 'insufficient_funds',
      balance: spendResult.balance,
      totalCost,
      item,
    };
  }

  addItem(userId, itemId, amount);

  return {
    success: true,
    item,
    amount,
    totalCost,
    balance: spendResult.balance,
  };
}

function sellItem(userId, itemId, amount = 1) {
  const item = getItemDefinition(itemId);
  if (!item || !item.sellPrice || amount <= 0) {
    return { success: false, reason: 'untradable' };
  }

  if (!hasItem(userId, itemId, amount)) {
    const currentCount = getUserInventory(userId)[itemId] || 0;
    return { success: false, reason: 'insufficient_items', currentCount, item };
  }

  const earnings = item.sellPrice * amount;
  removeItem(userId, itemId, amount);

  const updatedAccount = updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + earnings;
  });

  return {
    success: true,
    item,
    amount,
    earnings,
    balance: updatedAccount.coins,
  };
}

function openChest(userId, chestId) {
  const chest = getItemDefinition(chestId);
  if (!chest || !chest.effects?.isChest) {
    return { success: false, reason: 'not_a_chest' };
  }

  if (!removeItem(userId, chestId, 1)) {
    return { success: false, reason: 'no_chest' };
  }

  const minCoins = chest.effects.minCoins || 50;
  const maxCoins = chest.effects.maxCoins || 300;
  const coinsAwarded = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;

  // Atualiza saldo de moedas
  const updatedAccount = updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + coinsAwarded;
  });

  // Chance de dropar item adicional
  let droppedItem = null;
  const possibleItems = chest.effects.possibleItems || [];
  if (possibleItems.length > 0 && Math.random() < 0.6) {
    const pickedId = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    const itemDef = getItemDefinition(pickedId);
    if (itemDef) {
      addItem(userId, pickedId, 1);
      droppedItem = itemDef;
    }
  }

  return {
    success: true,
    chest,
    coinsAwarded,
    droppedItem,
    balance: updatedAccount.coins,
  };
}

function formatItemEffects(item) {
  if (!item || !item.effects) return '';
  const fx = item.effects;
  const parts = [];

  if (fx.isChest) {
    return `🎁 Contém ${fx.minCoins} a ${fx.maxCoins} moedas + chance de itens raros`;
  }
  if (fx.isSlotExpansion) {
    return `🏠 +${fx.slots || 2} vagas de pets na mochila`;
  }
  if (fx.hunger) parts.push(`🍖 +${fx.hunger}% Fome`);
  if (fx.happiness) parts.push(`💖 +${fx.happiness}% Felicidade`);
  if (fx.energy) parts.push(`⚡ +${fx.energy}% Energia`);
  if (fx.heal) parts.push(`🩹 +${fx.heal} HP`);
  if (fx.xp) parts.push(`✨ +${fx.xp} XP`);

  return parts.join(' • ');
}

module.exports = {
  getUserInventory,
  getItemDefinition,
  getAllItems,
  getItemsByCategory,
  hasItem,
  addItem,
  removeItem,
  buyItem,
  sellItem,
  openChest,
  formatItemEffects,
  flushInventorySync,
};

