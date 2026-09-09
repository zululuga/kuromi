const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const petsCatalog = require('../data/petsData.json');
const { getItemDefinition, removeItem, addItem, hasItem } = require('./inventory');
const { getUserAccount, updateUserAccount, spendCoins } = require('./economy');

const dataDir = path.join(__dirname, '..', '..', 'data');
const petsFile = path.join(dataDir, 'pets.json');

const PETS_FLUSH_INTERVAL_MS = 10 * 1000;
const CARINHO_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora
const SLEEP_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 horas
const DEFAULT_MAX_PETS = 3;

let cachedPetsData = null;
let petsDirty = false;
let petsSaveTimeout = null;

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

function schedulePetsSave() {
  petsDirty = true;
  if (!petsSaveTimeout) {
    petsSaveTimeout = setTimeout(() => {
      petsSaveTimeout = null;
      if (petsDirty && cachedPetsData) {
        writeJsonFile(petsFile, cachedPetsData);
        petsDirty = false;
      }
    }, PETS_FLUSH_INTERVAL_MS);
    if (petsSaveTimeout.unref) petsSaveTimeout.unref();
  }
}

function flushPetsSync() {
  if (petsDirty && cachedPetsData) {
    writeJsonFile(petsFile, cachedPetsData);
    petsDirty = false;
  }
}

function getFullPetsMap() {
  if (!cachedPetsData) {
    cachedPetsData = readJsonFile(petsFile, {});
  }
  return cachedPetsData;
}

function calculateXpToNext(level) {
  return Math.floor(100 * Math.pow(Math.max(1, level), 1.4));
}

function calculateStats(baseStats, level = 1) {
  const base = baseStats || { hp: 50, atk: 10, def: 10, spd: 10 };
  const lvlMultiplier = Math.max(0, level - 1);
  const maxHp = base.hp + lvlMultiplier * 10;
  return {
    maxHp,
    hp: maxHp,
    atk: base.atk + lvlMultiplier * 2,
    def: base.def + lvlMultiplier * 1,
    spd: base.spd + lvlMultiplier * 1,
  };
}

/**
 * Migra pets legados do economy.json se existirem.
 */
function migrateLegacyPet(userId, userRecord) {
  const account = getUserAccount(userId);
  if (account.pet && Array.isArray(userRecord.pets) && userRecord.pets.length === 0) {
    const legacy = account.pet;
    const species = petsCatalog[legacy.key] || petsCatalog.borboleta;
    const petId = `pet_${crypto.randomUUID().slice(0, 8)}`;
    const stats = calculateStats(species.baseStats, 1);

    const migratedPet = {
      id: petId,
      key: species.key,
      name: legacy.label || species.name,
      species: species.name,
      element: species.element || 'FOFURA',
      rarity: species.rarity || 'COMUM',
      emoji: species.emoji || '🐾',
      shiny: Boolean(legacy.shiny),
      corrupt: false,
      level: 1,
      xp: 0,
      xpToNext: calculateXpToNext(1),
      stats,
      hunger: 80,
      happiness: 80,
      energy: 100,
      lastFedAt: Date.now(),
      lastCarinhoAt: 0,
      lastSleepAt: 0,
      lastExploreAt: account.lastPetExplorationAt ? new Date(account.lastPetExplorationAt).getTime() : 0,
      adoptedAt: legacy.adoptedAt ? new Date(legacy.adoptedAt).getTime() : Date.now(),
      totalExploracoes: Number(account.totalAventuras || 0),
      duelosVencidos: 0,
      duelosPerdidos: 0,
    };

    userRecord.pets.push(migratedPet);
    userRecord.activePetId = petId;
    schedulePetsSave();
  }
}

/**
 * Calcula decaimento natural de fome e energia com base no tempo.
 */
