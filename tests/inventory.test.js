const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  getUserInventory,
  getItemDefinition,
  getAllItems,
  getItemsByCategory,
  addItem,
  removeItem,
  hasItem,
  buyItem,
  sellItem,
  openChest,
  flushInventorySync,
} = require('../src/services/inventory');
const { updateUserAccount, getUserAccount } = require('../src/services/economy');

const inventoryFile = path.join(__dirname, '..', 'data', 'inventory.json');
const economyFile = path.join(__dirname, '..', 'data', 'economy.json');

const originalInventory = fs.existsSync(inventoryFile) ? fs.readFileSync(inventoryFile, 'utf8') : '{}';
const originalEconomy = fs.existsSync(economyFile) ? fs.readFileSync(economyFile, 'utf8') : '{}';

const TEST_USER = 'test_inv_user_123';

try {
  // 1. Catálogo de Itens
  const allItems = getAllItems();
  assert.ok(allItems.length >= 10, 'O catálogo deve conter ao menos 10 itens.');

  const foods = getItemsByCategory('comida');
  assert.ok(foods.length >= 3, 'Deve haver ao menos 3 tipos de comida.');

  const racao = getItemDefinition('racao_cringe');
  assert.ok(racao, 'Ração Cringe deve existir no catálogo.');
  assert.equal(racao.category, 'comida');

  // 2. Adicionar e Remover itens
  updateUserAccount(TEST_USER, (acc) => {
    acc.coins = 1000;
  });

  addItem(TEST_USER, 'racao_cringe', 3);
  assert.equal(hasItem(TEST_USER, 'racao_cringe', 3), true, 'Usuário deve ter 3 rações.');
  assert.equal(hasItem(TEST_USER, 'racao_cringe', 4), false, 'Usuário não deve ter 4 rações.');

  removeItem(TEST_USER, 'racao_cringe', 1);
  assert.equal(hasItem(TEST_USER, 'racao_cringe', 2), true, 'Usuário deve ter 2 rações restantes.');

  // 3. Compra de Itens na Loja
  const buyRes = buyItem(TEST_USER, 'sushizinho', 1);
  assert.equal(buyRes.success, true, 'Compra de sushizinho deve ser bem-sucedida.');
  assert.equal(hasItem(TEST_USER, 'sushizinho', 1), true, 'Sushizinho deve estar na mochila.');

  const accAfterBuy = getUserAccount(TEST_USER);
  assert.equal(accAfterBuy.coins, 1000 - 250, 'Saldo de moedas deve ser debitado.');

  // 4. Venda de Itens
  const sellRes = sellItem(TEST_USER, 'sushizinho', 1);
  assert.equal(sellRes.success, true, 'Venda de sushizinho deve ter sucesso.');
  assert.equal(hasItem(TEST_USER, 'sushizinho', 1), false, 'Sushizinho deve ter sido removido da mochila.');

  const accAfterSell = getUserAccount(TEST_USER);
  assert.equal(accAfterSell.coins, 750 + 80, 'Moedas da venda devem ser creditadas.');

  // 5. Abertura de Baús
  addItem(TEST_USER, 'bau_madeira', 1);
  assert.equal(hasItem(TEST_USER, 'bau_madeira', 1), true);

  const chestRes = openChest(TEST_USER, 'bau_madeira');
  assert.equal(chestRes.success, true, 'Abertura de baú deve suceder.');
  assert.ok(chestRes.coinsAwarded >= 100, 'Baú deve premiar moedas.');
  assert.equal(hasItem(TEST_USER, 'bau_madeira', 1), false, 'Baú deve ser consumido após abertura.');

  // 6. Flush Síncrono
  flushInventorySync();
  assert.ok(fs.existsSync(inventoryFile), 'Arquivo inventory.json deve existir.');

  console.log('Verificação do Inventário, Loja, Baús e Transações: OK');
} finally {
  fs.writeFileSync(inventoryFile, originalInventory, 'utf8');
  fs.writeFileSync(economyFile, originalEconomy, 'utf8');
}
