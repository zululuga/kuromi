const crypto = require('node:crypto');
const { updateUserAccount } = require('./economy');
const { addItem } = require('./inventory');

const RUN_TTL_MS = 15 * 60 * 1000; // 15 minutos de TTL em RAM
const activeRuns = new Map();

const TERRAINS = [
  { id: 'plana', name: 'Trilha Plana', emoji: '🌿', costModifier: 0, desc: 'Caminho limpo e seguro.' },
  { id: 'lamacal', name: 'Pântano de Orvalho', emoji: '💧', costModifier: 4, desc: 'Lama viscosa que exige esforço extra (+4 ⚡).' },
  { id: 'vento', name: 'Corredor de Vento', emoji: '🪶', costModifier: -3, desc: 'Correntes de ar favoráveis ajudam a planar (-3 ⚡).' },
];

const DUNGEON_ZONES = [
  {
    id: 'bosque',
    name: 'Bosque dos Guizos',
    minLevel: 1,
    emoji: '🌲',
    desc: 'Floresta encantada onde fadas bobas escondem moedas e ovos silvestres.',
    eggs: ['ovo_silvestre', 'ovo_orvalho'],
    gridW: 5,
    gridH: 5,
  },
  {
    id: 'recife',
    name: 'Recifes Cantantes',
    minLevel: 2,
    emoji: '💧',
    desc: 'Litoral mágico de águas cintilantes e corais de cristal.',
    eggs: ['ovo_orvalho', 'ovo_brisa'],
    gridW: 5,
    gridH: 5,
  },
  {
    id: 'colina',
    name: 'Colinas do Vento Doce',
    minLevel: 3,
    emoji: '🪶',
    desc: 'Montanhas suaves com brisas perfumadas e ninhos de pássaros arcanos.',
    eggs: ['ovo_brisa', 'ovo_charme'],
    gridW: 6,
    gridH: 6,
  },
  {
    id: 'castelo',
    name: 'Castelo Travesso de Pyxie',
    minLevel: 5,
    emoji: '🏰',
    desc: 'Labirinto de espelhos mágicos, ilusões e os tesouros mais raros.',
    eggs: ['ovo_charme', 'ovo_travessura'],
    gridW: 6,
    gridH: 6,
  },
];

const NPC_TITLES = [
  'Treinador', 'Treinadora', 'Mago', 'Maga', 'Explorador', 'Exploradora',
  'Domador', 'Domadora', 'Alquimista', 'Patrulheiro', 'Guardiã', 'Aventureiro',
];
const NPC_FIRST_NAMES = [
  'Kaelen', 'Lunara', 'Zephyr', 'Maya', 'Ignis', 'Torin', 'Seraphina',
  'Flynn', 'Rowan', 'Lyra', 'Dante', 'Aria', 'Finn', 'Thorne', 'Chloe',
];

function generateNpcTrainer(playerLevel = 1) {
  const title = NPC_TITLES[Math.floor(Math.random() * NPC_TITLES.length)];
  const name = NPC_FIRST_NAMES[Math.floor(Math.random() * NPC_FIRST_NAMES.length)];
  const fullName = `${title} ${name}`;

  const { getPetsCatalog } = require('./pets');
  const catalog = getPetsCatalog();
  const catalogKeys = Object.keys(catalog);
  const randomKey = catalogKeys[Math.floor(Math.random() * catalogKeys.length)] || 'cinna';
  const petDef = catalog[randomKey];

  const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
  const baseStats = petDef.baseStats || { hp: 55, atk: 12, def: 12, spd: 12 };
  const lvlMult = Math.max(0, level - 1);

  return {
    name: fullName,
    petDef,
    level,
    stats: {
      maxHp: baseStats.hp + lvlMult * 10,
      hp: baseStats.hp + lvlMult * 10,
      atk: baseStats.atk + lvlMult * 2,
      def: baseStats.def + lvlMult * 1,
      spd: baseStats.spd + lvlMult * 1,
    },
  };
}

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
 * Revela a névoa de guerra ao redor da posição (px, py).
 */