function updateDynamicPetState(pet) {
  const now = Date.now();
  // Fome: perde ~5% a cada 2 horas (7200000ms)
  const hoursSinceFed = Math.max(0, (now - (pet.lastFedAt || now)) / (1000 * 60 * 60));
  const hungerDecay = Math.floor(hoursSinceFed * 2.5);
  pet.hunger = Math.max(5, Math.min(100, 100 - hungerDecay));

  // Humor: perde um pouco se estiver com muita fome
  if (pet.hunger < 30) {
    pet.happiness = Math.max(10, Math.min(100, (pet.happiness || 50) - 10));
  }

  // Energia: recupera 10% por hora até 100%
  const hoursSinceExplore = Math.max(0, (now - (pet.lastExploreAt || now)) / (1000 * 60 * 60));
  const energyRecovered = Math.floor(hoursSinceExplore * 10);
  pet.energy = Math.max(0, Math.min(100, (pet.energy || 50) + energyRecovered));

  return pet;
}

function getUserPetRecord(userId) {
  const all = getFullPetsMap();
  if (!all[userId]) {
    all[userId] = {
      activePetId: null,
      maxSlots: DEFAULT_MAX_PETS,
      pets: [],
    };
  }
  migrateLegacyPet(userId, all[userId]);
  return all[userId];
}

function getActivePet(userId) {
  const record = getUserPetRecord(userId);
  if (!record.pets || record.pets.length === 0) return null;

  let active = record.pets.find((p) => p.id === record.activePetId);
  if (!active) {
    active = record.pets[0];
    record.activePetId = active.id;
    schedulePetsSave();
  }

  return updateDynamicPetState(active);
}

function getUserPets(userId) {
  const record = getUserPetRecord(userId);
  return record.pets.map((p) => updateDynamicPetState(p));
}

function setActivePet(userId, petIdOrName) {
  const record = getUserPetRecord(userId);
  const search = String(petIdOrName || '').toLowerCase().trim();
  const target = record.pets.find(
    (p) => p.id === search || p.name.toLowerCase() === search || p.species.toLowerCase() === search
  );

  if (!target) return { success: false, reason: 'not_found' };
  record.activePetId = target.id;
  schedulePetsSave();
  return { success: true, pet: target };
}

function adoptPet(userId, speciesKey, random = Math.random) {
  const species = petsCatalog[speciesKey];
  if (!species) return { success: false, reason: 'invalid_species' };

  const record = getUserPetRecord(userId);
  const maxSlots = record.maxSlots || DEFAULT_MAX_PETS;
  if (record.pets.length >= maxSlots) {
    return { success: false, reason: 'slots_full', maxSlots, currentCount: record.pets.length };
  }

  const spendResult = spendCoins(userId, species.baseCost);
  if (!spendResult.spent) {
    return {
      success: false,
      reason: 'insufficient_funds',
      balance: spendResult.balance,
      cost: species.baseCost,
      species,
    };
  }

  const shiny = random() < 0.05; // 5% de chance de Shiny
  const corrupt = !shiny && random() < 0.01; // 1% de chance de Corrupt
  const petId = `pet_${crypto.randomUUID().slice(0, 8)}`;
  const stats = calculateStats(species.baseStats, 1);

  const newPet = {
    id: petId,
    key: species.key,
    name: species.name,
    species: species.name,
    element: species.element || 'FOFURA',
    rarity: species.rarity || 'COMUM',
    emoji: species.emoji || '🐾',
    shiny,
    corrupt,
    level: 1,
    xp: 0,
    xpToNext: calculateXpToNext(1),
    stats,
    hunger: 100,
    happiness: 100,
    energy: 100,
    lastFedAt: Date.now(),
    lastCarinhoAt: 0,
    lastSleepAt: 0,
    lastExploreAt: 0,
    adoptedAt: Date.now(),
    totalExploracoes: 0,
    duelosVencidos: 0,
    duelosPerdidos: 0,
  };

  record.pets.push(newPet);
  if (!record.activePetId) {
    record.activePetId = petId;
  }
  schedulePetsSave();

  return {
    success: true,
    pet: newPet,
    shiny,
    corrupt,
    balance: spendResult.balance,
  };
}

