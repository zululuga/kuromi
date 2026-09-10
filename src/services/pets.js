const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const petsCatalog = require('../data/petsData.json');
const { getItemDefinition, removeItem, addItem, hasItem } = require('./inventory');
const { getUserAccount, updateUserAccount, spendCoins } = require('./economy');
const {
  ensureUserIncubator,
  getIncubatorStatus,
  placeEggInSlot,
  hatchSlotEgg,
  applyHourglass,
  expandIncubator,
} = require('./petIncubator');

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
  const base = baseStats || { hp: 55, atk: 12, def: 12, spd: 12 };
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
 * Calcula decaimento natural de fome e regeneração de energia sob demanda via delta-time.
 */
function updateDynamicPetState(pet) {
  const now = Date.now();

  // 1. Fome: decai ~2.5% por hora (5% a cada 2 horas), pode chegar a 0%
  if (!pet.lastFedAt) pet.lastFedAt = now;
  const hoursSinceFed = Math.max(0, (now - pet.lastFedAt) / (1000 * 60 * 60));
  if (hoursSinceFed >= 1) {
    const hungerDecay = Math.floor(hoursSinceFed * 2.5);
    pet.hunger = Math.max(0, Math.min(100, (typeof pet.hunger === 'number' ? pet.hunger : 80) - hungerDecay));
    pet.lastFedAt = now - ((now - pet.lastFedAt) % (1000 * 60 * 60));
  }

  // 2. Humor: perde um pouco se estiver com fome crítica (< 30)
  if (typeof pet.hunger === 'number' && pet.hunger < 30) {
    pet.happiness = Math.max(0, Math.min(100, (pet.happiness || 50) - 10));
  }

  // 3. Energia: regenera +1 ⚡ a cada 3 minutos reais (20 ⚡ por hora)
  if (!pet.lastEnergyUpdateAt) {
    pet.lastEnergyUpdateAt = now;
  }
  const minsSinceEnergyUpdate = Math.max(0, (now - pet.lastEnergyUpdateAt) / (1000 * 60));
  if (minsSinceEnergyUpdate >= 3) {
    const energyRecovered = Math.floor(minsSinceEnergyUpdate / 3);
    pet.energy = Math.max(0, Math.min(100, (typeof pet.energy === 'number' ? pet.energy : 100) + energyRecovered));
    pet.lastEnergyUpdateAt = now - ((now - pet.lastEnergyUpdateAt) % (1000 * 60 * 3));
  }

  return pet;
}

function getUserPetRecord(userId) {
  const data = getFullPetsMap();
  if (!data[userId]) {
    data[userId] = {
      activePetId: null,
      maxPets: DEFAULT_MAX_PETS,
      pets: [],
      claimedStarterKit: false,
    };
  }

  ensureUserIncubator(data[userId]);
  return data[userId];
}

function getActivePet(userId) {
  const record = getUserPetRecord(userId);
  if (!record.activePetId || !Array.isArray(record.pets) || record.pets.length === 0) {
    return null;
  }

  let pet = record.pets.find((p) => p.id === record.activePetId);
  if (!pet && record.pets.length > 0) {
    pet = record.pets[0];
    record.activePetId = pet.id;
    schedulePetsSave();
  }

  if (pet) {
    updateDynamicPetState(pet);
  }

  return pet;
}

function getUserPets(userId) {
  const record = getUserPetRecord(userId);
  return (record.pets || []).map((p) => updateDynamicPetState(p));
}

function setActivePet(userId, petIdentifier) {
  const record = getUserPetRecord(userId);
  if (!record.pets || record.pets.length === 0) {
    return { success: false, reason: 'no_pets' };
  }

  const normalized = String(petIdentifier).toLowerCase().trim();
  const pet = record.pets.find(
    (p) => p.id === petIdentifier || p.key.toLowerCase() === normalized || p.name.toLowerCase() === normalized
  );

  if (!pet) {
    return { success: false, reason: 'pet_not_found' };
  }

  record.activePetId = pet.id;
  schedulePetsSave();
  return { success: true, pet };
}

/**
 * Adoção de Pymon inicial (Cinna, Bonorka ou Pomcorin).
 * Gratuita, com 5% de chance de Shiny. Bloqueada para quem já tem 1+ pet.
 */
