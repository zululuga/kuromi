const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createDailyBonusLink, processPostback, isTransactionProcessed } = require('../src/services/lootlabs');
const { createDuelChallenge, resolveDuelChallenge, buildDuelGuideEmbed } = require('../src/services/petDuels');
const { createTradeProposal, confirmTrade, cancelTrade } = require('../src/services/trade');
const { startExpedition, claimExpedition, getActiveExpedition } = require('../src/services/petExpedition');
const { getWorldBoss, attackWorldBoss, getBossRanking } = require('../src/services/worldBoss');
const { adoptPet, getUserPets } = require('../src/services/pets');
const { getBalance, addCoins, addMagicBeans, buyTheme, equipTheme, getUserAccount } = require('../src/services/economy');
const { addItem, hasItem } = require('../src/services/inventory');

const testRunId = Date.now();
const testUserA = `user_test_a_${testRunId}`;
const testUserB = `user_test_b_${testRunId}`;

try {
  // 1. Setup inicial de contas
  addCoins(testUserA, 2000);
  addCoins(testUserB, 2000);
  addMagicBeans(testUserA, 10);
  adoptPet(testUserA, 'cinna');
  adoptPet(testUserB, 'bonorka');

  // 2. Teste LootLabs e Idempotência
  const txId = `tx_test_${Date.now()}`;
  const postback1 = processPostback({ userId: testUserA, txId, taskId: 'task_1', p: txId });
  assert.equal(postback1.success, true, 'O primeiro postback deve creditar com sucesso.');
  assert.equal(isTransactionProcessed(txId), true, 'A transação deve constar como processada.');

  const postback2 = processPostback({ userId: testUserA, txId, taskId: 'task_1', p: txId });
  assert.equal(postback2.success, false, 'O segundo postback idêntico deve ser recusado (Idempotência).');
  assert.equal(postback2.reason, 'already_processed', 'Motivo da recusa deve ser already_processed.');

  // 3. Teste Duelos (Máx 3x ao dia)
  const duelChallenge = createDuelChallenge(testUserA, testUserB, 100);
  assert.equal(duelChallenge.success, true, 'Desafio de duelo válido deve ser criado.');
  const duelRes = resolveDuelChallenge(duelChallenge.challenge.id, testUserB, true);
  assert.equal(duelRes.success, true, 'Duelo aceito deve simular combate e entregar recompensas.');
  assert.ok(duelRes.battleLogs.length > 0, 'Relatório de combate deve conter logs.');

  const guideEmbed = buildDuelGuideEmbed();
  assert.ok(guideEmbed.data.title.includes('Guia'), 'Guia de combate deve ser gerado.');

  // 4. Teste de Trocas Seguras
  addItem(testUserA, 'racao_cringe', 3);
  const tradeProp = createTradeProposal(testUserA, testUserB, { type: 'item', id: 'racao_cringe', amount: 1 });
  assert.equal(tradeProp.success, true, 'Proposta de troca válida deve ser criada.');

  const confirm1 = confirmTrade(tradeProp.session.id, testUserA);
  assert.equal(confirm1.completed, false, 'Apenas 1 confirmação não deve concluir a troca.');

  const confirm2 = confirmTrade(tradeProp.session.id, testUserB);
  assert.equal(confirm2.completed, true, 'Após ambas as confirmações, a troca deve ser concluída.');
  assert.ok(hasItem(testUserB, 'racao_cringe', 1), 'O receptor deve ter recebido o item.');

  // 5. Teste de Expedição Passiva AFK
  const expRes = startExpedition(testUserA, 2);
  assert.equal(expRes.success, true, 'Expedição de 2h deve ser iniciada.');
  const activeExp = getActiveExpedition(testUserA);
  assert.ok(activeExp, 'Expedição ativa deve ser encontrada.');

  // Bloqueio de ação enquanto em expedição
  const blockedAttack = attackWorldBoss(testUserA);
  assert.equal(blockedAttack.success, false, 'Pet em expedição não deve poder atacar o World Boss.');
  assert.equal(blockedAttack.reason, 'on_expedition', 'Motivo deve ser on_expedition.');

  // 6. Teste World Boss ALPHA com usuário com pet livre
  const boss = getWorldBoss();
  assert.ok(boss, 'World Boss deve estar disponível.');
  assert.equal(boss.title, 'ALPHA', 'World Boss deve possuir o título ALPHA.');
  assert.equal(boss.level, '???', 'Nível do Boss deve ser ???.');

  const attackRes = attackWorldBoss(testUserB);
  assert.equal(attackRes.success, true, 'Ataque ao Boss pelo pet livre deve ser computado com sucesso.');
  assert.ok(attackRes.damage > 0, 'Dano causado deve ser maior que zero.');

  // 7. Teste de Temas Visuais com Feijões Mágicos
  const themeBuy = buyTheme(testUserA, 'ouro');
  assert.equal(themeBuy.success, true, 'Compra de tema com Feijões Mágicos deve ter sucesso.');
  const userAcc = getUserAccount(testUserA);
  assert.equal(userAcc.equippedTheme, 'ouro', 'Tema Ouro deve estar equipado no perfil.');
  // 8. Teste de Votos Top.gg (Recompensas e Bônus Fim de Semana)
  const { processTopggVote, verifyWebhookAuth } = require('../src/services/topgg');
  assert.equal(verifyWebhookAuth('teste'), true, 'Sem secret configurado deve validar webhook.');

  console.log('Verificação de Monetização LootLabs, Idempotência, Duelos, Trocas, Expedições AFK, World Boss ALPHA e Temas: OK');
  const voteNormal = processTopggVote({ user: testUserA, isWeekend: false });
  assert.equal(voteNormal.success, true, 'Voto comum no Top.gg deve ser processado.');
  assert.equal(voteNormal.coins, 500, 'Recompensa comum deve ser 500 moedas.');
  assert.equal(hasItem(testUserA, 'bau_madeira', 1), true, 'Usuário deve receber 1x Baú Rústico.');

  const voteWeekend = processTopggVote({ user: testUserB, isWeekend: true });
  assert.equal(voteWeekend.success, true, 'Voto no fim de semana no Top.gg deve ser processado.');
  assert.equal(voteWeekend.coins, 1000, 'Recompensa de fim de semana deve ser 1000 moedas (2x).');
  const userBAcc = getUserAccount(testUserB);
  assert.equal(userBAcc.magicBeans >= 1, true, 'Usuário deve receber 1x Feijão Mágico.');

  console.log('Verificação de Monetização LootLabs, Top.gg, Idempotência, Duelos, Trocas, Expedições AFK, World Boss ALPHA e Temas: OK');
} finally {
  // Limpeza rigorosa de dados de teste para não poluir rankings nem produção
  const cleanFiles = [
    path.join(__dirname, '..', 'data', 'economy.json'),
    path.join(__dirname, '..', 'data', 'pets.json'),
    path.join(__dirname, '..', 'data', 'world_boss.json'),
    path.join(__dirname, '..', 'data', 'expeditions.json'),
    path.join(__dirname, '..', 'data', 'inventory.json'),
  ];

  for (const file of cleanFiles) {
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (file.endsWith('world_boss.json')) {
          if (data.participants) {
            delete data.participants[testUserA];
            delete data.participants[testUserB];
          }
        } else {
          delete data[testUserA];
          delete data[testUserB];
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {}
    }
  }
}
