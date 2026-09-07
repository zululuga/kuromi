const { getUserAccount, updateUserAccount } = require('./economy');

const PET_EXPLORE_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const PET_SWAP_COST = 100;

const PETS = [
  ['borboleta', 'Borboleta', 150],
  ['vespa', 'Vespa', 250],
  ['peixe', 'Peixe', 400],
  ['pombo', 'Pombo', 600],
  ['rato', 'Rato', 900],
  ['hamster', 'Hamster', 1300],
  ['calopsita', 'Calopsita', 1800],
  ['papagaio', 'Papagaio', 2500],
  ['arara', 'Arara', 3500],
  ['gato', 'Gato', 5000],
  ['cachorro', 'Cachorro', 5000],
  ['vaca', 'Vaca', 10000],
  ['bode', 'Bode', 10000],
  ['boi', 'Boi', 12000],
  ['cavalo', 'Cavalo', 13000],
  ['cabra', 'Cabra', 13000],
  ['macaco', 'Macaco', 15000],
  ['raposa', 'Raposa', 20000],
  ['capivara', 'Capivara', 20000],
  ['fantasma', 'Fantasma', 30000],
  ['kitsune', 'Kitsune', 35000],
  ['dragao', 'Dragão', 35000],
  ['ghoul', 'Ghoul', 35000],
  ['alien', 'Alien', 35000],
].map(([key, label, baseCost], tier) => ({ key, label, baseCost, tier }));

const PETS_BY_KEY = new Map(PETS.map((pet) => [pet.key, pet]));

function getPet(key) {
  return PETS_BY_KEY.get(key) || null;
}

function getPetEffectiveValue(pet) {
  return pet.baseCost * (pet.shiny ? 4 : 1);
}

function getPetStatus(userId, now = Date.now()) {
  const account = getUserAccount(userId);
  const lastExplorationAt = account.lastPetExplorationAt ? new Date(account.lastPetExplorationAt).getTime() : 0;
  const remainingMs = Math.max(0, PET_EXPLORE_COOLDOWN_MS - (now - lastExplorationAt));
  return {
    available: remainingMs === 0,
    remainingMs,
    nextExplorationAt: remainingMs ? new Date(now + remainingMs).toISOString() : null,
  };
}

function adoptPet(userId, petKey, random = Math.random) {
  const petDefinition = getPet(petKey);
  if (!petDefinition) return { adopted: false, reason: 'invalid' };

  const account = getUserAccount(userId);
  const swapCost = account.pet ? PET_SWAP_COST : 0;
  const totalCost = petDefinition.baseCost + swapCost;
  if (account.coins < totalCost) {
    return { adopted: false, reason: 'insufficient', balance: account.coins, totalCost };
  }

  const shiny = random() < 0.05;
  const pet = {
    key: petDefinition.key,
    label: petDefinition.label,
    baseCost: petDefinition.baseCost,
    shiny,
    adoptedAt: new Date().toISOString(),
  };
  const updatedAccount = updateUserAccount(userId, (current) => {
    current.coins -= totalCost;
    current.pet = pet;
  });

  return {
    adopted: true,
    pet,
    shiny,
    totalCost,
    balance: updatedAccount.coins,
    effectiveValue: getPetEffectiveValue(pet),
  };
}

function explorePet(userId, now = Date.now(), random = Math.random) {
  const account = getUserAccount(userId);
  if (!account.pet) return { explored: false, reason: 'no-pet' };

  const status = getPetStatus(userId, now);
  if (!status.available) return { explored: false, reason: 'cooldown', ...status };

  const effectiveValue = getPetEffectiveValue(account.pet);
  let reward = Math.floor(50 + Math.pow(effectiveValue, 0.6) * 5);
  const monster = random() < 0.1;
  const injured = random() < 0.05;
  if (monster) reward += 50;
  if (injured) reward = Math.floor(reward * 0.5);
  reward = Math.floor(reward);

  const updatedAccount = updateUserAccount(userId, (current) => {
    current.coins = (Number(current.coins) || 0) + reward;
    current.lastPetExplorationAt = new Date(now).toISOString();
    current.totalAventuras = (Number(current.totalAventuras) || 0) + 1;
  });

  return {
    explored: true,
    reward,
    monster,
    injured,
    totalAventuras: updatedAccount.totalAventuras,
    balance: updatedAccount.coins,
    ...getPetStatus(userId, now),
  };
}

module.exports = {
  PETS,
  PET_EXPLORE_COOLDOWN_MS,
  PET_SWAP_COST,
  getPet,
  getPetEffectiveValue,
  getPetStatus,
  adoptPet,
  explorePet,
};