function revealGridNeighbors(grid, width, height, px, py) {
  if (!grid || !grid[py] || !grid[py][px]) return;
  grid[py][px].revealed = true;
  grid[py][px].visited = true;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (grid[ny] && grid[ny][nx]) {
          grid[ny][nx].revealed = true;
        }
      }
    }
  }
}

/**
 * Gera a matriz procedural de salas 2D da Masmorra.
 */
function generateDungeonGrid(zone) {
  const width = zone.gridW || 5;
  const height = zone.gridH || 5;
  const grid = [];

  const possibleEvents = [
    { type: 'BATTLE', weight: 35 },
    { type: 'NPC_DUEL', weight: 20 },
    { type: 'CHEST', weight: 15 },
    { type: 'EGG_NEST', weight: 10 },
    { type: 'TRAP', weight: 8 },
    { type: 'FOUNTAIN', weight: 6 },
    { type: 'EMPTY', weight: 6 },
  ];

  function pickRandomEvent() {
    const totalWeight = possibleEvents.reduce((sum, e) => sum + e.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const ev of possibleEvents) {
      if (rand < ev.weight) return ev.type;
      rand -= ev.weight;
    }
    return 'BATTLE';
  }

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const terrain = TERRAINS[Math.floor(Math.random() * TERRAINS.length)];
      const eventType = pickRandomEvent();
      row.push({
        x,
        y,
        terrain,
        eventType,
        revealed: false,
        visited: false,
        cleared: false,
      });
    }
    grid.push(row);
  }

  // 1. Ponto Inicial (0, 0)
  grid[0][0].eventType = 'START';
  grid[0][0].terrain = TERRAINS[0];
  grid[0][0].revealed = true;
  grid[0][0].visited = true;
  grid[0][0].cleared = true;

  // 2. Portal de Saída (width - 1, height - 1)
  const exitX = width - 1;
  const exitY = height - 1;
  grid[exitY][exitX].eventType = 'EXIT';
  grid[exitY][exitX].terrain = TERRAINS[0];

  // Revela o início e seus arredores
  revealGridNeighbors(grid, width, height, 0, 0);

  return {
    grid,
    gridW: width,
    gridH: height,
    playerPos: { x: 0, y: 0 },
    exitPos: { x: exitX, y: exitY },
  };
}

/**
 * Inicia uma nova expedição procedural em memória RAM com mapa em grade 2D.
 */
