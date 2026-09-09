const { getActivePet, awardPetXp } = require('./pets');
const { addItem, getItemDefinition } = require('./inventory');
const { updateUserAccount } = require('./economy');

const DUNGEON_ZONES = {
  jardim: {
    key: 'jardim',
    name: 'Jardim das Borboletas',
    emoji: '🌸',
    minLevel: 1,
    energyCost: 20,
    cooldownMs: 30 * 60 * 1000, // 30 min
    baseCoins: [100, 300],
    baseXp: 45,
    lootTable: [
      { itemId: 'racao_cringe', chance: 0.45 },
      { itemId: 'curativo_fofo', chance: 0.25 },
    ],
    description: 'Um gramado ensolarado com flores mágicas. Ideal para pets iniciantes.',
  },
  floresta: {
    key: 'floresta',
    name: 'Floresta Proibida da Cringelândia',
    emoji: '🌲',
    minLevel: 5,
    energyCost: 35,
    cooldownMs: 2 * 60 * 60 * 1000, // 2h
    baseCoins: [400, 900],
    baseXp: 130,
    lootTable: [
      { itemId: 'biscoito_morcego', chance: 0.5 },
      { itemId: 'curativo_fofo', chance: 0.35 },
      { itemId: 'bau_madeira', chance: 0.2 },
    ],
    description: 'Árvores retorcidas e neblina lilás. Animais selvagens espreitam nas sombras.',
  },
  mansao: {
    key: 'mansao',
    name: 'Mansão da Kuromi',
    emoji: '🏰',
    minLevel: 15,
    energyCost: 50,
    cooldownMs: 4 * 60 * 60 * 1000, // 4h
    baseCoins: [1200, 2500],
    baseXp: 380,
    lootTable: [
      { itemId: 'sushizinho', chance: 0.5 },
      { itemId: 'pocao_vida', chance: 0.4 },
      { itemId: 'elixir_xp', chance: 0.25 },
      { itemId: 'gema_evolucao', chance: 0.1 },
    ],
    description: 'Salões góticos repletos de segredos e armadilhas sob a supervisão da Kuromi.',
  },
  vortice: {
    key: 'vortice',
    name: 'Vórtice Cósmico do Caos',
    emoji: '🌌',
    minLevel: 30,
    energyCost: 75,
    cooldownMs: 8 * 60 * 60 * 1000, // 8h
    baseCoins: [3000, 7000],
    baseXp: 900,
    lootTable: [
      { itemId: 'bau_caos', chance: 0.45 },
      { itemId: 'elixir_xp', chance: 0.4 },
      { itemId: 'gema_evolucao', chance: 0.25 },
      { itemId: 'fragmento_shiny', chance: 0.08 },
    ],
    description: 'Uma fenda dimensional no tecido da Cringelândia. Perigo extremo e tesouros lendários.',
  },
};

function getDungeonZones() {
  return Object.values(DUNGEON_ZONES);
}

function getZone(key) {
  return DUNGEON_ZONES[key] || null;
}

function exploreDungeon(userId, zoneKey = 'jardim', now = Date.now(), random = Math.random) {
  const pet = getActivePet(userId);
  if (!pet) return { success: false, reason: 'no_pet' };

  const zone = getZone(zoneKey) || DUNGEON_ZONES.jardim;

  if (pet.level < zone.minLevel) {
    return {
      success: false,
      reason: 'low_level',
      requiredLevel: zone.minLevel,
      petLevel: pet.level,
      zone,
    };
  }

  if (pet.hunger < 15) {
    return { success: false, reason: 'too_hungry', hunger: pet.hunger };
  }

  if (pet.energy < zone.energyCost) {
    return { success: false, reason: 'no_energy', energy: pet.energy, requiredEnergy: zone.energyCost };
  }

  const lastExplore = pet.lastExploreAt || 0;
  const elapsed = now - lastExplore;
  if (elapsed < zone.cooldownMs) {
    return {
      success: false,
      reason: 'cooldown',
      remainingMs: zone.cooldownMs - elapsed,
      zone,
    };
  }

  // Desconta energia e adiciona fome
  pet.energy = Math.max(0, pet.energy - zone.energyCost);
  pet.hunger = Math.max(0, pet.hunger - 15);
  pet.lastExploreAt = now;
  pet.totalExploracoes = (pet.totalExploracoes || 0) + 1;

  // Cálculo de moedas ganhas
  const [minC, maxC] = zone.baseCoins;
  const luckBonus = pet.happiness >= 80 ? 1.25 : 1.0;
  const coinsReward = Math.floor((minC + random() * (maxC - minC)) * luckBonus);

  // Eventos aleatórios (Monstro ou Armadilha)
  let monsterDefeated = false;
  let tookDamage = false;
  let damageTaken = 0;

  const eventRoll = random();
  if (eventRoll < 0.2) {
    // Encontro com Monstro
    monsterDefeated = true;
  } else if (eventRoll < 0.3) {
    // Armadilha
    tookDamage = true;
    damageTaken = Math.floor(10 + random() * 20);
    pet.stats.hp = Math.max(1, (pet.stats.hp || pet.stats.maxHp) - damageTaken);
  }

  // Drops de Itens
  const droppedItems = [];
  for (const loot of zone.lootTable) {
    if (random() < loot.chance * luckBonus) {
      const itemDef = getItemDefinition(loot.itemId);
      if (itemDef) {
        addItem(userId, loot.itemId, 1);
        droppedItems.push(itemDef);
      }
    }
  }

  // Entrega de XP e Moedas
  const xpResult = awardPetXp(userId, pet.id, zone.baseXp + (monsterDefeated ? 50 : 0));
  const updatedAccount = updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + coinsReward;
  });

  return {
    success: true,
    pet,
    zone,
    coinsReward,
    xpAwarded: zone.baseXp + (monsterDefeated ? 50 : 0),
    leveledUp: xpResult.leveledUp,
    newLevel: pet.level,
    droppedItems,
    monsterDefeated,
    tookDamage,
    damageTaken,
    balance: updatedAccount.coins,
  };
}

module.exports = {
  DUNGEON_ZONES,
  getDungeonZones,
  getZone,
  exploreDungeon,
};
