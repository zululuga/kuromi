const crypto = require('node:crypto');
const { updateUserAccount } = require('./economy');
const { addItem } = require('./inventory');

const RUN_TTL_MS = 15 * 60 * 1000; // 15 minutos de TTL em RAM
const activeRuns = new Map();

const TERRAINS = [
  { id: 'plana', name: 'Trilha Plana', emoji: '🌿', costModifier: 0, desc: 'Caminho limpo e seguro.' },
  { id: 'lamacal', name: 'Pântano de Orvalho', emoji: '🫧', costModifier: 4, desc: 'Lama viscosa que exige esforço extra (+4 ⚡).' },
  { id: 'vento', name: 'Corredor de Vento', emoji: '🪽', costModifier: -3, desc: 'Correntes de ar favoráveis ajudam a planar (-3 ⚡).' },
];

const DUNGEON_ZONES = [
  {
    id: 'bosque',
    name: 'Bosque dos Guizos',
    minLevel: 1,
    emoji: '🌲',
    desc: 'Floresta encantada onde fadas bobas escondem moedas e ovos silvestres.',
    eggs: ['ovo_silvestre', 'ovo_orvalho'],
  },
  {
    id: 'recife',
    name: 'Recifes Cantantes',
    minLevel: 2,
    emoji: '🫧',
    desc: 'Litoral mágico de águas cintilantes e corais de cristal.',
    eggs: ['ovo_orvalho', 'ovo_brisa'],
  },
  {
    id: 'colina',
    name: 'Colinas do Vento Doce',
    minLevel: 3,
    emoji: '🪽',
    desc: 'Montanhas suaves com brisas perfumadas e ninhos de pássaros arcanos.',
    eggs: ['ovo_brisa', 'ovo_charme'],
  },
  {
    id: 'castelo',
    name: 'Castelo Travesso de Pyxie',
    minLevel: 5,
    emoji: '🏰',
    desc: 'Labirinto de espelhos mágicos, ilusões e os tesouros mais raros.',
    eggs: ['ovo_charme', 'ovo_travessura'],
  },
];

function cleanupExpiredRuns() {
  const now = Date.now();
  for (const [userId, run] of activeRuns.entries()) {
    if (now - run.lastActivityAt > RUN_TTL_MS) {
      activeRuns.delete(userId);
    }
  }
}

function getDungeonZones() {
  return DUNGEON_ZONES;
}

function getProceduralRun(userId) {
  cleanupExpiredRuns();
  return activeRuns.get(userId) || null;
}

/**
 * Inicia uma nova expedição procedural em memória RAM.
 */
function startProceduralRun(userId, zoneId = 'bosque', activePet) {
  if (!activePet) {
    return { success: false, reason: 'no_pet', message: 'Você precisa de um pet ativo para explorar.' };
  }

  if (activePet.energy < 15) {
    return {
      success: false,
      reason: 'low_energy',
      message: `Seu pet ${activePet.name} está exausto (${activePet.energy}/100 ⚡). Deixe-o descansar ou use uma poção de energia!`,
    };
  }

  const zone = DUNGEON_ZONES.find((z) => z.id === zoneId) || DUNGEON_ZONES[0];
  if (activePet.level < zone.minLevel) {
    return {
      success: false,
      reason: 'low_level',
      message: `Esta zona exige nível mínimo **${zone.minLevel}** (Seu pet é Nv. ${activePet.level}).`,
    };
  }

  const newRun = {
    userId,
    runId: `run_${crypto.randomUUID().slice(0, 8)}`,
    zone,
    step: 0,
    maxSteps: 10 + activePet.level * 2,
    coinsAccumulated: 0,
    xpAccumulated: 0,
    eggsFound: [],
    itemsFound: [],
    logs: [`🐾 **${activePet.name}** adentrou em **${zone.name}**!`],
    currentTerrain: TERRAINS[0],
    lastActivityAt: Date.now(),
  };

  activeRuns.set(userId, newRun);
  return { success: true, run: newRun };
}

/**
 * Executa um passo na expedição procedural, consumindo estamina do pet.
 */
