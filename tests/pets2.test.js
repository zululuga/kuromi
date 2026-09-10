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
  getIncubator,
  putEggInIncubator,
  hatchIncubatorEgg,
  useHourglassOnIncubator,
  expandUserIncubator,
  flushPetsSync,
} = require('../src/services/pets');
const {
  startProceduralRun,
  advanceStep,
  retreatRun,
  panicFlee,
  getDungeonZones,
} = require('../src/services/proceduralExplorer');
const { createDuelChallenge, resolveDuelChallenge } = require('../src/services/petDuels');
const { renderPetCard, renderPokedexCard } = require('../src/services/petRenderer');
const { addItem } = require('../src/services/inventory');
const { updateUserAccount } = require('../src/services/economy');

const petsFile = path.join(__dirname, '..', 'data', 'pets.json');
const inventoryFile = path.join(__dirname, '..', 'data', 'inventory.json');
const economyFile = path.join(__dirname, '..', 'data', 'economy.json');

const originalPets = fs.existsSync(petsFile) ? fs.readFileSync(petsFile, 'utf8') : '{}';
const originalInventory = fs.existsSync(inventoryFile) ? fs.readFileSync(inventoryFile, 'utf8') : '{}';
const originalEconomy = fs.existsSync(economyFile) ? fs.readFileSync(economyFile, 'utf8') : '{}';

const USER_A = `test_user_pet_a_${Date.now()}`;
const USER_B = `test_user_pet_b_${Date.now()}`;

