const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { claimDaily } = require('../services/economy');
const { getVoteUrl } = require('../services/topgg');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { DAILY } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function isWeekend() {
  const day = new Date().getUTCDay();
  return day === 0 || day === 5 || day === 6;
}

function buildDailyView(userId, clientId = null) {
  const result = claimDaily(userId);
  const voteUrl = getVoteUrl(clientId);
  const weekend = isWeekend();

  const voteBonusText = weekend
    ? '🔥 **BÔNUS DE FIM DE SEMANA ATIVO (2X):**\n> Vote no **Top.gg** e ganhe **+200 Moedas**, **🧪 1x Poção Revitalizante** e **+100 XP** para seu Pymon!'
    : '🗳️ **BÔNUS EXTRA NO TOP.GG (A CADA 12H):**\n> Vote no **Top.gg** e ganhe **+100 Moedas**, **🥣 1x Ração da Floresta** e **+50 XP** *(com dobro nos fins de semana!)*';

  if (!result.claimed) {
    const desc = [
      `⏳ Você já coletou sua recompensa diária hoje. Espere **${formatRemaining(result.remainingMs)}** para resgatar novamente o cofre diário!`,
      '',
      voteBonusText,
      '',
      '👉 *Clique no botão abaixo para votar e resgatar o bônus:*',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.violet || '#8b5cf6')
      .setTitle('🪙  ✦  Cofre Diário em Cooldown')
      .setDescription(desc)
      .setFooter({ text: pyxieFooter('Voto no Top.gg disponível a cada 12 horas') })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Votar no Top.gg (Recompensa Extra)')
        .setEmoji('🗳️')
        .setStyle(ButtonStyle.Link)
        .setURL(voteUrl)
    );

    return { embeds: [embed], components: [row] };
  }

  const desc = [
    'Sua recompensa diária foi entregue com sucesso no seu cofre!',
    '',
    '🪙 **RESUMO DA RECOMPENSA**',
    `> 💰 **Moedas Coletadas:** **+${formatCoins(result.amount)}**`,
    `> 🏦 **Saldo Atual:** **${formatCoins(result.balance)}**`,
    result.magicBeanBonus ? `> ✨ **SORTE ÉPICA (1% de Chance):** **+1x Feijão Mágico 🌱** (Total: **${result.magicBeans} 🌱**)` : '',
    '',
    voteBonusText,
    '',
    '👉 *Clique no botão abaixo para votar e resgatar o bônus adicional:*',
  ].filter(Boolean).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold || '#facc15')
    .setTitle('🪙  ✦  Recompensa Diária Coletada!')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Recompensa renovada a cada 24 horas') })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Resgatar Bônus no Top.gg')
      .setEmoji('🗳️')
      .setStyle(ButtonStyle.Link)
      .setURL(voteUrl)
  );

  return { embeds: [embed], components: [buttonRow] };
}

module.exports = {
  name: DAILY,
  aliases: ['daily', 'diaria'],
  buildDailyView,
  data: new SlashCommandBuilder()
    .setName(DAILY)
    .setDescription('Resgata suas Moedinhas diárias e acessa bônus exclusivo no Top.gg.'),
  async executePrefix({ message, client }) {
    const view = buildDailyView(message.author.id, client?.user?.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildDailyView(interaction.user.id, interaction.client?.user?.id);
    await interaction.editReply(view);
  },
};