const { addCoins, addMagicBeans, getUserAccount } = require('./economy');
const { addItem } = require('./inventory');
const { getActivePet, awardPetXp } = require('./pets');
const { addLog } = require('./logging');

const DEFAULT_BOT_ID = '1453888365618270331';

/**
 * Retorna o link oficial de votação no Top.gg para o bot.
 */
function getVoteUrl(botId = DEFAULT_BOT_ID) {
  return `https://top.gg/bot/${botId}/vote`;
}

/**
 * Valida a senha/token configurado no Webhook do Top.gg.
 */
function verifyWebhookAuth(authHeader) {
  const secret = process.env.TOPGG_WEBHOOK_AUTH || process.env.TOPGG_TOKEN;
  if (!secret) return true; // Se não houver segredo cadastrado, aceita
  return authHeader === secret;
}

/**
 * Processa a entrega de recompensas quando um voto é recebido do Top.gg.
 * @param {Object} payload { bot, user, type, isWeekend, query }
 */
function processTopggVote(payload) {
  const userId = payload?.user;
  if (!userId) {
    return { success: false, error: 'User ID não fornecido no payload do Top.gg.' };
  }

  const isWeekend = Boolean(payload.isWeekend);
  const coinsReward = isWeekend ? 200 : 100;
  const xpReward = isWeekend ? 100 : 50;
  const itemRewardId = isWeekend ? 'pocao_vida' : 'racao_cringe';
  const itemName = isWeekend ? '🧪 1x Poção Revitalizante' : '🥣 1x Ração da Floresta';

  // 1. Entregar Moedas
  addCoins(userId, coinsReward);

  // 2. Entregar Item
  addItem(userId, itemRewardId, 1);

  // 3. Entregar XP ao Pymon Ativo (se possuir)
  let activePetName = null;
  const activePet = getActivePet(userId);
  if (activePet) {
    awardPetXp(userId, activePet.id, xpReward);
    activePetName = activePet.name;
  }

  addLog(
    `[Top.gg Voto] Usuário ${userId} votou no bot! Recompensa: +${coinsReward} 🪙, ${itemName}` +
      (activePetName ? `, +${xpReward} XP para ${activePetName}` : '') +
      (isWeekend ? ' (Bônus Fim de Semana 2x Ativo!)' : '')
  );

  return {
    success: true,
    userId,
    coins: coinsReward,
    xp: xpReward,
    item: itemRewardId,
    itemName,
    isWeekend,
    activePetName,
  };
}

module.exports = {
  getVoteUrl,
  verifyWebhookAuth,
  processTopggVote,
  DEFAULT_BOT_ID,
};
