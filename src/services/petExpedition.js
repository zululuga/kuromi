const fs = require('node:fs');
const path = require('node:path');
const { getActivePet, awardPetXp } = require('./pets');
const { addCoins, addMagicBeans } = require('./economy');
const { addItem } = require('./inventory');

const expeditionFile = path.join(__dirname, '..', '..', 'data', 'expeditions.json');

function ensureFile() {
  const dir = path.dirname(expeditionFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(expeditionFile)) fs.writeFileSync(expeditionFile, JSON.stringify({}, null, 2), 'utf8');
}

function readExpeditions() {
  ensureFile();
  try {
    const raw = fs.readFileSync(expeditionFile, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function writeExpeditions(data) {
  ensureFile();
  fs.writeFileSync(expeditionFile, JSON.stringify(data, null, 2), 'utf8');
}

const DURATIONS = {
  2: { hours: 2, ms: 2 * 60 * 60 * 1000, label: 'Expedição Curta (2 Horas)', xpMin: 150, xpMax: 300, coinsMin: 200, coinsMax: 400 },
  4: { hours: 4, ms: 4 * 60 * 60 * 1000, label: 'Expedição Média (4 Horas)', xpMin: 400, xpMax: 700, coinsMin: 500, coinsMax: 900 },
  8: { hours: 8, ms: 8 * 60 * 60 * 1000, label: 'Expedição Longa (8 Horas)', xpMin: 900, xpMax: 1600, coinsMin: 1200, coinsMax: 2200 },
};

function getActiveExpedition(userId) {
  const all = readExpeditions();
  const exp = all[userId];
  if (!exp) return null;

  const now = Date.now();
  const completed = now >= exp.finishAt;
  const remainingMs = Math.max(0, exp.finishAt - now);

  return {
    ...exp,
    completed,
    remainingMs,
  };
}

function startExpedition(userId, durationHours = 2) {
  const current = getActiveExpedition(userId);
  if (current && !current.completed) {
    const remainingMins = Math.ceil(current.remainingMs / 60000);
    return {
      success: false,
      reason: 'already_on_expedition',
      message: `Seu Pymon já está explorando! Retorno previsto em **${remainingMins} minuto(s)**.`,
      expedition: current,
    };
  }

  const pet = getActivePet(userId);
  if (!pet) {
    return { success: false, reason: 'no_pet', message: 'Você precisa ter um Pymon ativo para enviá-lo em uma expedição!' };
  }

  if (pet.hunger < 20) {
    return { success: false, reason: 'pet_hungry', message: 'Seu Pymon está com fome (< 20%)! Alimente-o antes de partir.' };
  }

  const durationConfig = DURATIONS[durationHours] || DURATIONS[2];
  const now = Date.now();
  const finishAt = now + durationConfig.ms;

  const expedition = {
    userId,
    petId: pet.id,
    petName: pet.name,
    petEmoji: pet.emoji,
    durationHours: durationConfig.hours,
    startedAt: now,
    finishAt,
  };

  const all = readExpeditions();
  all[userId] = expedition;
  writeExpeditions(all);

  return {
    success: true,
    expedition,
    message: `🧭 **${pet.emoji} ${pet.name}** partiu para a **${durationConfig.label}**! Ele coletará recursos enquanto você estuda ou trabalha.`,
  };
}

function claimExpedition(userId) {
  const exp = getActiveExpedition(userId);
  if (!exp) {
    return { success: false, reason: 'no_expedition', message: 'Você não tem nenhuma expedição ativa no momento.' };
  }

  if (!exp.completed) {
    const mins = Math.ceil(exp.remainingMs / 60000);
    return {
      success: false,
      reason: 'in_progress',
      message: `A expedição ainda está em andamento! Aguarde mais **${mins} minuto(s)** para receber os tesouros.`,
    };
  }

  const pet = getActivePet(userId);
  const durationConfig = DURATIONS[exp.durationHours] || DURATIONS[2];

  // Cálculo de recompensas
  const xpGained = Math.floor(durationConfig.xpMin + Math.random() * (durationConfig.xpMax - durationConfig.xpMin));
  const coinsGained = Math.floor(durationConfig.coinsMin + Math.random() * (durationConfig.coinsMax - durationConfig.coinsMin));
  let magicBeansGained = 0;
  let itemsGained = [];

  // Chances especiais
  if (exp.durationHours === 2) {
    addItem(userId, 'maca_doce', 1);
    itemsGained.push('1x Maçã Doce 🍎');
  } else if (exp.durationHours === 4) {
    addItem(userId, 'pocao_energia', 1);
    itemsGained.push('1x Poção de Energia ⚡');
    if (Math.random() < 0.15) {
      addItem(userId, 'ovo_comum', 1);
      itemsGained.push('1x Ovo Comum 🥚');
    }
  } else if (exp.durationHours === 8) {
    addItem(userId, 'banquete_real', 1);
    itemsGained.push('1x Banquete Real 🍖');
    if (Math.random() < 0.10) {
      addMagicBeans(userId, 1);
      magicBeansGained = 1;
    }
    if (Math.random() < 0.25) {
      addItem(userId, 'ovo_raro', 1);
      itemsGained.push('1x Ovo Raro 🥚✨');
    }
  }

  // Entrega
  if (pet) {
    awardPetXp(userId, pet.id, xpGained);
  }
  addCoins(userId, coinsGained);

  // Limpa expedição
  const all = readExpeditions();
  delete all[userId];
  writeExpeditions(all);

  return {
    success: true,
    petName: exp.petName,
    petEmoji: exp.petEmoji,
    xpGained,
    coinsGained,
    magicBeansGained,
    itemsGained,
  };
}

module.exports = {
  DURATIONS,
  getActiveExpedition,
  startExpedition,
  claimExpedition,
};

