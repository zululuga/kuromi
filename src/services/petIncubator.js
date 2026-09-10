const crypto = require('node:crypto');
const petsCatalog = require('../data/petsData.json');
const { getItemDefinition, removeItem, hasItem } = require('./inventory');

const DEFAULT_INCUBATOR_SLOTS = 3;
const MAX_INCUBATOR_SLOTS = 5;

/**
 * Retorna ou inicializa o registro da chocadeira do usuário.
 */
function ensureUserIncubator(userRecord) {
  if (!userRecord.incubator) {
    userRecord.incubator = {
      maxSlots: DEFAULT_INCUBATOR_SLOTS,
      slots: [],
    };
  }
  if (!userRecord.incubator.maxSlots) {
    userRecord.incubator.maxSlots = DEFAULT_INCUBATOR_SLOTS;
  }
  if (!Array.isArray(userRecord.incubator.slots)) {
    userRecord.incubator.slots = [];
  }
  return userRecord.incubator;
}

/**
 * Retorna as informações formatadas dos slots da chocadeira em tempo real via delta-time.
 */
function getIncubatorStatus(userRecord) {
  const incubator = ensureUserIncubator(userRecord);
  const now = Date.now();

  const formattedSlots = [];
  for (let i = 0; i < incubator.maxSlots; i++) {
    const activeEgg = incubator.slots.find((s) => s.slotIndex === i);
    if (!activeEgg) {
      formattedSlots.push({
        slotIndex: i,
        empty: true,
        label: `Slot #${i + 1}: Vazio`,
      });
    } else {
      const tempoRestanteMs = Math.max(0, activeEgg.chocaEm - now);
      const totalDuration = activeEgg.duracaoMs || 7200000;
      const elapsed = Math.max(0, totalDuration - tempoRestanteMs);
      const progress = Math.min(100, Math.floor((elapsed / totalDuration) * 100));

      formattedSlots.push({
        slotIndex: i,
        empty: false,
        eggId: activeEgg.eggId,
        eggName: activeEgg.eggName,
        element: activeEgg.element,
        emoji: activeEgg.emoji || '🥚',
        rarity: activeEgg.rarity,
        boostShiny: activeEgg.boostShiny || 0.18,
        iniciadoEm: activeEgg.iniciadoEm,
        chocaEm: activeEgg.chocaEm,
        duracaoMs: totalDuration,
        tempoRestanteMs,
        ready: tempoRestanteMs === 0,
        progressPercent: progress,
        label: `Slot #${i + 1}: ${activeEgg.emoji} ${activeEgg.eggName} (${tempoRestanteMs === 0 ? '🐣 Pronto!' : `${Math.ceil(tempoRestanteMs / 60000)}m`})`,
      });
    }
  }

  return {
    maxSlots: incubator.maxSlots,
    slots: formattedSlots,
    activeCount: incubator.slots.length,
    freeCount: Math.max(0, incubator.maxSlots - incubator.slots.length),
  };
}

/**
 * Coloca um ovo do inventário em um slot da chocadeira.
 */
