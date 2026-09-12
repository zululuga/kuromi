const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { createTradeProposal, confirmTrade, cancelTrade, getTradeSession } = require('../services/trade');
const { getActivePet } = require('../services/pets');
const { getItemDefinition } = require('../services/inventory');
const { formatCoins } = require('./economyHelpers');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');
const { t } = require('../utils/i18n');
const { TRADE } = require('./commandNames');

function isTradeInteraction(interaction) {
  return typeof interaction.customId === 'string' && (
    interaction.customId.startsWith('trade_confirm:') ||
    interaction.customId.startsWith('trade_cancel:')
  );
}

async function handleTradeInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const tradeId = parts[1];

  const session = getTradeSession(tradeId);
  if (!session) {
    return interaction.reply({
      content: t('trade.expired', interaction),
      flags: 64,
    });
  }

  if (interaction.user.id !== session.senderId && interaction.user.id !== session.receiverId) {
    return interaction.reply({
      content: t('trade.notParticipant', interaction),
      flags: 64,
    });
  }

  if (action === 'trade_cancel') {
    cancelTrade(tradeId, interaction.user.id);
    return interaction.update({
      content: t('trade.cancelled', interaction, { user: interaction.user.id }),
      embeds: [],
      components: [],
    });
  }

  if (action === 'trade_confirm') {
    const result = confirmTrade(tradeId, interaction.user.id);

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.message}`,
        flags: 64,
      });
    }

    if (result.completed) {
      const finishEmbed = new EmbedBuilder()
        .setColor(PYXIE_COLORS.green || '#22c55e')
        .setTitle(t('trade.completedTitle', interaction))
        .setDescription(
          t('trade.completedDesc', interaction, {
            sender: session.senderId,
            receiver: session.receiverId,
          })
        )
        .setFooter({ text: pyxieFooter('Pyxie Trade') })
        .setTimestamp();

      return interaction.update({
        embeds: [finishEmbed],
        components: [],
      });
    }

    // Apenas um confirmou até agora
    const statusDesc = t('trade.inProgressDesc', interaction, {
      sender: session.senderId,
      receiver: session.receiverId,
      sStatus: session.senderConfirmed ? t('trade.confirmed', interaction) : t('trade.waiting', interaction),
      rStatus: session.receiverConfirmed ? t('trade.confirmed', interaction) : t('trade.waiting', interaction),
    });

    const updateEmbed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.gold || '#facc15')
      .setTitle(t('trade.inProgressTitle', interaction))
      .setDescription(statusDesc)
      .setFooter({ text: pyxieFooter('Pyxie Trade') })
      .setTimestamp();

    return interaction.update({ embeds: [updateEmbed] });
  }
}

function buildOfferDescription(offer, source = null) {
  if (offer.type === 'item') {
    const def = getItemDefinition(offer.id);
    return t('trade.itemOffer', source, {
      amount: offer.amount,
      emoji: def?.emoji || '🎁',
      name: def?.name || offer.id,
    });
  }
  if (offer.type === 'pet') {
    return t('trade.activePetOffer', source, { id: offer.id });
  }
  if (offer.type === 'coins') {
    return `💰 **${formatCoins(offer.amount, source)}**`;
  }
  return '🎁 Item';
}

module.exports = {
  name: TRADE,
  aliases: ['trocar', 'trade', 'troca'],
  isTradeInteraction,
  handleTradeInteraction,
  data: new SlashCommandBuilder()
    .setName(TRADE)
    .setDescription('Safe trade proposal for Pymons, Items or Coins (Cooldown: 30m).')
    .setDescriptionLocalizations({
      'pt-BR': 'Inicia uma proposta de troca segura de Pymons, itens ou moedas (Cooldown: 30m).',
    })
    .addUserOption((opt) =>
      opt
        .setName('usuario')
        .setNameLocalizations({
          'en-US': 'user',
          'en-GB': 'user',
          'pt-BR': 'usuario',
        })
        .setDescription('User you want to trade with / Usuário com quem deseja negociar')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('tipo')
        .setNameLocalizations({
          'en-US': 'type',
          'en-GB': 'type',
          'pt-BR': 'tipo',
        })
        .setDescription('Offer type / Tipo de oferta')
        .setRequired(true)
        .addChoices(
          { name: '📦 Item do Inventário / Inventory Item', value: 'item' },
          { name: '🐾 Pymon Ativo / Active Pymon', value: 'pet' },
          { name: '🪙 Moedas Mágicas / Magic Coins', value: 'coins' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('identificador')
        .setNameLocalizations({
          'en-US': 'identifier',
          'en-GB': 'identifier',
          'pt-BR': 'identificador',
        })
        .setDescription('Item ID or "ativo" for pet / ID do Item ou "ativo"')
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('quantidade')
        .setNameLocalizations({
          'en-US': 'amount',
          'en-GB': 'amount',
          'pt-BR': 'quantidade',
        })
        .setDescription('Quantity of items or coins / Quantidade')
        .setRequired(false)
    ),
  async executeSlash({ interaction }) {
    const target = interaction.options.getUser('usuario') || interaction.options.getUser('user');
    const tipo = interaction.options.getString('tipo') || interaction.options.getString('type');
    const id = interaction.options.getString('identificador') || interaction.options.getString('identifier') || 'ativo';
    const amount = interaction.options.getInteger('quantidade') || interaction.options.getInteger('amount') || 1;

    let offer = { type: tipo, id, amount };
    if (tipo === 'pet') {
      const activePet = getActivePet(interaction.user.id);
      if (!activePet) {
        return interaction.editReply({ content: t('trade.needActivePet', interaction) });
      }
      offer.id = activePet.id;
    }

    const proposal = createTradeProposal(interaction.user.id, target.id, offer);
    if (!proposal.success) {
      return interaction.editReply({ content: `❌ ${proposal.message}` });
    }

    const desc = t('trade.proposalDesc', interaction, {
      sender: interaction.user.id,
      receiver: target.id,
      offer: buildOfferDescription(offer, interaction),
    });

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle(t('trade.proposalTitle', interaction))
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Pyxie Trade') })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_confirm:${proposal.session.id}`)
        .setLabel(t('trade.btnConfirm', interaction))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`trade_cancel:${proposal.session.id}`)
        .setLabel(t('trade.btnCancel', interaction))
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  },
  async executePrefix({ message, args }) {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply('❌ Mencione o jogador para negociar. Ex: `py!trocar @amigo item maca 2` ou `py!trocar @amigo moedas 500` ou `py!trocar @amigo pet`.');
    }

    const tipoRaw = String(args[1] || '').toLowerCase();
    let tipo = 'item';
    if (tipoRaw.includes('pet') || tipoRaw.includes('pymon')) tipo = 'pet';
    else if (tipoRaw.includes('moeda') || tipoRaw.includes('coin')) tipo = 'coins';

    const id = args[2] || 'ativo';
    const amount = Number(args[3]) || (tipo === 'coins' ? Number(args[2]) || 100 : 1);

    let offer = { type: tipo, id, amount };
    if (tipo === 'pet') {
      const activePet = getActivePet(message.author.id);
      if (!activePet) {
        return message.reply(t('trade.needActivePet', message));
      }
      offer.id = activePet.id;
    }

    const proposal = createTradeProposal(message.author.id, target.id, offer);
    if (!proposal.success) {
      return message.reply(`❌ ${proposal.message}`);
    }

    const desc = t('trade.proposalDesc', message, {
      sender: message.author.id,
      receiver: target.id,
      offer: buildOfferDescription(offer, message),
    });

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle(t('trade.proposalTitle', message))
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Pyxie Trade') })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_confirm:${proposal.session.id}`)
        .setLabel(t('trade.btnConfirm', message))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`trade_cancel:${proposal.session.id}`)
        .setLabel(t('trade.btnCancel', message))
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply({ embeds: [embed], components: [buttons] });
  },
};
