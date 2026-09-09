const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  incrementCommand,
  incrementMessages,
  recordUniqueUser,
  getStats,
  flushSync,
} = require('../src/services/logging');
const { renderTarotCard } = require('../src/services/tarotRenderer');
const { renderShipCard } = require('../src/services/shipRenderer');

async function runPerformanceTests() {
  // 1. Validação do Logging / Stats com Debounce e Flush
  const initialStats = getStats();
  const initialMsgs = initialStats.messagesProcessed;

  incrementMessages();
  incrementCommand();
  recordUniqueUser('test-user-999');

  const statsAfter = getStats();
  assert.equal(statsAfter.messagesProcessed, initialMsgs + 1, 'Contador de mensagens deve ser incrementado em memória.');
  assert.ok(statsAfter.uniqueUsers.includes('test-user-999'), 'Usuário único deve constar nas estatísticas em memória.');

  // Testa flushSync
  flushSync();
  const statsFile = path.join(__dirname, '..', 'data', 'stats.json');
  assert.ok(fs.existsSync(statsFile), 'Arquivo stats.json deve existir após flushSync.');

  // 2. Validação do Cache LRU do Tarot Renderer
  const sampleCard = {
    id: 0,
    name: 'O Louco',
    num: '0',
    arcana: 'Arcanos Maiores',
    upright: 'Início, espontaneidade',
    reversed: 'Imprudência, risco',
    keywords: ['Começo', 'Aventura'],
  };

  const buffer1 = renderTarotCard(sampleCard, 'UPRIGHT');
  assert.ok(Buffer.isBuffer(buffer1), 'Renderização deve retornar um Buffer PNG.');

  // Segunda chamada deve vir do cache (mesma referência de buffer em memória)
  const buffer2 = renderTarotCard(sampleCard, 'UPRIGHT');
  assert.equal(buffer1, buffer2, 'Segunda chamada para a mesma carta deve reutilizar o buffer em cache.');

  // 3. Validação do Ship Especial (100% de amor)
  const specialMemberA = { id: '214153735281180673', displayName: 'Pessoa A' };
  const specialMemberB = { id: '1463644930080637140', displayName: 'Pessoa B' };

  const shipCanvas = await renderShipCard(specialMemberA, specialMemberB, 100);
  assert.ok(shipCanvas, 'O canvas do ship especial deve ser renderizado com sucesso.');

  console.log('Verificação de performance, logging em memória, cache LRU de Tarot e Ship especial: OK');
}

runPerformanceTests().catch((err) => {
  console.error('Falha nos testes de performance:', err);
  process.exit(1);
});