function placeEggInSlot(userId, userRecord, eggItemId, slotIndex, scheduleSaveFn) {
  const itemDef = getItemDefinition(eggItemId);
  if (!itemDef || !itemDef.effects || !itemDef.effects.isEgg) {
    return { success: false, reason: 'invalid_egg', message: 'Este item não é um ovo incubável.' };
  }

  if (!hasItem(userId, eggItemId, 1)) {
    return { success: false, reason: 'no_egg_in_inventory', message: 'Você não possui este ovo na mochila.' };
  }

  const incubator = ensureUserIncubator(userRecord);
  const targetSlot = Number(slotIndex);

  if (targetSlot < 0 || targetSlot >= incubator.maxSlots) {
    return { success: false, reason: 'invalid_slot', message: 'Slot de chocadeira inválido.' };
  }

  if (incubator.slots.some((s) => s.slotIndex === targetSlot)) {
    return { success: false, reason: 'slot_occupied', message: 'Este ninho já possui um ovo incubando.' };
  }

  // Consome o ovo da mochila
  const removed = removeItem(userId, eggItemId, 1);
  if (!removed) {
    return { success: false, reason: 'removal_failed', message: 'Falha ao retirar o ovo da mochila.' };
  }

  const now = Date.now();
  const durationMs = itemDef.effects.hatchDurationMs || 7200000;
  const newEggSlot = {
    slotIndex: targetSlot,
    eggId: itemDef.id,
    eggName: itemDef.name,
    element: itemDef.effects.element || 'SILVESTRE',
    emoji: itemDef.emoji || '🥚',
    rarity: itemDef.rarity || 'RARO',
    iniciadoEm: now,
    duracaoMs: durationMs,
    chocaEm: now + durationMs,
    boostShiny: itemDef.effects.boostShiny || 0.18,
  };

  incubator.slots.push(newEggSlot);
  if (scheduleSaveFn) scheduleSaveFn();

  return {
    success: true,
    egg: newEggSlot,
    message: `Você colocou o ${itemDef.emoji} **${itemDef.name}** no ninho #${targetSlot + 1}! Tempo: ${Math.round(durationMs / 3600000)}h.`,
  };
}

/**
 * Quebra a casca e choca o ovo pronto em um slot.
 */
function hatchSlotEgg(userId, userRecord, slotIndex, scheduleSaveFn) {
  const incubator = ensureUserIncubator(userRecord);
  const targetSlot = Number(slotIndex);
  const eggIndex = incubator.slots.findIndex((s) => s.slotIndex === targetSlot);

  if (eggIndex === -1) {
    return { success: false, reason: 'no_egg', message: 'Não há nenhum ovo neste slot.' };
  }

  const egg = incubator.slots[eggIndex];
  const now = Date.now();
  if (egg.chocaEm > now) {
    const minsLeft = Math.ceil((egg.chocaEm - now) / 60000);
    return {
      success: false,
      reason: 'not_ready',
      message: `Este ovo ainda está quentinho na casca! Faltam **${minsLeft} minutos**.`,
    };
  }

  // Filtra pets do elemento do ovo
  const availableSpecies = Object.values(petsCatalog).filter(
    (p) => !egg.element || p.element === egg.element
  );

  const species = availableSpecies.length > 0
    ? availableSpecies[Math.floor(Math.random() * availableSpecies.length)]
    : petsCatalog.spiralo || Object.values(petsCatalog)[0];

  // Rola Shiny com taxa turbinada da chocadeira (15% a 20%)
  const shinyRate = egg.boostShiny || 0.18;
  const isShiny = Math.random() < shinyRate;

  // Cria a instância do novo Pet
  const petId = `pet_${crypto.randomUUID().slice(0, 8)}`;
  const baseStats = species.baseStats || { hp: 55, atk: 12, def: 12, spd: 12 };

  const newPet = {
    id: petId,
    key: species.key,
    name: species.name,
    species: species.name,
    element: species.element,
    rarity: species.rarity,
    emoji: species.emoji,
    shiny: isShiny,
    corrupt: false,
    level: 1,
    xp: 0,
    xpToNext: 100,
    stats: {
      maxHp: baseStats.hp,
      hp: baseStats.hp,
      atk: baseStats.atk,
      def: baseStats.def,
      spd: baseStats.spd,
    },
    hunger: 100,
    happiness: 100,
    energy: 100,
    lastFedAt: now,
    lastCarinhoAt: 0,
    lastSleepAt: 0,
    lastExploreAt: 0,
    adoptedAt: now,
    hatchedFromEgg: true,
    totalExploracoes: 0,
    duelosVencidos: 0,
    duelosPerdidos: 0,
  };

  if (!Array.isArray(userRecord.pets)) {
    userRecord.pets = [];
  }
  userRecord.pets.push(newPet);

  if (!userRecord.activePetId) {
    userRecord.activePetId = petId;
  }

  // Registra descoberta na Dex
  if (!userRecord.dex) userRecord.dex = {};
  if (!userRecord.dex[species.key]) {
    userRecord.dex[species.key] = {
      discovered: true,
      shinyDiscovered: Boolean(isShiny),
      firstSeenAt: now,
    };
  } else {
    userRecord.dex[species.key].discovered = true;
    if (isShiny) {
      userRecord.dex[species.key].shinyDiscovered = true;
    }
  }

  // Remove o ovo da chocadeira
  incubator.slots.splice(eggIndex, 1);
  if (scheduleSaveFn) scheduleSaveFn();

  return {
    success: true,
    pet: newPet,
    isShiny,
    species,
    message: isShiny
      ? `✨ **RARO BRILHANTE!** O ovo chocou e nasceu um **${species.name} SHINY** ${species.emoji}! Parodiando a sorte mágica!`
      : `🐣 **Eclosão Mágica!** O ovo chocou e nasceu um lindo **${species.name}** ${species.emoji}!`,
  };
}