function startProceduralRun(userId, zoneId = 'bosque', activePet) {
  if (!activePet) {
    return { success: false, reason: 'no_pet', message: 'Você precisa de um pet ativo para explorar.' };
  }

  // Proibição: Pet desmaiado (0 HP)
  if (activePet.stats && activePet.stats.hp <= 0) {
    return {
      success: false,
      reason: 'fainted',
      message: `💀 **Pet Desmaiado!** **${activePet.name}** está com **0 HP (desmaiado)**. Use um **Curativo** na Mochila ou deixe-o dormir para revivê-lo antes de explorar!`,
    };
  }

  // Proibição: 0% de Fome
  if (typeof activePet.hunger === 'number' && activePet.hunger <= 0) {
    return {
      success: false,
      reason: 'starving',
      message: `🍖 **Pymon Faminto!** **${activePet.name}** está com **0% de fome** e fraco demais para se aventurar. Alimente-o na aba **Meu Pymon** ou na **Mochila** antes de iniciar a exploração!`,
    };
  }

  // Proibição: Energia insuficiente
  if (typeof activePet.energy === 'number' && activePet.energy <= 0) {
    return {
      success: false,
      reason: 'low_energy',
      message: `⚡ **Sem Energia (0 ⚡)!** **${activePet.name}** está completamente sem energia. Deixe-o descansar ou use um **Frasco de Éter** na Mochila!`,
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

  const gridData = generateDungeonGrid(zone);

  const newRun = {
    userId,
    runId: `run_${crypto.randomUUID().slice(0, 8)}`,
    zone,
    grid: gridData.grid,
    gridW: gridData.gridW,
    gridH: gridData.gridH,
    playerPos: gridData.playerPos,
    exitPos: gridData.exitPos,
    step: 0,
    maxSteps: 15 + activePet.level * 2,
    coinsAccumulated: 0,
    xpAccumulated: 0,
    eggsFound: [],
    chestsFound: [],
    itemsFound: [],
    logs: [`🐾 **${activePet.name}** adentrou em **${zone.name}**! Navegue pelo mapa com o D-Pad.`],
    currentTerrain: TERRAINS[0],
    isExhausted: false,
    atExit: false,
    lastActivityAt: Date.now(),
  };

  activeRuns.set(userId, newRun);
  return { success: true, run: newRun };
}

/**
 * Move o jogador pelo grid procedural (UP, DOWN, LEFT, RIGHT).
 */
function movePlayer(userId, direction, activePet, awardXpFn) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Você não tem nenhuma expedição ativa. Inicie uma nova!' };
  }

  // Validação: Pet desmaiado
  if (activePet.stats && activePet.stats.hp <= 0) {
    return {
      success: false,
      reason: 'fainted',
      message: `💀 **Pet Desmaiado!** **${activePet.name}** está com **0 HP**. Resgate os espólios ou cuide dele!`,
    };
  }

  // Validação: 0% de Fome durante a aventura
  if (typeof activePet.hunger === 'number' && activePet.hunger <= 0) {
    return {
      success: false,
      reason: 'starving',
      message: `🍖 **Fome Crítica!** **${activePet.name}** chegou a **0% de fome** e recusa-se a avançar sem comer. Alimente-o na Mochila para continuar!`,
    };
  }

  // Valida se a energia já estava zerada
  if (typeof activePet.energy === 'number' && activePet.energy <= 0) {
    run.isExhausted = true;
    return {
      success: false,
      reason: 'exhausted',
      cost: 0,
      message: `⚡ **Energia Esgotada (0 ⚡)!** **${activePet.name}** está totalmente exausto. Resgate seus espólios ou use um Frasco de Éter!`,
    };
  }

  const dirMap = {
    UP: { dx: 0, dy: -1, name: 'Norte ⬆️' },
    DOWN: { dx: 0, dy: 1, name: 'Sul ⬇️' },
    LEFT: { dx: -1, dy: 0, name: 'Oeste ⬅️' },
    RIGHT: { dx: 1, dy: 0, name: 'Leste ➡️' },
  };

  const dirData = dirMap[direction] || dirMap.RIGHT;
  const nx = run.playerPos.x + dirData.dx;
  const ny = run.playerPos.y + dirData.dy;

  // Validação de Limites da Grade
  if (nx < 0 || nx >= run.gridW || ny < 0 || ny >= run.gridH) {
    return {
      success: false,
      reason: 'wall',
      message: `🧱 **Parede de Masmorra!** Você encontrou o limite da sala ao ${dirData.name}. Escolha outra direção.`,
    };
  }

  const targetTile = run.grid[ny][nx];
  run.currentTerrain = targetTile.terrain;

  const baseCost = 10;
  const totalCost = Math.max(5, baseCost + (targetTile.terrain?.costModifier || 0));

  // Consome energia e atualiza fome
  activePet.energy = Math.max(0, activePet.energy - totalCost);
  activePet.lastEnergyUpdateAt = Date.now();
  activePet.hunger = Math.max(0, (typeof activePet.hunger === 'number' ? activePet.hunger : 80) - 2);

  run.playerPos = { x: nx, y: ny };
  run.step += 1;
  run.lastActivityAt = Date.now();

  if (activePet.energy === 0) {
    run.isExhausted = true;
  }

  // Revela névoa de guerra ao redor da nova posição
  revealGridNeighbors(run.grid, run.gridW, run.gridH, nx, ny);

  // Processa o Evento da Sala
  let eventResult = {};

  if (targetTile.cleared) {
    eventResult = {
      type: 'CLEARED',
      emoji: '👣',
      title: 'Corredor Seguro',
      description: `${activePet.name} moveu-se para (${nx + 1}, ${ny + 1}) em uma sala já explorada.`,
    };
  } else {
    targetTile.cleared = true;

    if (targetTile.eventType === 'EXIT') {
      run.atExit = true;
      const exitCoins = Math.floor(100 + activePet.level * 20);
      const exitXp = 50;
      run.coinsAccumulated += exitCoins;
      run.xpAccumulated += exitXp;

      eventResult = {
        type: 'EXIT',
        emoji: '🚩',
        title: 'Portal de Saída Descoberto!',
        description: `✨ ${activePet.name} encontrou o **Portal Mágico de Saída** da Dungeon! Ganhou **+${exitCoins} moedas** e **+${exitXp} XP**. Você pode resgatar 100% dos espólios com segurança!`,
      };
    } else if (targetTile.eventType === 'NPC_DUEL') {
      const npc = generateNpcTrainer(activePet.level);
      const playerCombatPower = (activePet.stats.atk * 1.3) + (activePet.stats.spd * 0.7) + (Math.random() * 12);
      const npcCombatPower = (npc.stats.atk * 1.3) + (npc.stats.spd * 0.7) + (Math.random() * 12);

      if (playerCombatPower >= npcCombatPower) {
        const coinsWon = Math.floor(65 + Math.random() * 65 + activePet.level * 15);
        const xpWon = Math.floor(30 + Math.random() * 25);
        const damageTaken = Math.max(3, Math.floor(npc.stats.atk * 0.45 - activePet.stats.def * 0.25));

        activePet.stats.hp = Math.max(0, activePet.stats.hp - damageTaken);
        run.coinsAccumulated += coinsWon;
        run.xpAccumulated += xpWon;

        eventResult = {
          type: 'NPC_DUEL',
          emoji: '🏆',
          title: 'Duelo com Treinador Vencido!',
          description: `${activePet.name} aceitou o desafio de **${npc.name}** (${npc.petDef.emoji} ${npc.petDef.name} Nv.${npc.level}) e **VENCEU**! Ganhou **+${coinsWon} moedas** e **+${xpWon} XP** (Sofreu -${damageTaken} HP).`,
        };
      } else {
        const damageTaken = Math.max(10, Math.floor(npc.stats.atk * 0.85 - activePet.stats.def * 0.25 + 5));
        const penaltyCoins = Math.min(run.coinsAccumulated, Math.floor(25 + Math.random() * 35 + activePet.level * 5));

        activePet.stats.hp = Math.max(0, activePet.stats.hp - damageTaken);
        run.coinsAccumulated = Math.max(0, run.coinsAccumulated - penaltyCoins);

        eventResult = {
          type: 'NPC_DUEL_LOSS',
          emoji: '💔',
          title: 'Derrota em Duelo com Treinador!',
          description: `**${npc.name}** e seu ${npc.petDef.emoji} **${npc.petDef.name}** superaram ${activePet.name}! Sofreu **-${damageTaken} HP** e perdeu **${penaltyCoins} moedas** dos espólios.`,
        };
      }
    } else if (targetTile.eventType === 'BATTLE') {
      const enemyAtk = Math.max(5, Math.floor(activePet.stats.atk * 0.8 + Math.random() * 5));
      const damageTaken = Math.max(2, Math.floor(enemyAtk - activePet.stats.def * 0.3));
      activePet.stats.hp = Math.max(0, activePet.stats.hp - damageTaken);

      const coinsWon = Math.floor(35 + Math.random() * 55 + activePet.level * 10);
      const xpWon = Math.floor(15 + Math.random() * 20);

      run.coinsAccumulated += coinsWon;
      run.xpAccumulated += xpWon;

      eventResult = {
        type: 'BATTLE',
        emoji: '👾',
        title: 'Monstro das Sombras!',
        description: `${activePet.name} venceu uma criatura selvagem e recolheu **+${coinsWon} moedas** e **+${xpWon} XP** (Sofreu -${damageTaken} HP).`,
      };
    } else if (targetTile.eventType === 'CHEST') {
      const isRareChest = Math.random() < 0.25;
      const chestId = isRareChest ? 'bau_caos' : 'bau_madeira';
      const chestName = isRareChest ? 'Baú Travesso de Pyxie 💜' : 'Baú Rústico 📦';
      run.chestsFound = run.chestsFound || [];
      run.chestsFound.push(chestId);
      run.xpAccumulated += 15;

      eventResult = {
        type: 'CHEST',
        emoji: '📦',
        title: 'Baú Misterioso Encontrado!',
        description: `${activePet.name} encontrou um **${chestName}** trancado entre as raízes! Guardado nos espólios.`,
      };
    } else if (targetTile.eventType === 'EGG_NEST') {
      const possibleEggs = run.zone.eggs;
      const eggId = possibleEggs[Math.floor(Math.random() * possibleEggs.length)];
      const eggName = eggId === 'ovo_orvalho' ? 'Ovo de Orvalho 💧'
        : eggId === 'ovo_brisa' ? 'Ovo de Brisa 🪶'
        : eggId === 'ovo_silvestre' ? 'Ovo Silvestre 🌿'
        : eggId === 'ovo_charme' ? 'Ovo de Charme 🌸' : 'Ovo de Travessura 🔮';

      run.eggsFound = run.eggsFound || [];
      run.eggsFound.push(eggId);
      run.xpAccumulated += 30;

      eventResult = {
        type: 'EGG_NEST',
        emoji: '🥚',
        title: 'Ninho Secreto Descoberto!',
        description: `Com muita sorte, ${activePet.name} encontrou um **${eggName}** raro! Guardado nos espólios.`,
      };
    } else if (targetTile.eventType === 'TRAP') {
      const trapDmg = Math.floor(8 + Math.random() * 8);
      activePet.stats.hp = Math.max(0, activePet.stats.hp - trapDmg);

      eventResult = {
        type: 'TRAP',
        emoji: '🪤',
        title: 'Armadilha Antiga!',
        description: `${activePet.name} pisou em falso e acionou espinhos mágicos (-${trapDmg} HP).`,
      };
    } else if (targetTile.eventType === 'FOUNTAIN') {
      const recoveredEnergy = 8;
      activePet.energy = Math.min(100, activePet.energy + recoveredEnergy);
      run.xpAccumulated += 10;

      eventResult = {
        type: 'FOUNTAIN',
        emoji: '⛲',
        title: 'Fonte Cristalina de Pyxie',
        description: `Uma brisa de orvalho revigorou ${activePet.name} (+${recoveredEnergy} ⚡ de Energia).`,
      };
    } else {
      eventResult = {
        type: 'EMPTY',
        emoji: '🌿',
        title: 'Clareira Serena',
        description: `${activePet.name} descansou brevemente por uma clareira mágica e segura.`,
      };
    }
  }

  run.logs.push(`[(${nx + 1},${ny + 1}) - ${targetTile.terrain.emoji}] ${eventResult.description}`);
  if (run.logs.length > 5) run.logs.shift();

  // VERIFICAÇÃO DE DESMAIO (HP zerado)
  if (activePet.stats.hp <= 0) {
    activePet.stats.hp = 0;
    activePet.energy = 0;
    activePet.happiness = Math.max(0, (activePet.happiness || 50) - 25);

    const faintCoins = Math.floor(run.coinsAccumulated * 0.25);
    const lostCoins = run.coinsAccumulated - faintCoins;
    const lostEggsCount = (run.eggsFound || []).length;

    updateUserAccount(userId, (acc) => {
      acc.coins = (Number(acc.coins) || 0) + faintCoins;
    });

    for (const chestId of (run.chestsFound || [])) {
      addItem(userId, chestId, 1);
    }

    activeRuns.delete(userId);

    const faintCompletionResult = {
      fainted: true,
      success: false,
      coinsWon: faintCoins,
      lostCoins,
      lostEggs: lostEggsCount,
      message: `💀 **DESMAIO EM COMBATE!** **${activePet.name}** sofreu ferimentos graves e chegou a **0 HP (desmaiado)**!\nUma fada socorrista de Pyxie o resgatou às pressas da dungeon: você recuperou apenas **+${faintCoins} moedas** (perdeu ${lostCoins} moedas abandonadas na fuga)${lostEggsCount > 0 ? `, todos os ${lostEggsCount} ovo(s) se quebraram` : ''} e o pet ficou com **0 HP e 0 ⚡**. Use um **Curativo** na Mochila ou deixe-o dormir!`,
    };

    return {
      success: true,
      run,
      terrain: targetTile.terrain,
      cost: totalCost,
      event: eventResult,
      autoCompleted: true,
      fainted: true,
      completionResult: faintCompletionResult,
      petStatus: {
        hp: 0,
        maxHp: activePet.stats.maxHp,
        energy: activePet.energy,
        hunger: activePet.hunger,
      },
    };
  }

  return {
    success: true,
    run,
    terrain: targetTile.terrain,
    cost: totalCost,
    event: eventResult,
    autoCompleted: false,
    fainted: false,
    petStatus: {
      hp: activePet.stats.hp,
      maxHp: activePet.stats.maxHp,
      energy: activePet.energy,
      hunger: activePet.hunger,
    },
  };
}