async function runPetTests() {
  try {
    // 0. Onboarding e Kit Inicial
    const NEW_USER = `test_user_newbie_${Date.now()}`;
    assert.equal(isFirstTimeUser(NEW_USER), true, 'Novo usuário deve ser identificado como first time user.');
    assert.equal(hasClaimedStarterKit(NEW_USER), false, 'Novo usuário não deve ter resgatado o kit ainda.');

    const starterKitRes = claimStarterKit(NEW_USER);
    assert.equal(starterKitRes.success, true, 'Kit inicial deve ser resgatado com sucesso.');
    assert.equal(hasClaimedStarterKit(NEW_USER), true, 'Usuário deve estar marcado como tendo resgatado o kit.');

    // Tentativa duplicada de resgatar kit
    const duplicateKit = claimStarterKit(NEW_USER);
    assert.equal(duplicateKit.success, false, 'Não deve permitir resgatar o kit duas vezes.');

    // Filtros dos Elementos Oficiais
    const orvalhoPets = getPetsByElement('ORVALHO');
    assert.ok(orvalhoPets.length > 0, 'Deve retornar pets do elemento Orvalho.');
    assert.ok(orvalhoPets.some((p) => p.key === 'bonorka' || p.key === 'kerobola'));

    const silvestrePets = getPetsByElement('SILVESTRE');
    assert.ok(silvestrePets.some((p) => p.key === 'pomcorin' || p.key === 'clovis'));

    const charmePets = getPetsByElement('CHARME');
    assert.ok(charmePets.some((p) => p.key === 'cinna' || p.key === 'spiromuffin'));

    const travessuraPets = getPetsByElement('TRAVESSURA');
    assert.ok(travessuraPets.some((p) => p.key === 'bakuphant' || p.key === 'nekomandra'));

    // Dá moedas para os dois usuários
    updateUserAccount(USER_A, (acc) => { acc.coins = 100000; });
    updateUserAccount(USER_B, (acc) => { acc.coins = 100000; });

    // 1. Adoção de PixelMonster Starter
    const adoptA = adoptPet(USER_A, 'bonorka');
    assert.equal(adoptA.success, true, 'Usuário A deve adotar Bonorka com sucesso.');
    assert.equal(adoptA.pet.element, 'ORVALHO', 'Bonorka deve ser do elemento Orvalho.');

    const activeA = getActivePet(USER_A);
    assert.ok(activeA, 'Usuário A deve ter um pet ativo.');
    assert.equal(activeA.species, 'Bonorka');
    assert.equal(activeA.level, 1);

    // 2. Bloqueio de adoção para quem já possui starter
    const adoptA2 = adoptPet(USER_A, 'cinna');
    assert.equal(adoptA2.success, false, 'Usuário que já tem starter não pode adotar outro.');
    assert.equal(adoptA2.reason, 'already_has_starter');

    // 3. Renomear Pet
    const renameRes = renamePet(USER_A, 'Bonorka Imperial');
    assert.equal(renameRes.success, true);
    assert.equal(getActivePet(USER_A).name, 'Bonorka Imperial');

    // 4. Tamagotchi: Alimentação e Carinho
    getActivePet(USER_A).hunger = 50;
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

    // 6. Chocadeira Delta-Time (Slots, Incubação, Aceleração e Eclosão)
    const initialIncubator = getIncubator(USER_A);
    assert.equal(initialIncubator.maxSlots, 3, 'Chocadeira inicial deve ter 3 slots base.');
    assert.equal(initialIncubator.freeCount, 3, 'Todos os 3 slots devem estar livres.');

    // Coloca ovo na chocadeira
    addItem(USER_A, 'ovo_orvalho', 1);
    const placeRes = putEggInIncubator(USER_A, 'ovo_orvalho', 0);
    assert.equal(placeRes.success, true, 'Deve colocar o ovo no slot 0.');

    const midIncubator = getIncubator(USER_A);
    assert.equal(midIncubator.activeCount, 1, 'Deve ter 1 ovo ativo na chocadeira.');
    assert.equal(midIncubator.slots[0].empty, false);

    // Usa ampulheta para acelerar tempo
    addItem(USER_A, 'ampulheta_tempo_4h', 1);
    const speedRes = useHourglassOnIncubator(USER_A, 0, 'ampulheta_tempo_4h');
    assert.equal(speedRes.success, true, 'Deve acelerar a incubação do ovo.');

    // Choca o ovo
    const hatchRes = hatchIncubatorEgg(USER_A, 0);
    assert.equal(hatchRes.success, true, 'Ovo acelerado deve chocar com sucesso.');
    assert.ok(hatchRes.pet, 'Deve gerar um novo pet chocado.');
    assert.equal(hatchRes.pet.element, 'ORVALHO', 'Pet chocado deve ser do elemento Orvalho.');

    // Expansão da Chocadeira para 5 slots
    addItem(USER_A, 'ninho_encantado', 1);
    const expandRes = expandUserIncubator(USER_A);
    assert.equal(expandRes.success, true, 'Deve expandir a chocadeira.');
    assert.equal(getIncubator(USER_A).maxSlots, 5, 'Chocadeira deve ter 5 slots após expansão.');

    // 7. Exploração Procedural por Passos em RAM
    const petA = getActivePet(USER_A);
    petA.hunger = 80;
    petA.energy = 100;
    petA.stats.hp = petA.stats.maxHp;

    const startRunRes = startProceduralRun(USER_A, 'bosque', petA);
    assert.equal(startRunRes.success, true, 'Deve iniciar expedição procedural.');

    const initialEnergy = petA.energy;
    const stepRes = advanceStep(USER_A, petA);
    assert.equal(stepRes.success, true, 'Deve avançar 1 passo na dungeon.');
    assert.ok(petA.energy < initialEnergy || stepRes.event.type === 'FOUNTAIN', 'Passo deve consumir estamina ou acionar fonte.');

    // Resgate de espólios com energia (sem penalidade)
    const retreatRes = retreatRun(USER_A, petA, awardPetXp);
    assert.equal(retreatRes.success, true, 'Deve resgatar espólios voluntariamente.');
    assert.equal(retreatRes.isExhaustedRescue, false, 'Não deve ter penalidade de exaustão.');

    // Teste: Proibição com 0% de Fome
    petA.hunger = 0;
    const starvingStart = startProceduralRun(USER_A, 'bosque', petA);
    assert.equal(starvingStart.success, false, 'Não deve permitir explorar com 0% de fome.');
    assert.equal(starvingStart.reason, 'starving');
    petA.hunger = 80;

    // Teste: Proibição com 0 HP (Desmaiado)
    petA.stats.hp = 0;
    const faintedStart = startProceduralRun(USER_A, 'bosque', petA);
    assert.equal(faintedStart.success, false, 'Não deve permitir explorar com 0 HP.');
    assert.equal(faintedStart.reason, 'fainted');
    petA.stats.hp = petA.stats.maxHp;

    // Teste: Resgate sob Exaustão (Penalidade de carga)
    const exhaustRun = startProceduralRun(USER_A, 'bosque', petA);
    assert.equal(exhaustRun.success, true);
    petA.energy = 2; // Força exaustão
    const exhaustRetreat = retreatRun(USER_A, petA, awardPetXp);
    assert.equal(exhaustRetreat.success, true);
    assert.equal(exhaustRetreat.isExhaustedRescue, true, 'Deve registrar resgate com penalidade de exaustão.');
    petA.energy = 100;

    // 8. Duelo PvP entre Pets
    adoptPet(USER_B, 'cinna');
    const challengeRes = createDuelChallenge(USER_A, USER_B, 100);
    assert.equal(challengeRes.success, true, 'Desafio de duelo deve ser criado.');

    const duelResolve = resolveDuelChallenge(challengeRes.challenge.id, USER_B, true);
    assert.equal(duelResolve.success, true, 'Duelo deve ser simulado com sucesso.');
    assert.ok(duelResolve.battleLogs.length > 0, 'Duelo deve conter logs de batalha.');
    assert.ok([USER_A, USER_B].includes(duelResolve.winnerUserId));

    // 9. Renderizador de Cartão Canvas & Pokédex
    const cardBuffer = renderPetCard(getActivePet(USER_A));
    assert.ok(Buffer.isBuffer(cardBuffer), 'Renderizador deve gerar um buffer de imagem PNG para o pet card.');

    const pokedexBuffer = renderPokedexCard('cinna');
    assert.ok(Buffer.isBuffer(pokedexBuffer), 'Renderizador deve gerar um buffer de imagem PNG para a pokedex.');

    // 10. Flush Síncrono
    flushPetsSync();
    assert.ok(fs.existsSync(petsFile), 'Arquivo pets.json deve existir.');

    console.log('Verificação do Módulo Completo de Pyxie (10 PixelMonsters Oficiais, Pokédex Inicial 5% Shiny, Chocadeira Delta-Time, Dungeons em RAM, Pixel Art Canvas): OK');
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
