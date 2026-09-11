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
      content: '⏳ Esta proposta de troca expirou ou já foi encerrada.',
      flags: 64,
    });
  }

  if (interaction.user.id !== session.senderId && interaction.user.id !== session.receiverId) {
    return interaction.reply({
      content: '❌ Você não participa desta negociação.',
      flags: 64,
    });
  }

  if (action === 'trade_cancel') {
    cancelTrade(tradeId, interaction.user.id);
    return interaction.update({
      content: `❌ A proposta de troca foi cancelada por <@${interaction.user.id}>.`,
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
        .setTitle('🤝  ✦  Troca Concluída com Sucesso!')
        .setDescription(
          `🎉 A transferência foi realizada com sucesso entre <@${session.senderId}> e <@${session.receiverId}>!\n\n` +
          '⏳ *Ambos os treinadores entraram em cooldown de 30 minutos para novas trocas.*'
        )
        .setFooter({ text: pyxieFooter('Mercado Comunitário de Pymons') })
        .setTimestamp();

      return interaction.update({
        embeds: [finishEmbed],
        components: [],
      });
    }

    // Apenas um confirmou até agora
    const statusDesc = [
      'Aguardando a confirmação de ambas as partes para concluir a troca atômica.',
      '',
      `> 🔵 <@${session.senderId}>: ${session.senderConfirmed ? '✅ **CONFIRMOU**' : '⏳ Aguardando...'}\n` +
      `> 🔴 <@${session.receiverId}>: ${session.receiverConfirmed ? '✅ **CONFIRMOU**' : '⏳ Aguardando...'}\n`,
      '⏳ *Tempo restante para expirar: menos de 2 minutos.*',
    ].join('\n');

    const updateEmbed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.gold || '#facc15')
      .setTitle('🤝  ✦  Proposta de Troca em Andamento')
      .setDescription(statusDesc)
      .setFooter({ text: pyxieFooter('Ambos devem clicar em Confirmar') })
      .setTimestamp();

    return interaction.update({ embeds: [updateEmbed] });
  }
}

function buildOfferDescription(offer) {
  if (offer.type === 'item') {
    const def = getItemDefinition(offer.id);
    return `📦 **${offer.amount}x ${def?.emoji || '🎁'} ${def?.name || offer.id}**`;
  }
  if (offer.type === 'pet') {
    return `🐾 **Pymon Ativo** (ID: \`${offer.id}\`)`;
  }
  if (offer.type === 'coins') {
    return `💰 **${formatCoins(offer.amount)}**`;
  }
  return '🎁 Item Indefinido';
}

module.exports = {
  name: 'trocar',
  aliases: ['trade', 'troca'],
  isTradeInteraction,
  handleTradeInteraction,
  data: new SlashCommandBuilder()
    .setName('trocar')
    .setDescription('Inicia uma proposta de troca segura de Pymon, Item ou Moedas com outro jogador (Cooldown: 30m).')
    .addUserOption((opt) => opt.setName('usuario').setDescription('Usuário com quem deseja negociar').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('tipo')
        .setDescription('Tipo de oferta')
        .setRequired(true)
        .addChoices(
          { name: '📦 Item do Inventário', value: 'item' },
          { name: '🐾 Pymon Ativo', value: 'pet' },
          { name: '🪙 Moedas Mágicas', value: 'coins' }
        )
    )
    .addStringOption((opt) => opt.setName('identificador').setDescription('ID do Item ou "ativo" para Pymon').setRequired(false))
    .addIntegerOption((opt) => opt.setName('quantidade').setDescription('Quantidade de itens ou moedas').setRequired(false)),
  async executeSlash({ interaction }) {
    const target = interaction.options.getUser('usuario');
    const tipo = interaction.options.getString('tipo');
    const id = interaction.options.getString('identificador') || 'ativo';
    const amount = interaction.options.getInteger('quantidade') || 1;

    let offer = { type: tipo, id, amount };
    if (tipo === 'pet') {
      const activePet = getActivePet(interaction.user.id);
      if (!activePet) {
        return interaction.editReply({ content: '❌ Você precisa ter um Pymon ativo para oferecer em troca!' });
      }
      offer.id = activePet.id;
    }

    const proposal = createTradeProposal(interaction.user.id, target.id, offer);
    if (!proposal.success) {
      return interaction.editReply({ content: `❌ ${proposal.message}` });
    }

    const desc = [
      `<@${interaction.user.id}> enviou uma proposta de transferência/troca para <@${target.id}>!`,
      '',
      '🎁 **OFERTA PROPOSTA:**',
      `> ${buildOfferDescription(offer)}`,
      '',
      '🔒 **SISTEMA DE CONFIRMAÇÃO BILATERAL:**',
      '> Para garantir a segurança de ambas as contas, **ambos os jogadores** precisam clicar no botão **"Confirmar Troca"** abaixo.',
      '> ⏳ *Cooldown após a troca: 30 minutos.*',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle('🤝  ✦  Proposta Oficial de Troca')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Tempo limite: 2 minutos') })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_confirm:${proposal.session.id}`)
        .setLabel('✅ Confirmar Troca')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`trade_cancel:${proposal.session.id}`)
        .setLabel('❌ Cancelar')
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
        return message.reply('❌ Você precisa ter um Pymon ativo para oferecer em troca!');
      }
      offer.id = activePet.id;
    }

    const proposal = createTradeProposal(message.author.id, target.id, offer);
    if (!proposal.success) {
      return message.reply(`❌ ${proposal.message}`);
    }

    const desc = [
      `<@${message.author.id}> enviou uma proposta de transferência/troca para <@${target.id}>!`,
      '',
      '🎁 **OFERTA PROPOSTA:**',
      `> ${buildOfferDescription(offer)}`,
      '',
      '🔒 **SISTEMA DE CONFIRMAÇÃO BILATERAL:**',
      '> Para garantir a segurança de ambas as contas, **ambos os jogadores** precisam clicar no botão **"Confirmar Troca"** abaixo.',
      '> ⏳ *Cooldown após a troca: 30 minutos.*',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle('🤝  ✦  Proposta Oficial de Troca')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Tempo limite: 2 minutos') })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_confirm:${proposal.session.id}`)
        .setLabel('✅ Confirmar Troca')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`trade_cancel:${proposal.session.id}`)
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply({ embeds: [embed], components: [buttons] });
  },
};