/**
 * Função de conveniência/compatibilidade que avança para um vizinho válido não visitado ou direita/baixo.
 */
function advanceStep(userId, activePet, awardXpFn) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Nenhuma expedição ativa.' };
  }

  const { x, y } = run.playerPos;
  const candidates = [
    { dir: 'RIGHT', nx: x + 1, ny: y },
    { dir: 'DOWN', nx: x, ny: y + 1 },
    { dir: 'UP', nx: x, ny: y - 1 },
    { dir: 'LEFT', nx: x - 1, ny: y },
  ];

  // Prioriza salas dentro dos limites ainda não visitadas
  let chosen = candidates.find(
    (c) => c.nx >= 0 && c.nx < run.gridW && c.ny >= 0 && c.ny < run.gridH && !run.grid[c.ny][c.nx].visited
  );

  // Se todas já foram visitadas, escolhe qualquer direção válida
  if (!chosen) {
    chosen = candidates.find(
      (c) => c.nx >= 0 && c.nx < run.gridW && c.ny >= 0 && c.ny < run.gridH
    ) || candidates[0];
  }

  return movePlayer(userId, chosen.dir, activePet, awardXpFn);
}

/**
 * Recuo / Resgate de espólios da expedição.
 * Se o pet estiver exausto (<8 ⚡ ou flagged isExhausted), aplica penalidades de carga pesada e cansaço.
 */