/**
 * Usa uma ampulheta mágica para adiantar o tempo de um ovo.
 */
function applyHourglass(userId, userRecord, slotIndex, hourglassItemId, scheduleSaveFn) {
  const itemDef = getItemDefinition(hourglassItemId);
  if (!itemDef || !itemDef.effects || !itemDef.effects.isHourglass) {
    return { success: false, reason: 'invalid_hourglass', message: 'Item de ampulheta inválido.' };
  }

  if (!hasItem(userId, hourglassItemId, 1)) {
    return { success: false, reason: 'no_hourglass', message: 'Você não possui esta ampulheta na mochila.' };
  }

  const incubator = ensureUserIncubator(userRecord);
  const targetSlot = Number(slotIndex);
  const egg = incubator.slots.find((s) => s.slotIndex === targetSlot);

  if (!egg) {
    return { success: false, reason: 'no_egg_in_slot', message: 'Não há nenhum ovo neste ninho para acelerar.' };
  }

  const reduceMs = itemDef.effects.reduceMs || 7200000;
  egg.chocaEm = Math.max(Date.now(), egg.chocaEm - reduceMs);

  removeItem(userId, hourglassItemId, 1);
  if (scheduleSaveFn) scheduleSaveFn();

  const minsLeft = Math.max(0, Math.ceil((egg.chocaEm - Date.now()) / 60000));
  return {
    success: true,
    egg,
    reducedHours: Math.round(reduceMs / 3600000),
    minsLeft,
    message: `⏳ Você usou **${itemDef.name}**! O tempo de eclosão do ${egg.emoji} **${egg.eggName}** foi reduzido em ${Math.round(reduceMs / 3600000)}h (Restam: ${minsLeft}m).`,
  };
}

/**
 * Expande os slots da chocadeira de 3 para 5.
 */
function expandIncubator(userId, userRecord, scheduleSaveFn) {
  const incubator = ensureUserIncubator(userRecord);
  if (incubator.maxSlots >= MAX_INCUBATOR_SLOTS) {
    return { success: false, reason: 'already_max_slots', message: 'Sua chocadeira já está na capacidade máxima (5 ninhos)!' };
  }

  if (!hasItem(userId, 'ninho_encantado', 1)) {
    return { success: false, reason: 'no_item', message: 'Você precisa do item **Ninho Encantado** para expandir a chocadeira.' };
  }

  removeItem(userId, 'ninho_encantado', 1);
  incubator.maxSlots = MAX_INCUBATOR_SLOTS;
  if (scheduleSaveFn) scheduleSaveFn();

  return {
    success: true,
    maxSlots: MAX_INCUBATOR_SLOTS,
    message: '🪺 **Chocadeira Expandida!** Você agora possui **5 ninhos simultâneos** para chocar ovos!',
  };
}

module.exports = {
  DEFAULT_INCUBATOR_SLOTS,
  MAX_INCUBATOR_SLOTS,
  ensureUserIncubator,
  getIncubatorStatus,
  placeEggInSlot,
  hatchSlotEgg,
  applyHourglass,
  expandIncubator,
};

