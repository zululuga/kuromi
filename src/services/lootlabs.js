const fs = require('node:fs');
const path = require('node:path');
const { addCoins, getUserAccount } = require('./economy');

const txFile = path.join(__dirname, '..', '..', 'data', 'lootlabs_tx.json');
const pendingFile = path.join(__dirname, '..', '..', 'data', 'lootlabs_pending.json');

function ensureFiles() {
  const dir = path.dirname(txFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(txFile)) fs.writeFileSync(txFile, JSON.stringify({}, null, 2), 'utf8');
  if (!fs.existsSync(pendingFile)) fs.writeFileSync(pendingFile, JSON.stringify({}, null, 2), 'utf8');
}

function readJsonSafe(file, fallback = {}) {
  ensureFiles();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function writeJsonSafe(file, data) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function getTransactions() {
  return readJsonSafe(txFile, {});
}

function isTransactionProcessed(txId) {
  if (!txId) return false;
  const txs = getTransactions();
  return Boolean(txs[txId]);
}

function registerPendingBonus(userId, bonusAmount) {
  const pending = readJsonSafe(pendingFile, {});
  pending[userId] = {
    amount: Math.max(1, Number(bonusAmount) || 5),
    createdAt: Date.now(),
  };
  writeJsonSafe(pendingFile, pending);
}

function getPendingBonus(userId) {
  const pending = readJsonSafe(pendingFile, {});
  return pending[userId]?.amount || null;
}

async function createDailyBonusLink(userId, bonusAmount = 5) {
  registerPendingBonus(userId, bonusAmount);
  const apiKey = process.env.LOOT_LABS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'LOOT_LABS_API_KEY não configurada no servidor.',
      fallbackUrl: `https://discord.com?puid=${userId}`,
    };
  }

  try {
    const response = await fetch('https://creators.lootlabs.gg/api/public/content_locker', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Bônus Diário Pyxie',
        url: 'https://discord.com',
        tier_id: 1,
        number_of_tasks: 1,
        theme: 1,
      }),
    });

    const data = await response.json().catch(() => null);

    let lootUrl = null;
    if (data) {
      if (Array.isArray(data.message) && data.message[0]?.loot_url) {
        lootUrl = data.message[0].loot_url;
      } else if (typeof data.message === 'string' && data.message.startsWith('http')) {
        lootUrl = data.message;
      } else if (data.loot_url) {
        lootUrl = data.loot_url;
      } else if (data.url) {
        lootUrl = data.url;
      }
    }

    if (lootUrl) {
      const separator = lootUrl.includes('?') ? '&' : '?';
      const finalUrl = `${lootUrl}${separator}puid=${userId}`;

      return {
        success: true,
        url: finalUrl,
        bonusAmount,
      };
    }

    return {
      success: false,
      message: data?.error || 'Erro ao gerar link no LootLabs.',
      fallbackUrl: `https://discord.com?puid=${userId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      fallbackUrl: `https://discord.com?puid=${userId}`,
    };
  }
}

function processPostback({ userId, puid, txId, taskId, p, ip }) {
  const actualUserId = puid || userId;
  const actualTxId = txId || p || taskId;

  if (!actualUserId) {
    return { success: false, reason: 'missing_user_id' };
  }

  if (actualTxId && isTransactionProcessed(actualTxId)) {
    return { success: false, reason: 'already_processed', txId: actualTxId };
  }

  const txs = getTransactions();
  const pendingAmount = getPendingBonus(actualUserId) || 50;
  
  // Credita o bônus na economia
  const newBalance = addCoins(actualUserId, pendingAmount);

  // Registra a transação para idempotência estrita
  const finalTxId = actualTxId || `${actualUserId}_${Date.now()}`;
  txs[finalTxId] = {
    userId: actualUserId,
    amount: pendingAmount,
    timestamp: Date.now(),
    ip: ip || null,
  };
  writeJsonSafe(txFile, txs);

  // Limpa o pending
  const pending = readJsonSafe(pendingFile, {});
  delete pending[actualUserId];
  writeJsonSafe(pendingFile, pending);

  return {
    success: true,
    userId: actualUserId,
    amount: pendingAmount,
    balance: newBalance,
    txId: finalTxId,
  };
}

module.exports = {
  createDailyBonusLink,
  processPostback,
  isTransactionProcessed,
  getTransactions,
  registerPendingBonus,
};

