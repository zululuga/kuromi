const crypto = require('node:crypto');
const { getActivePet, awardPetXp } = require('./pets');
const { spendCoins, updateUserAccount, getUserAccount } = require('./economy');

const ELEMENT_ADVANTAGES = {
  ORVALHO: 'SILVESTRE',
  SILVESTRE: 'BRISA',
  BRISA: 'CHARME',
  CHARME: 'TRAVESSURA',
  TRAVESSURA: 'ORVALHO',
  // Fallbacks de compatibilidade
  SOMBRA: 'FOFURA',
  FOFURA: 'CAOS',
  CAOS: 'MISTICO',
  MISTICO: 'SOMBRA',
};

const activeDuelChallenges = new Map();
const CHALLENGE_EXPIRE_MS = 60 * 1000; // 60 segundos para aceitar

function getElementMultiplier(elemA, elemB) {
  if (ELEMENT_ADVANTAGES[elemA] === elemB) return 1.25;
  if (ELEMENT_ADVANTAGES[elemB] === elemA) return 0.8;
  return 1.0;
}

function createDuelChallenge(challengerId, targetId, bet = 0) {
  if (challengerId === targetId) {
    return { success: false, reason: 'self_duel' };
  }

  const petA = getActivePet(challengerId);
  const petB = getActivePet(targetId);

  if (!petA) return { success: false, reason: 'challenger_no_pet' };
  if (!petB) return { success: false, reason: 'target_no_pet' };

  if (petA.hunger < 15) return { success: false, reason: 'challenger_hungry', pet: petA };
  if (petB.hunger < 15) return { success: false, reason: 'target_hungry', pet: petB };

  if ((petA.energy || 0) < 15) return { success: false, reason: 'challenger_exhausted', pet: petA };
  if ((petB.energy || 0) < 15) return { success: false, reason: 'target_exhausted', pet: petB };

  const betAmount = Math.max(0, Math.floor(Number(bet) || 0));
  if (betAmount > 0) {
    const accA = getUserAccount(challengerId);
    const accB = getUserAccount(targetId);
    if (accA.coins < betAmount) {
      return { success: false, reason: 'challenger_insufficient_funds', balance: accA.coins, bet: betAmount };
    }
    if (accB.coins < betAmount) {
      return { success: false, reason: 'target_insufficient_funds', balance: accB.coins, bet: betAmount };
    }
  }

  const duelId = `duel_${crypto.randomUUID().slice(0, 8)}`;
  const challenge = {
    id: duelId,
    challengerId,
    targetId,
    betAmount,
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_EXPIRE_MS,
  };

  activeDuelChallenges.set(duelId, challenge);

  return {
    success: true,
    challenge,
    petA,
    petB,
    betAmount,
  };
}

function getDuelChallenge(duelId) {
  const challenge = activeDuelChallenges.get(duelId);
  if (!challenge) return null;
  if (Date.now() > challenge.expiresAt) {
    activeDuelChallenges.delete(duelId);
    return null;
  }
  return challenge;
}