function adoptPet(userId, speciesKey) {
  const record = getUserPetRecord(userId);

  // Usuários que já têm pet não podem mais adotar; devem conseguir novos por Dungeons / Chocadeira
  if (record.pets && record.pets.length > 0) {
    return {
      success: false,
      reason: 'already_has_starter',
      message: 'Você já escolheu seu Pymon inicial! Obtenha novos companheiros explorando Dungeons e chocando ovos na Chocadeira.',
    };
  }

  const normalized = String(speciesKey || '').toLowerCase().trim();
  const species = petsCatalog[normalized] || petsCatalog.cinna;

  if (!species) {
    return { success: false, reason: 'invalid_species', message: 'Pymon inicial não encontrado no catálogo.' };
  }

  if (!species.isStarter) {
    return {
      success: false,
      reason: 'not_starter',
      message: 'Apenas os 3 Pymons iniciais (Cinna, Bonorka e Pomcorin) podem ser escolhidos na adoção inicial!',
    };
  }

  const petId = `pet_${crypto.randomUUID().slice(0, 8)}`;
  const isShiny = Math.random() < 0.05; // 5% de chance de Shiny inicial
  const baseStats = species.baseStats || { hp: 55, atk: 12, def: 12, spd: 12 };
  const stats = calculateStats(baseStats, 1);

  const newPet = {
    id: petId,
    key: species.key,
    name: species.name,
    species: species.name,
    element: species.element || 'CHARME',
    rarity: species.rarity || 'INICIAL',
    emoji: species.emoji || '🐾',
    shiny: isShiny,
    corrupt: false,
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
  record.activePetId = petId;

  // Dá automaticamente os itens de sobrevivência iniciais
  if (!record.claimedStarterKit) {
    record.claimedStarterKit = true;
    addItem(userId, 'racao_cringe', 2);
    addItem(userId, 'curativo_coracao', 1);
    addItem(userId, 'bau_madeira', 1);
  }

  schedulePetsSave();

  return {
    success: true,
    pet: newPet,
    cost: 0,
    isShiny,
  };
}

function feedPet(userId, itemKey = 'racao_cringe') {
  const activePet = getActivePet(userId);
  if (!activePet) {
    return { success: false, reason: 'no_active_pet' };
  }

  if (activePet.hunger >= 100) {
    return {
      success: false,
      reason: 'pet_full',
      message: `${activePet.name} já está de barriga cheia e recusa mais comida no momento!`,
    };
  }

  const item = getItemDefinition(itemKey);
  if (!item || item.category !== 'comida') {
    return { success: false, reason: 'invalid_food', message: 'Este item não é uma comida válida para Pymons.' };
  }

  if (!hasItem(userId, itemKey, 1)) {
    return { success: false, reason: 'no_food_in_inventory', message: `Você não tem **${item.name}** na mochila.` };
  }

  const removed = removeItem(userId, itemKey, 1);
  if (!removed) {
    return { success: false, reason: 'failed_consume' };
  }

  const fx = item.effects || { hunger: 25, happiness: 10, energy: 5, heal: 0, xp: 5 };
  activePet.hunger = Math.min(100, (activePet.hunger || 0) + (fx.hunger || 25));
  activePet.happiness = Math.min(100, (activePet.happiness || 0) + (fx.happiness || 10));
  activePet.energy = Math.min(100, (activePet.energy || 0) + (fx.energy || 5));
  activePet.lastFedAt = Date.now();

  if (fx.heal && activePet.stats) {
    activePet.stats.hp = Math.min(activePet.stats.maxHp, (activePet.stats.hp || 0) + fx.heal);
  }

  let xpResult = { leveledUp: false };
  if (fx.xp) {
    xpResult = awardPetXp(userId, activePet.id, fx.xp);
  }

  schedulePetsSave();

  const effectsApplied = [];
  if (fx.hunger) effectsApplied.push(`🍖 +${fx.hunger}% Fome`);
  if (fx.happiness) effectsApplied.push(`💖 +${fx.happiness}% Felicidade`);
  if (fx.energy) effectsApplied.push(`⚡ +${fx.energy}% Energia`);
  if (fx.heal) effectsApplied.push(`🩹 +${fx.heal} HP`);
  if (fx.xp) effectsApplied.push(`✨ +${fx.xp} XP`);

  return {
    success: true,
    pet: activePet,
    item,
    effectsSummary: effectsApplied.join(' • '),
    statusSummary: `HP: ${activePet.stats.hp}/${activePet.stats.maxHp} • Fome: ${activePet.hunger}% • Humor: ${activePet.happiness}% • Energia: ${activePet.energy}%`,
    leveledUp: xpResult.leveledUp,
    newLevel: activePet.level,
  };
}

function petCarinho(userId, now = Date.now()) {
  const activePet = getActivePet(userId);
  if (!activePet) {
    return { success: false, reason: 'no_active_pet' };
  }

  const lastCarinho = activePet.lastCarinhoAt || 0;
  if (now - lastCarinho < CARINHO_COOLDOWN_MS) {
    const remainingMs = CARINHO_COOLDOWN_MS - (now - lastCarinho);
    return {
      success: false,
      reason: 'cooldown',
      remainingMs,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
    };
  }

  activePet.lastCarinhoAt = now;
  activePet.happiness = Math.min(100, (activePet.happiness || 0) + 20);
  const xpResult = awardPetXp(userId, activePet.id, 20);

  schedulePetsSave();

  return {
    success: true,
    pet: activePet,
    xpGained: 20,
    happinessGained: 20,
    leveledUp: xpResult.leveledUp,
    newLevel: activePet.level,
  };
}

function petSleep(userId, now = Date.now()) {
  const activePet = getActivePet(userId);
  if (!activePet) {
    return { success: false, reason: 'no_active_pet' };
  }

  const lastSleep = activePet.lastSleepAt || 0;
  if (now - lastSleep < SLEEP_COOLDOWN_MS) {
    const remainingMs = SLEEP_COOLDOWN_MS - (now - lastSleep);
    return {
      success: false,
      reason: 'cooldown',
      remainingMs,
      remainingHours: Math.ceil(remainingMs / (60 * 60 * 1000)),
    };
  }

  activePet.lastSleepAt = now;
  activePet.energy = 100;
  if (activePet.stats) {
    activePet.stats.hp = activePet.stats.maxHp;
  }

  schedulePetsSave();

  return {
    success: true,
    pet: activePet,
    message: `${activePet.name} tirou uma soneca mágica nas nuvens e recuperou 100% da Energia e HP!`,
  };
}

function renamePet(userId, newName) {
  const activePet = getActivePet(userId);
  if (!activePet) {
    return { success: false, reason: 'no_active_pet' };
  }

  const clean = String(newName || '').trim().slice(0, 24);
  if (!clean) {
    return { success: false, reason: 'invalid_name', message: 'O nome não pode ser vazio.' };
  }

  activePet.name = clean;
  schedulePetsSave();

  return { success: true, pet: activePet, newName: clean };
}

function awardPetXp(userId, petId, xpAmount) {
  const record = getUserPetRecord(userId);
  const pet = (record.pets || []).find((p) => p.id === petId);
  if (!pet) {
    return { success: false, reason: 'pet_not_found' };
  }

  pet.xp = (pet.xp || 0) + Math.max(0, xpAmount);
  let leveledUp = false;
  let startingLevel = pet.level || 1;

  while (pet.xp >= pet.xpToNext && pet.level < 100) {
    pet.xp -= pet.xpToNext;
    pet.level += 1;
    pet.xpToNext = calculateXpToNext(pet.level);
    leveledUp = true;

    // Aumento de atributos base ao subir de nível
    const species = petsCatalog[pet.key] || petsCatalog.cinna;
    const baseStats = species ? species.baseStats : { hp: 55, atk: 12, def: 12, spd: 12 };
    pet.stats = calculateStats(baseStats, pet.level);
  }

  schedulePetsSave();

  return {
    success: true,
    pet,
    xpGained: xpAmount,
    leveledUp,
    oldLevel: startingLevel,
    newLevel: pet.level,
  };
}

function useItemOnActivePet(userId, itemKey) {
  const activePet = getActivePet(userId);
  if (!activePet) {
    return { success: false, reason: 'no_active_pet' };
  }

  const item = getItemDefinition(itemKey);
  if (!item) {
    return { success: false, reason: 'item_not_found' };
  }

  if (!hasItem(userId, itemKey, 1)) {
    return { success: false, reason: 'no_item' };
  }

  const removed = removeItem(userId, itemKey, 1);
  if (!removed) {
    return { success: false, reason: 'failed_consume' };
  }

  const fx = item.effects || {};
  if (fx.heal && activePet.stats) {
    activePet.stats.hp = Math.min(activePet.stats.maxHp, (activePet.stats.hp || 0) + fx.heal);
  }
  if (fx.energy) {
    activePet.energy = Math.min(100, (activePet.energy || 0) + fx.energy);
  }
  if (fx.happiness) {
    activePet.happiness = Math.min(100, (activePet.happiness || 0) + fx.happiness);
  }
  if (fx.hunger) {
    activePet.hunger = Math.min(100, (activePet.hunger || 0) + fx.hunger);
  }

  let xpResult = { leveledUp: false };
  if (fx.xp) {
    xpResult = awardPetXp(userId, activePet.id, fx.xp);
  }

  schedulePetsSave();

  const effectsApplied = [];
  if (fx.heal) effectsApplied.push(`🩹 +${fx.heal} HP`);
  if (fx.energy) effectsApplied.push(`⚡ +${fx.energy}% Energia`);
  if (fx.happiness) effectsApplied.push(`💖 +${fx.happiness}% Felicidade`);
  if (fx.hunger) effectsApplied.push(`🍖 +${fx.hunger}% Fome`);
  if (fx.xp) effectsApplied.push(`✨ +${fx.xp} XP`);

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

function getPetsByElement(element) {
  return Object.values(petsCatalog).filter((p) => !element || p.element === element);
}

function getStarters() {
  return Object.values(petsCatalog).filter((p) => p.isStarter);
}

function hasClaimedStarterKit(userId) {
  const record = getUserPetRecord(userId);
  return Boolean(record.claimedStarterKit);
}

function isFirstTimeUser(userId) {
  const record = getUserPetRecord(userId);
  return (!record.pets || record.pets.length === 0);
}

function claimStarterKit(userId) {
  const record = getUserPetRecord(userId);
  if (record.claimedStarterKit) {
    return { success: false, reason: 'already_claimed' };
  }

  record.claimedStarterKit = true;
  schedulePetsSave();

  const updatedAccount = updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + 150;
  });

  addItem(userId, 'racao_cringe', 2);
  addItem(userId, 'curativo_coracao', 1);
  addItem(userId, 'bau_madeira', 1);

  return {
    success: true,
    coins: 150,
    newBalance: updatedAccount.coins,
    items: [
      { name: 'Ração da Floresta', count: 2, emoji: '🥣' },
      { name: 'Curativo de Coração', count: 1, emoji: '🩹' },
      { name: 'Baú Rústico', count: 1, emoji: '📦' },
    ],
  };
}