function advanceStep(userId, activePet) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Você não tem nenhuma expedição ativa. Inicie uma nova!' };
  }

  // Sorteia o terreno do passo
  const terrain = TERRAINS[Math.floor(Math.random() * TERRAINS.length)];
  run.currentTerrain = terrain;
  const baseCost = 8;
  const totalCost = Math.max(3, baseCost + terrain.costModifier);

  // Valida energia
  if (activePet.energy < totalCost) {
    return {
      success: false,
      reason: 'exhausted',
      cost: totalCost,
      message: `⚡ **Exaustão!** ${activePet.name} não tem energia suficiente para atravessar o **${terrain.name}** (Precisa de ${totalCost}⚡, possui ${activePet.energy}⚡). Resgate seus espólios ou tome uma poção!`,
    };
  }

  // Consome energia e fome
  activePet.energy = Math.max(0, activePet.energy - totalCost);
  activePet.hunger = Math.max(0, activePet.hunger - 2);
  run.step += 1;
  run.lastActivityAt = Date.now();

  // Rola o evento procedural do passo
  const roll = Math.random();
  let eventResult = {};

  if (roll < 0.40) {
    // 40% Encontro Selvagem (Combate Rápido em RAM)
    const enemyAtk = Math.max(5, Math.floor(activePet.stats.atk * 0.8 + Math.random() * 5));
    const damageTaken = Math.max(2, Math.floor(enemyAtk - activePet.stats.def * 0.3));
    activePet.stats.hp = Math.max(1, activePet.stats.hp - damageTaken);

    const coinsWon = Math.floor(30 + Math.random() * 50 + activePet.level * 10);
    const xpWon = Math.floor(15 + Math.random() * 20);

    run.coinsAccumulated += coinsWon;
    run.xpAccumulated += xpWon;

    eventResult = {
      type: 'BATTLE',
      emoji: '⚔️',
      title: 'Monstro das Sombras!',
      description: `${activePet.name} venceu uma criatura selvagem e recolheu **+${coinsWon} moedas** e **+${xpWon} XP** (Sofreu -${damageTaken} HP).`,
    };
  } else if (roll < 0.60) {
    // 20% Ninho Selvagem com Ovo
    const possibleEggs = run.zone.eggs;
    const eggId = possibleEggs[Math.floor(Math.random() * possibleEggs.length)];
    const eggName = eggId === 'ovo_orvalho' ? 'Ovo de Orvalho 🫧'
      : eggId === 'ovo_brisa' ? 'Ovo de Brisa 🪽'
      : eggId === 'ovo_silvestre' ? 'Ovo Silvestre 🍃'
      : eggId === 'ovo_charme' ? 'Ovo de Charme 🎀' : 'Ovo de Travessura 🖤';

    run.eggsFound.push(eggId);
    run.xpAccumulated += 25;

    eventResult = {
      type: 'EGG_NEST',
      emoji: '🪺',
      title: 'Ninho Secreto Descoberto!',
      description: `Entre folhas mágicas, ${activePet.name} encontrou um **${eggName}** intacto! O ovo foi guardado nos espólios da viagem.`,
    };
  } else if (roll < 0.80) {
    // 20% Fonte Restauradora
    const recoveredEnergy = 15;
    activePet.energy = Math.min(100, activePet.energy + recoveredEnergy);
    run.xpAccumulated += 10;

    eventResult = {
      type: 'FOUNTAIN',
      emoji: '⛲',
      title: 'Fonte Cristalina de Pyxie',
      description: `Uma água pura e revigorante restaurou **+${recoveredEnergy} ⚡ de Energia** para ${activePet.name}!`,
    };
  } else {
    // 20% Armadilha / Emboscada
    const trapDmg = Math.floor(8 + Math.random() * 8);
    activePet.stats.hp = Math.max(1, activePet.stats.hp - trapDmg);

    eventResult = {
      type: 'TRAP',
      emoji: '🪤',
      title: 'Armadilha Antiga!',
      description: `${activePet.name} pisou em falso e acionou espinhos mágicos (-${trapDmg} HP).`,
    };
  }

  run.logs.push(`[Passo ${run.step} - ${terrain.emoji}] ${eventResult.description}`);
  if (run.logs.length > 5) run.logs.shift();

  return {
    success: true,
    run,
    terrain,
    cost: totalCost,
    event: eventResult,
    petStatus: {
      hp: activePet.stats.hp,
      maxHp: activePet.stats.maxHp,
      energy: activePet.energy,
      hunger: activePet.hunger,
    },
  };
}

/**
 * Recuo voluntário da expedição: Salva 100% dos espólios e envia ovos para a mochila.
 */
function retreatRun(userId, activePet, awardXpFn) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Nenhuma expedição em andamento.' };
  }

  // Adiciona moedas na economia
  updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + run.coinsAccumulated;
  });

  // Adiciona os ovos e itens no inventário
  for (const eggId of run.eggsFound) {
    addItem(userId, eggId, 1);
  }

  // Concede XP ao pet se função fornecida
  let xpResult = null;
  if (awardXpFn && run.xpAccumulated > 0) {
    xpResult = awardXpFn(userId, activePet.id, run.xpAccumulated);
  }

  activeRuns.delete(userId);

  return {
    success: true,
    coinsWon: run.coinsAccumulated,
    xpWon: run.xpAccumulated,
    eggsWon: run.eggsFound,
    stepsWalked: run.step,
    leveledUp: xpResult ? xpResult.leveledUp : false,
    newLevel: activePet.level,
    message: `🎉 **Expedição Concluída com Sucesso!** Você resgatou **${run.coinsAccumulated} moedas**, **+${run.xpAccumulated} XP** e **${run.eggsFound.length} ovos**!`,
  };
}

/**
 * Fuga de emergência / pânico: Resgata 50% das moedas e perde todos os ovos coletados.
 */
function panicFlee(userId, activePet) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Nenhuma expedição em andamento.' };
  }

  const partialCoins = Math.floor(run.coinsAccumulated * 0.5);
  updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + partialCoins;
  });

  activeRuns.delete(userId);

  return {
    success: true,
    partialCoins,
    lostEggs: run.eggsFound.length,
    message: `💨 **Fuga Desesperada!** ${activePet.name} fugiu em pânico com energia esgotada. Conseguiu salvar apenas **${partialCoins} moedas** (50%) e os ${run.eggsFound.length} ovos foram perdidos no caminho.`,
  };
}

module.exports = {
  getDungeonZones,
  getProceduralRun,
  startProceduralRun,
  advanceStep,
  retreatRun,
  panicFlee,
  activeRuns,
};