function retreatRun(userId, activePet, awardXpFn) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Nenhuma expedição em andamento.' };
  }

  const isExhaustedRescue = Boolean(run.isExhausted || (activePet && activePet.energy < 8));

  let coinsWon = run.coinsAccumulated;
  let xpWon = run.xpAccumulated;
  let lostCoins = 0;
  let lostEggsCount = 0;
  const savedEggs = [];

  if (isExhaustedRescue) {
    coinsWon = Math.floor(run.coinsAccumulated * 0.60);
    lostCoins = run.coinsAccumulated - coinsWon;
    xpWon = Math.floor(run.xpAccumulated * 0.70);

    for (const eggId of (run.eggsFound || [])) {
      if (Math.random() < 0.5) {
        savedEggs.push(eggId);
      } else {
        lostEggsCount++;
      }
    }

    if (activePet) {
      activePet.happiness = Math.max(0, (activePet.happiness || 50) - 20);
    }
  } else {
    savedEggs.push(...(run.eggsFound || []));
  }

  // Adiciona moedas na economia
  updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + coinsWon;
  });

  // Adiciona os ovos salvos no inventário
  for (const eggId of savedEggs) {
    addItem(userId, eggId, 1);
  }

  // Adiciona todos os baús no inventário
  for (const chestId of (run.chestsFound || [])) {
    addItem(userId, chestId, 1);
  }

  // Concede XP ao pet se função fornecida
  let xpResult = null;
  if (awardXpFn && xpWon > 0 && activePet) {
    xpResult = awardXpFn(userId, activePet.id, xpWon);
  }

  activeRuns.delete(userId);

  const eggCount = savedEggs.length;
  const chestCount = (run.chestsFound || []).length;
  const lootParts = [`**+${coinsWon} moedas**`, `**+${xpWon} XP**`];
  if (eggCount > 0) lootParts.push(`**${eggCount} ovo(s)**`);
  if (chestCount > 0) lootParts.push(`**${chestCount} baú(s)**`);

  let message = '';
  if (isExhaustedRescue) {
    const eggLossNote = lostEggsCount > 0 ? ` (${lostEggsCount} ovo(s) quebraram pelo cansaço)` : '';
    message = `⚠️ **Resgate sob Exaustão Crítica!** **${activePet ? activePet.name : 'Seu pet'}** estava esgotado e precisou largar carga pesada pelo caminho: resgatou ${lootParts.join(', ')} (perdeu ${lostCoins} moedas${eggLossNote}) e sofreu estresse (-20 Humor).`;
  } else {
    message = `🎉 **Expedição Concluída com Sucesso!** Você resgatou ${lootParts.join(', ')} e todos os itens foram guardados na sua mochila!`;
  }

  return {
    success: true,
    isExhaustedRescue,
    coinsWon,
    lostCoins,
    xpWon,
    eggsWon: savedEggs,
    lostEggs: lostEggsCount,
    chestsWon: run.chestsFound || [],
    stepsWalked: run.step,
    leveledUp: xpResult ? xpResult.leveledUp : false,
    newLevel: activePet ? activePet.level : 1,
    message,
  };
}

