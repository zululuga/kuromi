const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { claimDaily, getUserAccount } = require('../services/economy');
const { createDailyBonusLink } = require('../services/lootlabs');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { DAILY } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function buildDailyView(userId) {
  const result = claimDaily(userId);

  if (!result.claimed) {
    return {
      content: `⏳ Você já coletou sua recompensa diária hoje. Espere **${formatRemaining(result.remainingMs)}** para resgatar novamente!`,
    };
  }

  const bonusAmount = Math.max(10, Math.floor(result.amount * 0.5));

  const desc = [
    'Sua recompensa diária foi entregue com sucesso no seu cofre!',
    '',
    '🪙 **RESUMO DA RECOMPENSA**',
    `> 💰 **Moedas Coletadas:** **+${formatCoins(result.amount)}**`,
    `> 🏦 **Saldo Atual:** **${formatCoins(result.balance)}**`,
    result.magicBeanBonus ? `> ✨ **SORTE ÉPICA (1% de Chance):** **+1x Feijão Mágico 🌱** (Total: **${result.magicBeans} 🌱**)` : '',
    '',
    '🎁 **BÔNUS EXTRA DISPONÍVEL (+50%)**',
    `> Deseja ganhar mais **+${formatCoins(bonusAmount)}** adicionais?`,
    '> Clique no botão abaixo e aguarde alguns segundos na página de anúncio para liberar seu bônus!',
  ].filter(Boolean).join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold || '#facc15')
    .setTitle('🪙  ✦  Recompensa Diária Coletada!')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Recompensa renovada a cada 24 horas') })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`daily_bonus_lootlabs:${userId}:${bonusAmount}`)
      .setLabel(`🎁 Ganhar +50% (+${bonusAmount} 🪙)`)
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [buttonRow] };
}

function isDailyInteraction(interaction) {
  return typeof interaction.customId === 'string' && interaction.customId.startsWith('daily_bonus_lootlabs:');
}

async function handleDailyInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const targetId = parts[1];
  const bonusAmount = Number(parts[2]) || 50;

  if (interaction.user.id !== targetId) {
    return interaction.reply({
      content: '❌ Apenas o usuário que resgatou este diário pode resgatar o bônus!',
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 });

  const linkResult = await createDailyBonusLink(targetId, bonusAmount);
  const targetUrl = linkResult.url || linkResult.fallbackUrl;

  const desc = [
    `Você está a um passo de ganhar **+${formatCoins(bonusAmount)}** adicionais!`,
    '',
    '⏳ **COMO FUNCIONA**',
    '> 1. Clique no botão **"Ver Anúncio Rápido"** abaixo.',
    '> 2. Aguarde a contagem de **alguns segundos** na página.',
    `> 3. O bônus de **+${formatCoins(bonusAmount)}** será creditado automaticamente na sua conta!`,
    '',
    '✨ *Não é necessário preencher formulários nem instalar nada.*',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.violet || '#8b5cf6')
    .setTitle('🎁  ✦  Bônus Diário Patrocinado (+50%)')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Crédito automático via LootLabs') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🌐 Ver Anúncio Rápido')
      .setURL(targetUrl)
      .setStyle(ButtonStyle.Link)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = {
  name: DAILY,
  aliases: ['daily', 'diaria'],
  buildDailyView,
  isDailyInteraction,
  handleDailyInteraction,
  data: new SlashCommandBuilder()
    .setName(DAILY)
    .setDescription('Resgata suas Moedinhas diárias e desbloqueia opção de bônus patrocinado.'),
  async executePrefix({ message }) {
    const view = buildDailyView(message.author.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildDailyView(interaction.user.id);
    await interaction.editReply(view);
  },
};