// Métodos de Chocadeira vinculados ao storage de pets
function getIncubator(userId) {
  const record = getUserPetRecord(userId);
  return getIncubatorStatus(record);
}

function putEggInIncubator(userId, eggItemId, slotIndex) {
  const record = getUserPetRecord(userId);
  return placeEggInSlot(userId, record, eggItemId, slotIndex, schedulePetsSave);
}

function hatchIncubatorEgg(userId, slotIndex) {
  const record = getUserPetRecord(userId);
  return hatchSlotEgg(userId, record, slotIndex, schedulePetsSave);
}

function useHourglassOnIncubator(userId, slotIndex, hourglassItemId) {
  const record = getUserPetRecord(userId);
  return applyHourglass(userId, record, slotIndex, hourglassItemId, schedulePetsSave);
}

function expandUserIncubator(userId) {
  const record = getUserPetRecord(userId);
  return expandIncubator(userId, record, schedulePetsSave);
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
  getStarters,
  feedPet,
  petCarinho,
  petSleep,
  renamePet,
  awardPetXp,
  useItemOnActivePet,
  getPetsByElement,
  hasClaimedStarterKit,
  isFirstTimeUser,
  claimStarterKit,
  getIncubator,
  putEggInIncubator,
  hatchIncubatorEgg,
  useHourglassOnIncubator,
  expandUserIncubator,
  schedulePetsSave,
  flushPetsSync,
};