const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
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
  claimStarterKit,
  hasClaimedStarterKit,
  isFirstTimeUser,
  getPetsByElement,
  flushPetsSync,
} = require('../src/services/pets');
const { exploreDungeon, getDungeonZones } = require('../src/services/petDungeons');
const { createDuelChallenge, resolveDuelChallenge } = require('../src/services/petDuels');
const { renderPetCard } = require('../src/services/petRenderer');
const { addItem } = require('../src/services/inventory');
const { updateUserAccount } = require('../src/services/economy');

const petsFile = path.join(__dirname, '..', 'data', 'pets.json');
const inventoryFile = path.join(__dirname, '..', 'data', 'inventory.json');
const economyFile = path.join(__dirname, '..', 'data', 'economy.json');

const originalPets = fs.existsSync(petsFile) ? fs.readFileSync(petsFile, 'utf8') : '{}';
const originalInventory = fs.existsSync(inventoryFile) ? fs.readFileSync(inventoryFile, 'utf8') : '{}';
const originalEconomy = fs.existsSync(economyFile) ? fs.readFileSync(economyFile, 'utf8') : '{}';

const USER_A = 'test_user_pet_a';
const USER_B = 'test_user_pet_b';

async function runPetTests() {
  try {
    // 0. Onboarding e Kit Inicial
    const NEW_USER = 'test_user_newbie';
    assert.equal(isFirstTimeUser(NEW_USER), true, 'Novo usuário deve ser identificado como first time user.');
    assert.equal(hasClaimedStarterKit(NEW_USER), false, 'Novo usuário não deve ter resgatado o kit ainda.');
    
    const starterKitRes = claimStarterKit(NEW_USER);
    assert.equal(starterKitRes.success, true, 'Kit inicial deve ser resgatado com sucesso.');
    assert.equal(hasClaimedStarterKit(NEW_USER), true, 'Usuário deve estar marcado como tendo resgatado o kit.');
    
    // Tentativa duplicada de resgatar kit
    const duplicateKit = claimStarterKit(NEW_USER);
    assert.equal(duplicateKit.success, false, 'Não deve permitir resgatar o kit duas vezes.');

    // Filtro por elemento
    const shadowPets = getPetsByElement('SOMBRA');
    assert.ok(shadowPets.length > 0, 'Deve retornar pets do elemento Sombra.');
    assert.ok(shadowPets.some((p) => p.key === 'morcego' || p.key === 'rato'));

    // Dá moedas para os dois usuários
    updateUserAccount(USER_A, (acc) => { acc.coins = 50000; });
    updateUserAccount(USER_B, (acc) => { acc.coins = 50000; });

    // 1. Adoção de Pet
    const adoptA = adoptPet(USER_A, 'kitsune');
    assert.equal(adoptA.success, true, 'Usuário A deve adotar Kitsune com sucesso.');
    assert.equal(adoptA.pet.element, 'MISTICO', 'Kitsune deve ser do elemento Místico.');

    const activeA = getActivePet(USER_A);
    assert.ok(activeA, 'Usuário A deve ter um pet ativo.');
    assert.equal(activeA.species, 'Kitsune');
    assert.equal(activeA.level, 1);

    // 2. Múltiplos pets
    const adoptA2 = adoptPet(USER_A, 'gato');
    assert.equal(adoptA2.success, true, 'Usuário A deve conseguir adotar um segundo pet.');
    const userPets = getUserPets(USER_A);
    assert.equal(userPets.length, 2, 'Usuário A deve ter 2 pets na mochila.');

    // Trocar pet ativo
    const switchRes = setActivePet(USER_A, 'gato');
    assert.equal(switchRes.success, true, 'Deve conseguir trocar para o Gato.');
    assert.equal(getActivePet(USER_A).species, 'Gato');

    // Trocar de volta para a Kitsune
    setActivePet(USER_A, 'kitsune');

    // 3. Renomear Pet
    const renameRes = renamePet(USER_A, 'Kitsune Imperial');
    assert.equal(renameRes.success, true);
    assert.equal(getActivePet(USER_A).name, 'Kitsune Imperial');

    // 4. Tamagotchi: Alimentação e Carinho
    addItem(USER_A, 'sushizinho', 1);
    const feedRes = feedPet(USER_A, 'sushizinho');
    assert.equal(feedRes.success, true, 'Pet deve ser alimentado com sucesso.');
    assert.ok(feedRes.effectsSummary.includes('Fome'), 'Deve conter sumário de efeitos aplicados.');
    assert.ok(feedRes.statusSummary.includes('HP:'), 'Deve conter sumário de status do pet.');

    const carinhoRes = petCarinho(USER_A, Date.now() + 100000000);
    assert.equal(carinhoRes.success, true, 'Carinho deve conceder XP e humor.');

    // 5. Progressão de Nível e XP
    const xpRes = awardPetXp(USER_A, getActivePet(USER_A).id, 500);
    assert.ok(getActivePet(USER_A).level >= 2, 'Pet deve ter subido para nível 2 ou superior.');

    // 6. Expedição em Dungeons
    const zones = getDungeonZones();
    assert.equal(zones.length, 4, 'Devem existir 4 zonas de dungeon.');

    const expRes = exploreDungeon(USER_A, 'jardim', Date.now() + 200000000);
    assert.equal(expRes.success, true, 'Expedição no Jardim das Borboletas deve ter sucesso.');
    assert.ok(expRes.coinsReward >= 100, 'Expedição deve conceder moedas.');

    // 7. Duelo PvP entre Pets
    adoptPet(USER_B, 'capivara');
    const challengeRes = createDuelChallenge(USER_A, USER_B, 100);
    assert.equal(challengeRes.success, true, 'Desafio de duelo deve ser criado.');

    const duelResolve = resolveDuelChallenge(challengeRes.challenge.id, USER_B, true);
    assert.equal(duelResolve.success, true, 'Duelo deve ser simulado com sucesso.');
    assert.ok(duelResolve.battleLogs.length > 0, 'Duelo deve conter logs de batalha.');
    assert.ok(['test_user_pet_a', 'test_user_pet_b'].includes(duelResolve.winnerUserId));

    // 8. Renderizador de Cartão Canvas
    const cardBuffer = renderPetCard(getActivePet(USER_A));
    assert.ok(Buffer.isBuffer(cardBuffer), 'Renderizador deve gerar um buffer de imagem PNG.');

    // 9. Flush Síncrono
    flushPetsSync();
    assert.ok(fs.existsSync(petsFile), 'Arquivo pets.json deve existir.');

    console.log('Verificação do Módulo Completo de Pets (Tamagotchi, Dungeons, Duelos, Canvas): OK');
  } finally {
    fs.writeFileSync(petsFile, originalPets, 'utf8');
    fs.writeFileSync(inventoryFile, originalInventory, 'utf8');
    fs.writeFileSync(economyFile, originalEconomy, 'utf8');
  }
}

runPetTests().catch((err) => {
  console.error('Falha nos testes de pets:', err);
  process.exit(1);
});

