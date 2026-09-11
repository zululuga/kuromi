const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { getActiveExpedition, startExpedition, claimExpedition, DURATIONS } = require('../services/petExpedition');
const { getActivePet } = require('../services/pets');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function buildExpeditionView(userId) {
  const activePet = getActivePet(userId);
  const exp = getActiveExpedition(userId);

  if (!activePet) {
    return {
      content: '❌ Você precisa adotar um Pymon antes de enviá-lo para expedições! Use `/pymons` para começar.',
    };
  }

  // 1. Expedição concluída (Pronta para coletar)
  if (exp && exp.completed) {
    const desc = [
      `🎉 **${exp.petEmoji} ${exp.petName} retornou da expedição carregado de tesouros!**`,
      '',
      '📦 **RELATÓRIO DA EXPEDIÇÃO:**',
      `> 🧭 **Duração:** ${exp.durationHours} Horas`,
      '> 🌟 **Status:** Concluída com sucesso!',
      '',
      'Clique no botão verde abaixo para resgatar todo o XP, Moedas e Itens coletados:',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.green || '#22c55e')
      .setTitle('🎁  ✦  Expedição Concluída — Resgate Disponível!')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Clique em Coletar para receber seus tesouros') })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`expedition_claim:${userId}`)
        .setLabel('🎁 Coletar Tesouros')
        .setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row] };
  }

  // 2. Expedição em andamento
  if (exp && !exp.completed) {
    const desc = [
      `🧭 **${exp.petEmoji} ${exp.petName} está atualmente em expedição pelo reino!**`,
      '',
      '⏳ **CONTAGEM REGRESSIVA:**',
      `> ⏱️ **Tempo Restante:** **${formatRemaining(exp.remainingMs)}**`,
      `> 🧭 **Duração Total:** ${exp.durationHours} Horas`,
      '',
      '✨ *Seu Pymon continua acumulando XP e recursos passivamente enquanto você realiza outras tarefas.*',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle('🧭  ✦  Pymon em Expedição Passiva (AFK)')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Retorne após o tempo indicado para coletar') })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`expedition_refresh:${userId}`)
        .setLabel('🔄 Atualizar Tempo')
        .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
  }

  // 3. Nenhuma expedição ativa (Menu para escolher duração)
  const desc = [
    `Envie **${activePet.emoji} ${activePet.name}** para explorar o mundo e coletar recompensas passivas enquanto você estuda, trabalha ou joga!`,
    '',
    '⏳ **OPÇÕES DE EXPEDIÇÃO DISPONÍVEIS:**',
    '> 🟢 **2 Horas (Curta):** 150-300 XP • 200-400 🪙 • 1x Comida Doce',
    '> 🟡 **4 Horas (Média):** 400-700 XP • 500-900 🪙 • Poção + 15% Chance de Ovo Comum 🥚',
    '> 🟣 **8 Horas (Longa):** 900-1600 XP • 1200-2200 🪙 • Banquete + 10% Feijão 🌱 + 25% Ovo Raro 🥚✨',
    '',
    'Escolha a duração desejada nos botões abaixo para iniciar:',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold || '#facc15')
    .setTitle('🧭  ✦  Expedições Passivas de Pymons (AFK)')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Seu Pymon coleta recursos mesmo com o Discord fechado') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`expedition_start:${userId}:2`)
      .setLabel('🧭 2 Horas')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`expedition_start:${userId}:4`)
      .setLabel('🧭 4 Horas')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`expedition_start:${userId}:8`)
      .setLabel('🧭 8 Horas')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

function isExpeditionInteraction(interaction) {
  return typeof interaction.customId === 'string' && (
    interaction.customId.startsWith('expedition_start:') ||
    interaction.customId.startsWith('expedition_claim:') ||
    interaction.customId.startsWith('expedition_refresh:')
  );
}

async function handleExpeditionInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[0];
  const targetId = parts[1];
  const hours = Number(parts[2]) || 2;

  if (interaction.user.id !== targetId) {
    return interaction.reply({
      content: '❌ Apenas o dono deste Pymon pode gerenciar suas expedições!',
      flags: 64,
    });
  }

  if (action === 'expedition_refresh') {
    const view = buildExpeditionView(targetId);
    return interaction.update(view);
  }

  if (action === 'expedition_start') {
    const result = startExpedition(targetId, hours);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, flags: 64 });
    }
    const view = buildExpeditionView(targetId);
    return interaction.update(view);
  }

  if (action === 'expedition_claim') {
    const result = claimExpedition(targetId);
    if (!result.success) {
      return interaction.reply({ content: `❌ ${result.message}`, flags: 64 });
    }

    const itemsText = result.itemsGained.length > 0
      ? result.itemsGained.map((i) => `> 📦 **${i}**`).join('\n')
      : '> 📦 *Nenhum item especial encontrado desta vez.*';

    const desc = [
      `🎉 **${result.petEmoji} ${result.petName}** concluiu sua missão com bravura!`,
      '',
      '🎁 **RECOMPENSAS RESGATADAS:**',
      `> ⭐ **+${result.xpGained} XP** para seu Pymon`,
      `> 💰 **+${formatCoins(result.coinsGained)}** adicionadas à sua carteira`,
      result.magicBeansGained > 0 ? '> ✨ **+1x Feijão Mágico 🌱** (Sorte Épica!)' : '',
      '',
      '📦 **ITENS COLETADOS:**',
      itemsText,
    ].filter(Boolean).join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.gold || '#facc15')
      .setTitle('🎉  ✦  Recompensas de Expedição Coletadas!')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Seu Pymon já está descansado e pronto para outra!') })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`expedition_refresh:${targetId}`)
        .setLabel('🧭 Nova Expedição')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }
}

module.exports = {
  name: 'expedicao',
  aliases: ['expedition', 'afk', 'exploracaoafk'],
  buildExpeditionView,
  isExpeditionInteraction,
  handleExpeditionInteraction,
  data: new SlashCommandBuilder()
    .setName('expedicao')
    .setDescription('Envia seu Pymon em uma expedição passiva (AFK) de 2h, 4h ou 8h para coletar recursos.')
    .addIntegerOption((opt) =>
      opt
        .setName('duracao')
        .setDescription('Duração da expedição em horas')
        .setRequired(false)
        .addChoices(
          { name: '🟢 2 Horas (Curta)', value: 2 },
          { name: '🟡 4 Horas (Média)', value: 4 },
          { name: '🟣 8 Horas (Longa)', value: 8 }
        )
    ),
  async executeSlash({ interaction }) {
    const dur = interaction.options.getInteger('duracao');
    if (dur) {
      const startRes = startExpedition(interaction.user.id, dur);
      if (!startRes.success) {
        return interaction.editReply({ content: `❌ ${startRes.message}` });
      }
    }
    const view = buildExpeditionView(interaction.user.id);
    await interaction.editReply(view);
  },
  async executePrefix({ message, args }) {
    const dur = Number(args[0]);
    if ([2, 4, 8].includes(dur)) {
      const startRes = startExpedition(message.author.id, dur);
      if (!startRes.success) {
        return message.reply(`❌ ${startRes.message}`);
      }
    }
    const view = buildExpeditionView(message.author.id);
    await message.reply(view);
  },
};