/**
 * Fuga de emergência / pânico: Resgata 40% das moedas e perde todos os ovos coletados (baús são salvos).
 */
function panicFlee(userId, activePet) {
  const run = getProceduralRun(userId);
  if (!run) {
    return { success: false, reason: 'no_active_run', message: 'Nenhuma expedição em andamento.' };
  }

  const partialCoins = Math.floor(run.coinsAccumulated * 0.4);
  const lostCoins = run.coinsAccumulated - partialCoins;
  const lostEggsCount = (run.eggsFound || []).length;

  updateUserAccount(userId, (acc) => {
    acc.coins = (Number(acc.coins) || 0) + partialCoins;
  });

  for (const chestId of (run.chestsFound || [])) {
    addItem(userId, chestId, 1);
  }

  if (activePet) {
    activePet.energy = 0;
    activePet.happiness = Math.max(0, (activePet.happiness || 50) - 25);
  }

  activeRuns.delete(userId);

  return {
    success: true,
    partialCoins,
    lostCoins,
    lostEggs: lostEggsCount,
    message: `💨 **Fuga Desesperada!** **${activePet ? activePet.name : 'Seu pet'}** fugiu em pânico com energia esgotada. Conseguiu salvar apenas **+${partialCoins} moedas** (perdeu ${lostCoins} moedas), os ovos frágeis se perderam e a energia zerou.`,
  };
}

module.exports = {
  getDungeonZones,
  getProceduralRun,
  startProceduralRun,
  movePlayer,
  advanceStep,
  retreatRun,
  panicFlee,
  activeRuns,
};