function executeDuelSimulation(petA, petB, random = Math.random) {
  let hpA = petA.stats.maxHp || 100;
  let hpB = petB.stats.maxHp || 100;

  const spdA = petA.stats.spd || 15;
  const spdB = petB.stats.spd || 15;

  const multA = getElementMultiplier(petA.element, petB.element);
  const multB = getElementMultiplier(petB.element, petA.element);

  const logs = [];
  let round = 1;
  const maxRounds = 10;

  let first = spdA >= spdB ? 'A' : 'B';

  while (hpA > 0 && hpB > 0 && round <= maxRounds) {
    // Turno do atacante 1
    if (first === 'A') {
      const dodgeChance = Math.min(0.25, (spdB / (spdA * 4)));
      if (random() < dodgeChance) {
        logs.push(`💨 **${petB.name}** esquivou com agilidade do ataque de **${petA.name}**!`);
      } else {
        const isCrit = random() < 0.12;
        const critMult = isCrit ? 1.5 : 1.0;
        const rawDmg = Math.max(8, (petA.stats.atk * multA) - (petB.stats.def / 2));
        const dmg = Math.floor(rawDmg * critMult * (0.9 + random() * 0.2));
        hpB = Math.max(0, hpB - dmg);
        logs.push(`⚔️ **${petA.name}** desferiu ${isCrit ? '🔥 **GOLPE CRÍTICO**' : 'um golpe'} em **${petB.name}**, causando **${dmg}** de dano! (HP: ${hpB}/${petB.stats.maxHp})`);
      }

      if (hpB <= 0) break;

      // Contra-ataque de B
      const dodgeChanceA = Math.min(0.25, (spdA / (spdB * 4)));
      if (random() < dodgeChanceA) {
        logs.push(`💨 **${petA.name}** esquivou com maestria do contra-ataque de **${petB.name}**!`);
      } else {
        const isCrit = random() < 0.12;
        const critMult = isCrit ? 1.5 : 1.0;
        const rawDmg = Math.max(8, (petB.stats.atk * multB) - (petA.stats.def / 2));
        const dmg = Math.floor(rawDmg * critMult * (0.9 + random() * 0.2));
        hpA = Math.max(0, hpA - dmg);
        logs.push(`⚡ **${petB.name}** contra-atacou **${petA.name}** causando **${dmg}** de dano! (HP: ${hpA}/${petA.stats.maxHp})`);
      }
    } else {
      // Turno inicial de B
      const dodgeChanceA = Math.min(0.25, (spdA / (spdB * 4)));
      if (random() < dodgeChanceA) {
        logs.push(`💨 **${petA.name}** esquivou do ataque de **${petB.name}**!`);
      } else {
        const isCrit = random() < 0.12;
        const critMult = isCrit ? 1.5 : 1.0;
        const rawDmg = Math.max(8, (petB.stats.atk * multB) - (petA.stats.def / 2));
        const dmg = Math.floor(rawDmg * critMult * (0.9 + random() * 0.2));
        hpA = Math.max(0, hpA - dmg);
        logs.push(`⚔️ **${petB.name}** atacou **${petA.name}** causando **${dmg}** de dano! (HP: ${hpA}/${petA.stats.maxHp})`);
      }

      if (hpA <= 0) break;

      // Contra-ataque de A
      const dodgeChance = Math.min(0.25, (spdB / (spdA * 4)));
      if (random() < dodgeChance) {
        logs.push(`💨 **${petB.name}** esquivou do contra-ataque de **${petA.name}**!`);
      } else {
        const isCrit = random() < 0.12;
        const critMult = isCrit ? 1.5 : 1.0;
        const rawDmg = Math.max(8, (petA.stats.atk * multA) - (petB.stats.def / 2));
        const dmg = Math.floor(rawDmg * critMult * (0.9 + random() * 0.2));
        hpB = Math.max(0, hpB - dmg);
        logs.push(`⚡ **${petA.name}** contra-atacou **${petB.name}** causando **${dmg}** de dano! (HP: ${hpB}/${petB.stats.maxHp})`);
      }
    }

    round += 1;
  }

  const winner = hpA > hpB ? 'A' : 'B';
  return { winner, logs, finalHpA: hpA, finalHpB: hpB };
}

function resolveDuelChallenge(duelId, targetUserId, accepted) {
  const challenge = getDuelChallenge(duelId);
  if (!challenge || challenge.targetId !== targetUserId) {
    return { success: false, reason: 'invalid_or_expired' };
  }

  activeDuelChallenges.delete(duelId);

  if (!accepted) {
    return { success: true, accepted: false, reason: 'rejected' };
  }

  const petA = getActivePet(challenge.challengerId);
  const petB = getActivePet(challenge.targetId);

  if (!petA || !petB) {
    return { success: false, reason: 'pet_unavailable' };
  }

  // Verifica fundos para aposta
  const bet = challenge.betAmount;
  if (bet > 0) {
    const accA = getUserAccount(challenge.challengerId);
    const accB = getUserAccount(challenge.targetId);
    if (accA.coins < bet || accB.coins < bet) {
      return { success: false, reason: 'insufficient_funds_at_execution' };
    }
  }

  const battleResult = executeDuelSimulation(petA, petB);
  const winnerUserId = battleResult.winner === 'A' ? challenge.challengerId : challenge.targetId;
  const loserUserId = battleResult.winner === 'A' ? challenge.targetId : challenge.challengerId;

  const winnerPet = battleResult.winner === 'A' ? petA : petB;
  const loserPet = battleResult.winner === 'A' ? petB : petA;

  winnerPet.duelosVencidos = (winnerPet.duelosVencidos || 0) + 1;
  loserPet.duelosPerdidos = (loserPet.duelosPerdidos || 0) + 1;

  // Entrega de Moedas e XP
  awardPetXp(winnerUserId, winnerPet.id, 100);
  awardPetXp(loserUserId, loserPet.id, 25);

  if (bet > 0) {
    spendCoins(loserUserId, bet);
    updateUserAccount(winnerUserId, (acc) => {
      acc.coins = (Number(acc.coins) || 0) + bet;
    });
  }

  return {
    success: true,
    accepted: true,
    winnerUserId,
    loserUserId,
    winnerPet,
    loserPet,
    betAmount: bet,
    battleLogs: battleResult.logs,
  };
}

module.exports = {
  createDuelChallenge,
  getDuelChallenge,
  resolveDuelChallenge,
};