function feedPet(userId, foodItemId) {
  const activePet = getActivePet(userId);
  if (!activePet) return { success: false, reason: 'no_pet' };

  const foodItem = getItemDefinition(foodItemId);
  if (!foodItem || foodItem.category !== 'comida') {
    return { success: false, reason: 'not_food' };
  }

  if (!removeItem(userId, foodItemId, 1)) {
    return { success: false, reason: 'no_item', item: foodItem };
  }

  const fx = foodItem.effects || {};
  const hungerGained = fx.hunger || 20;
  const happinessGained = fx.happiness || 5;
  const energyGained = fx.energy || 0;
  const healGained = fx.heal || 0;
  const xpGained = fx.xp || 10;

  activePet.hunger = Math.min(100, (activePet.hunger || 0) + hungerGained);
  activePet.happiness = Math.min(100, (activePet.happiness || 0) + happinessGained);
  activePet.energy = Math.min(100, (activePet.energy || 0) + energyGained);
  if (healGained) {
    activePet.stats.hp = Math.min(activePet.stats.maxHp, (activePet.stats.hp || 0) + healGained);
  }
  activePet.lastFedAt = Date.now();

  const xpResult = awardPetXp(userId, activePet.id, xpGained);
  schedulePetsSave();

  const effectsApplied = [];
  if (hungerGained) effectsApplied.push(`🍖 +${hungerGained}% Fome`);
  if (happinessGained) effectsApplied.push(`💖 +${happinessGained}% Felicidade`);
  if (energyGained) effectsApplied.push(`⚡ +${energyGained}% Energia`);
  if (healGained) effectsApplied.push(`🩹 +${healGained} HP`);
  if (xpGained) effectsApplied.push(`✨ +${xpGained} XP`);

  return {
    success: true,
    pet: activePet,
    item: foodItem,
    effectsSummary: effectsApplied.join(' • '),
    statusSummary: `HP: ${activePet.stats.hp}/${activePet.stats.maxHp} • Fome: ${activePet.hunger}% • Humor: ${activePet.happiness}% • Energia: ${activePet.energy}%`,
    leveledUp: xpResult.leveledUp,
    newLevel: activePet.level,
  };
}

function petCarinho(userId, now = Date.now()) {
  const activePet = getActivePet(userId);
  if (!activePet) return { success: false, reason: 'no_pet' };

  const lastCarinho = activePet.lastCarinhoAt || 0;
  const elapsed = now - lastCarinho;
  if (elapsed < CARINHO_COOLDOWN_MS) {
    return { success: false, reason: 'cooldown', remainingMs: CARINHO_COOLDOWN_MS - elapsed };
  }

  activePet.happiness = Math.min(100, (activePet.happiness || 50) + 25);
  activePet.lastCarinhoAt = now;

  const xpResult = awardPetXp(userId, activePet.id, 15);
  schedulePetsSave();

  return {
    success: true,
    pet: activePet,
    leveledUp: xpResult.leveledUp,
    newLevel: activePet.level,
  };
}

function petSleep(userId, now = Date.now()) {
  const activePet = getActivePet(userId);
  if (!activePet) return { success: false, reason: 'no_pet' };

  const lastSleep = activePet.lastSleepAt || 0;
  const elapsed = now - lastSleep;
  if (elapsed < SLEEP_COOLDOWN_MS) {
    return { success: false, reason: 'cooldown', remainingMs: SLEEP_COOLDOWN_MS - elapsed };
  }

  activePet.energy = 100;
  activePet.lastSleepAt = now;
  schedulePetsSave();

  return {
    success: true,
    pet: activePet,
  };
}

function renamePet(userId, newName) {
  const activePet = getActivePet(userId);
  if (!activePet) return { success: false, reason: 'no_pet' };

  const cleanName = String(newName || '').trim();
  if (cleanName.length < 2 || cleanName.length > 25) {
    return { success: false, reason: 'invalid_length' };
  }

  activePet.name = cleanName;
  schedulePetsSave();
  return { success: true, pet: activePet };
}

