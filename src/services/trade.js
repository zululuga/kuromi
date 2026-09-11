const crypto = require('node:crypto');
const { checkCooldown, setCooldown } = require('../utils/cooldown');
const { getActivePet, getUserPets, transferPet } = require('./pets');
const { hasItem, removeItem, addItem, getItemDefinition, getUserInventory } = require('./inventory');
const { getBalance, spendCoins, addCoins } = require('./economy');

const TRADE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos
const activeTradeSessions = new Map();

function getTradeSession(tradeId) {
  const session = activeTradeSessions.get(tradeId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeTradeSessions.delete(tradeId);
    return null;
  }
  return session;
}

function createTradeProposal(senderId, receiverId, offer) {
  if (senderId === receiverId) {
    return { success: false, reason: 'self_trade', message: 'Você não pode negociar consigo mesmo.' };
  }

  // Cooldown de 30 minutos
  const cdSender = checkCooldown(`trade:${senderId}`, TRADE_COOLDOWN_MS);
  if (cdSender.onCooldown) {
    const mins = Math.ceil(cdSender.remainingMs / 60000);
    return { success: false, reason: 'sender_cooldown', message: `Você precisa aguardar mais **${mins} minuto(s)** para realizar outra troca.` };
  }

  const cdReceiver = checkCooldown(`trade:${receiverId}`, TRADE_COOLDOWN_MS);
  if (cdReceiver.onCooldown) {
    const mins = Math.ceil(cdReceiver.remainingMs / 60000);
    return { success: false, reason: 'receiver_cooldown', message: `O parceiro precisa aguardar mais **${mins} minuto(s)** para realizar outra troca.` };
  }

  // Validação da oferta do remetente
  const { type, id, amount } = offer;
  if (type === 'item') {
    const qty = Math.max(1, Number(amount) || 1);
    if (!hasItem(senderId, id, qty)) {
      return { success: false, reason: 'sender_missing_item', message: `Você não possui **${qty}x** do item ofertado.` };
    }
  } else if (type === 'pet') {
    const pets = getUserPets(senderId);
    const pet = pets.find((p) => p.id === id || p.key === id);
    if (!pet) {
      return { success: false, reason: 'sender_missing_pet', message: 'Pymon ofertado não encontrado na sua coleção.' };
    }
  } else if (type === 'coins') {
    const qty = Math.max(1, Number(amount) || 0);
    if (getBalance(senderId) < qty) {
      return { success: false, reason: 'sender_missing_coins', message: 'Você não possui essa quantia de Moedas.' };
    }
  } else {
    return { success: false, reason: 'invalid_offer_type', message: 'Tipo de oferta inválido.' };
  }

  const tradeId = `trade_${crypto.randomUUID().slice(0, 8)}`;
  const session = {
    id: tradeId,
    senderId,
    receiverId,
    senderOffer: offer,
    receiverOffer: null, // Será preenchido ou confirmado pelo receptor
    senderConfirmed: false,
    receiverConfirmed: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + 120 * 1000, // 2 minutos para resolução
  };

  activeTradeSessions.set(tradeId, session);

  return {
    success: true,
    session,
  };
}

function confirmTrade(tradeId, userId) {
  const session = getTradeSession(tradeId);
  if (!session) {
    return { success: false, reason: 'expired', message: 'A proposta de troca expirou ou não existe.' };
  }

  if (userId !== session.senderId && userId !== session.receiverId) {
    return { success: false, reason: 'unauthorized', message: 'Você não faz parte desta negociação.' };
  }

  if (userId === session.senderId) session.senderConfirmed = true;
  if (userId === session.receiverId) session.receiverConfirmed = true;

  // Se ambos confirmaram, executa a troca atômica
  if (session.senderConfirmed && session.receiverConfirmed) {
    const offer = session.senderOffer;

    // Executa transferência do remetente para o receptor
    if (offer.type === 'item') {
      const qty = Math.max(1, Number(offer.amount) || 1);
      if (!hasItem(session.senderId, offer.id, qty)) {
        activeTradeSessions.delete(tradeId);
        return { success: false, reason: 'asset_lost', message: 'O remetente não possui mais o item ofertado!' };
      }
      removeItem(session.senderId, offer.id, qty);
      addItem(session.receiverId, offer.id, qty);
    } else if (offer.type === 'pet') {
      const transferRes = transferPet(session.senderId, session.receiverId, offer.id);
      if (!transferRes.success) {
        activeTradeSessions.delete(tradeId);
        return { success: false, reason: 'pet_transfer_failed', message: 'Não foi possível transferir o Pymon (Limite de pets atingido pelo receptor).' };
      }
    } else if (offer.type === 'coins') {
      const qty = Math.max(1, Number(offer.amount) || 0);
      if (getBalance(session.senderId) < qty) {
        activeTradeSessions.delete(tradeId);
        return { success: false, reason: 'asset_lost', message: 'Moedas insuficientes para completar a troca!' };
      }
      spendCoins(session.senderId, qty);
      addCoins(session.receiverId, qty);
    }

    // Aplica o cooldown de 30 min para ambos
    setCooldown(`trade:${session.senderId}`);
    setCooldown(`trade:${session.receiverId}`);

    activeTradeSessions.delete(tradeId);

    return {
      success: true,
      completed: true,
      senderId: session.senderId,
      receiverId: session.receiverId,
      offer,
      message: '🎉 **Troca concluída com sucesso entre os dois treinadores!**',
    };
  }

  return {
    success: true,
    completed: false,
    session,
    confirmedBy: userId,
  };
}

function cancelTrade(tradeId, userId) {
  const session = getTradeSession(tradeId);
  if (!session) return { success: false, message: 'Troca inexistente ou já finalizada.' };

  activeTradeSessions.delete(tradeId);
  return { success: true, cancelledBy: userId, message: 'A negociação foi cancelada.' };
}

module.exports = {
  TRADE_COOLDOWN_MS,
  createTradeProposal,
  confirmTrade,
  cancelTrade,
  getTradeSession,
};

