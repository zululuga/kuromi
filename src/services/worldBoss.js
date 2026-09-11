const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getActivePet, awardPetXp, recordDexEntry, getUserPets, getUserPetRecord, schedulePetsSave } = require('./pets');
const petsCatalog = require('../data/petsData.json');
const { getElementMultiplier } = require('./petDuels');
const { addCoins, addMagicBeans } = require('./economy');
const { checkCooldown, setCooldown } = require('../utils/cooldown');

const bossFile = path.join(__dirname, '..', '..', 'data', 'world_boss.json');
const ATTACK_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos entre ataques

function ensureFile() {
  const dir = path.dirname(bossFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(bossFile)) fs.writeFileSync(bossFile, JSON.stringify({}, null, 2), 'utf8');
}

function readBossData() {
  ensureFile();
  try {
    const raw = fs.readFileSync(bossFile, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function writeBossData(data) {
  ensureFile();
  fs.writeFileSync(bossFile, JSON.stringify(data, null, 2), 'utf8');
}

function spawnNewBoss() {
  const keys = Object.keys(petsCatalog);
  const randomKey = keys[Math.floor(Math.random() * keys.length)] || 'kerobola';
  const def = petsCatalog[randomKey];

  const maxHp = 25000;
  const boss = {
    id: `boss_${Date.now()}`,
    speciesKey: randomKey,
    name: `${def.name} ALPHA`,
    title: 'ALPHA',
    aura: '🔴 Aura Avermelhada',
    level: '???',
    element: def.element,
    emoji: def.emoji,
    maxHp,
    currentHp: maxHp,
    status: 'active',
    spawnedAt: Date.now(),
    defeatedAt: null,
    participants: {},
    mvp: null,
  };

  writeBossData(boss);
  return boss;
}

function getWorldBoss() {
  let boss = readBossData();
  if (!boss || !boss.id || boss.status === 'defeated') {
    // Se o último foi derrotado há mais de 2 horas ou não existe, spawna um novo
    if (!boss.defeatedAt || (Date.now() - boss.defeatedAt > 2 * 60 * 60 * 1000)) {
      boss = spawnNewBoss();
    }
  }
  return boss;
}

function getBossRanking(limit = 10) {
  const boss = getWorldBoss();
  if (!boss || !boss.participants) return [];

  return Object.entries(boss.participants)
    .map(([userId, data]) => ({
      userId,
      damage: data.totalDamage || 0,
      hits: data.hits || 0,
      petName: data.petName || 'Pymon',
    }))
    .sort((a, b) => b.damage - a.damage)
    .slice(0, limit);
}

function attackWorldBoss(userId) {
  const boss = getWorldBoss();
  if (!boss || boss.status !== 'active') {
    return {
      success: false,
      reason: 'no_active_boss',
      message: 'Nenhum World Boss ativo no momento. Um novo titã ALPHA surgirá em breve!',
    };
  }

  // Cooldown de 10 min entre ataques
  const cd = checkCooldown(`boss_attack:${userId}`, ATTACK_COOLDOWN_MS);
  if (cd.onCooldown) {
    const mins = Math.ceil(cd.remainingMs / 60000);
    return {
      success: false,
      reason: 'cooldown',
      message: `Seu Pymon precisa recuperar o fôlego! Você poderá atacar novamente em **${mins} minuto(s)**.`,
    };
  }

  const pet = getActivePet(userId);
  if (!pet) {
    return {
      success: false,
      reason: 'no_pet',
      message: 'Você precisa de um Pymon ativo para enfrentar o World Boss!',
    };
  }

  if (pet.hunger < 15 || (pet.energy || 0) < 15) {
    return {
      success: false,
      reason: 'pet_exhausted',
      message: 'Seu Pymon está com pouca fome ou energia (< 15%) para encarar o Boss ALPHA!',
    };
  }

  // Cálculo de dano com multiplicador elemental
  const mult = getElementMultiplier(pet.element, boss.element);
  const isSuperEffective = mult > 1.0;
  const isWeak = mult < 1.0;

  const isCrit = Math.random() < 0.15;
  const critMult = isCrit ? 1.5 : 1.0;

  const baseDmg = ((pet.stats?.atk || 20) * 12 + pet.level * 8);
  const randomVariance = 0.85 + Math.random() * 0.3;
  const rawDamage = Math.floor(baseDmg * mult * critMult * randomVariance);
  const damage = Math.max(25, rawDamage);

  // Aplica dano ao Boss
  boss.currentHp = Math.max(0, boss.currentHp - damage);

  if (!boss.participants[userId]) {
    boss.participants[userId] = {
      totalDamage: 0,
      hits: 0,
      petName: pet.name,
      lastHitAt: Date.now(),
    };
  }

  boss.participants[userId].totalDamage += damage;
  boss.participants[userId].hits += 1;
  boss.participants[userId].lastHitAt = Date.now();
  boss.participants[userId].petName = pet.name;

  setCooldown(`boss_attack:${userId}`);

  // Recompensa imediata por ataque
  awardPetXp(userId, pet.id, Math.floor(damage * 0.2));
  addCoins(userId, Math.floor(damage * 0.15));

  let bossDefeated = false;
  let mvpUserId = null;
  let mvpReward = null;

  if (boss.currentHp <= 0) {
    bossDefeated = true;
    boss.status = 'defeated';
    boss.defeatedAt = Date.now();

    // Determina MVP
    const ranking = Object.entries(boss.participants).sort((a, b) => b[1].totalDamage - a[1].totalDamage);
    if (ranking.length > 0) {
      mvpUserId = ranking[0][0];
      boss.mvp = mvpUserId;

      // Agracia o MVP com o próprio Boss na versão ALPHA!
      const targetRecord = getUserPetRecord(mvpUserId);
      const alphaPetDef = petsCatalog[boss.speciesKey];

      const alphaPetId = `pet_alpha_${crypto.randomUUID().slice(0, 8)}`;
      const alphaPet = {
        id: alphaPetId,
        key: boss.speciesKey,
        name: `${alphaPetDef.name} ALPHA`,
        emoji: alphaPetDef.emoji,
        element: alphaPetDef.element,
        rarity: 'Lendário ALPHA',
        shiny: false,
        isAlpha: true,
        aura: '🔴 Avermelhada',
        level: 50,
        xp: 0,
        hunger: 100,
        happiness: 100,
        energy: 100,
        adoptedAt: Date.now(),
        lastFedAt: Date.now(),
        lastCarinhoAt: 0,
        lastSleepAt: 0,
        stats: {
          hp: alphaPetDef.baseStats.hp + 250,
          maxHp: alphaPetDef.baseStats.hp + 250,
          atk: alphaPetDef.baseStats.atk + 60,
          def: alphaPetDef.baseStats.def + 40,
          spd: alphaPetDef.baseStats.spd + 35,
        },
      };

      targetRecord.pets.push(alphaPet);
      recordDexEntry(mvpUserId, boss.speciesKey, false, true);
      schedulePetsSave();

      // Bônus especial para MVP
      addMagicBeans(mvpUserId, 3);
      addCoins(mvpUserId, 3000);

      mvpReward = {
        petName: alphaPet.name,
        petEmoji: alphaPet.emoji,
        magicBeans: 3,
        coins: 3000,
      };

      // Recompensa todos os outros participantes
      for (const [pUserId, pData] of ranking) {
        if (pUserId !== mvpUserId) {
          addMagicBeans(pUserId, 1);
          addCoins(pUserId, 1000);
        }
      }
    }
  }

  writeBossData(boss);

  return {
    success: true,
    damage,
    isCrit,
    isSuperEffective,
    isWeak,
    bossName: boss.name,
    bossEmoji: boss.emoji,
    bossElement: boss.element,
    remainingHp: boss.currentHp,
    maxHp: boss.maxHp,
    bossDefeated,
    mvpUserId,
    mvpReward,
  };
}

module.exports = {
  getWorldBoss,
  attackWorldBoss,
  getBossRanking,
  spawnNewBoss,
  ATTACK_COOLDOWN_MS,
};