function awardPetXp(userId, petId, xpAmount) {
  const record = getUserPetRecord(userId);
  const pet = record.pets.find((p) => p.id === petId);
  if (!pet || xpAmount <= 0) return { leveledUp: false };

  pet.xp = (pet.xp || 0) + xpAmount;
  let leveledUp = false;

  while (pet.level < 50 && pet.xp >= pet.xpToNext) {
    pet.xp -= pet.xpToNext;
    pet.level += 1;
    pet.xpToNext = calculateXpToNext(pet.level);

    const species = petsCatalog[pet.key] || { baseStats: { hp: 50, atk: 10, def: 10, spd: 10 } };
    pet.stats = calculateStats(species.baseStats, pet.level);
    leveledUp = true;
  }

  schedulePetsSave();
  return { leveledUp, level: pet.level, currentXp: pet.xp, xpToNext: pet.xpToNext };
}

function useItemOnActivePet(userId, itemId) {
  const activePet = getActivePet(userId);
  if (!activePet) return { success: false, reason: 'no_pet' };

  const item = getItemDefinition(itemId);
  if (!item) return { success: false, reason: 'invalid_item' };

  if (item.category === 'comida') {
    return feedPet(userId, itemId);
  }

  if (item.effects?.isSlotExpansion) {
    if (!removeItem(userId, itemId, 1)) {
      return { success: false, reason: 'no_item', item };
    }
    const record = getUserPetRecord(userId);
    record.maxSlots = (record.maxSlots || DEFAULT_MAX_PETS) + (item.effects.slots || 2);
    schedulePetsSave();
    return {
      success: true,
      applied: 'expansion',
      item,
      newMaxSlots: record.maxSlots,
    };
  }

  if (!removeItem(userId, itemId, 1)) {
    return { success: false, reason: 'no_item', item };
  }

  const fx = item.effects || {};
  const healGained = fx.heal || 0;
  const energyGained = fx.energy || 0;
  const happinessGained = fx.happiness || 0;
  const hungerGained = fx.hunger || 0;
  const xpGained = fx.xp || 0;

  if (healGained) {
    activePet.stats.hp = Math.min(activePet.stats.maxHp, activePet.stats.hp + healGained);
  }
  if (energyGained) {
    activePet.energy = Math.min(100, (activePet.energy || 0) + energyGained);
  }
  if (happinessGained) {
    activePet.happiness = Math.min(100, (activePet.happiness || 0) + happinessGained);
  }
  if (hungerGained) {
    activePet.hunger = Math.min(100, (activePet.hunger || 0) + hungerGained);
  }

  let xpResult = { leveledUp: false };
  if (xpGained) {
    xpResult = awardPetXp(userId, activePet.id, xpGained);
  }

  schedulePetsSave();

  const effectsApplied = [];
  if (healGained) effectsApplied.push(`🩹 +${healGained} HP`);
  if (energyGained) effectsApplied.push(`⚡ +${energyGained}% Energia`);
  if (happinessGained) effectsApplied.push(`💖 +${happinessGained}% Felicidade`);
  if (hungerGained) effectsApplied.push(`🍖 +${hungerGained}% Fome`);
  if (xpGained) effectsApplied.push(`✨ +${xpGained} XP`);

  return {
    success: true,
    applied: 'buff',
    pet: activePet,
    item,
    effectsSummary: effectsApplied.join(' • '),
    statusSummary: `HP: ${activePet.stats.hp}/${activePet.stats.maxHp} • Fome: ${activePet.hunger}% • Humor: ${activePet.happiness}% • Energia: ${activePet.energy}%`,
    leveledUp: xpResult.leveledUp,
    newLevel: activePet.level,
  };
}

module.exports = {
  PETS_CATALOG: petsCatalog,
  CARINHO_COOLDOWN_MS,
  SLEEP_COOLDOWN_MS,
  DEFAULT_MAX_PETS,
  getActivePet,
  getUserPets,
  setActivePet,
  adoptPet,
  feedPet,
  petCarinho,
  petSleep,
  renamePet,
  awardPetXp,
  useItemOnActivePet,
  flushPetsSync,
};