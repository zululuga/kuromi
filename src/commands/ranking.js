const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { getRanking, getUserRank } = require('../services/economy');
const { getTopPets, getTopDexUsers } = require('../services/pets');
const { formatCoins } = require('./economyHelpers');
const { RANKING } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

async function buildRankingView(guild, viewerId, category = 'coins') {
  const members = guild ? await guild.members.fetch().catch(() => null) : null;
  const memberMap = new Map();
  if (members) members.forEach((m) => memberMap.set(m.id, m));

  let title = '🏆  ✦  Ranking Oficial do Reino';
  let desc = '';
  let color = PYXIE_COLORS.gold || '#facc15';

  if (category === 'coins') {
    title = '🪙  ✦  Ranking de Moedinhas Mágicas';
    color = PYXIE_COLORS.gold;
    const entries = getRanking(10);
    const lines = entries.length
      ? entries.map((entry, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
          return `${medal} <@${entry.userId}>\n> 💰 **${formatCoins(entry.coins)}**`;
        })
      : ['*Nenhum registro de moedas ainda.*'];
    desc = ['Os aventureiros mais prósperos do reino:', '', ...lines].join('\n');
  } else if (category === 'beans') {
    title = '🌱  ✦  Ranking de Feijões Mágicos';
    color = PYXIE_COLORS.emerald || '#10b981';
    const entries = getRanking(10).sort((a, b) => (b.magicBeans || 0) - (a.magicBeans || 0));
    const lines = entries.length
      ? entries.map((entry, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
          return `${medal} <@${entry.userId}>\n> 🌱 **${entry.magicBeans || 0} Feijões Mágicos**`;
        })
      : ['*Nenhum feijão cultivado ainda.*'];
    desc = ['Os maiores mestres cultivadores de Feijões Mágicos:', '', ...lines].join('\n');
  } else if (category === 'pets') {
    title = '🐾  ✦  Ranking de Treinadores & Pymons';
    color = PYXIE_COLORS.violet || '#8b5cf6';
    const entries = getTopPets(10);
    const lines = entries.length
      ? entries.map((entry, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
          const shinyTag = entry.shiny ? ' ✨ *(Shiny)*' : '';
          return `${medal} <@${entry.userId}>\n> ${entry.petEmoji} **${entry.petName}** (Nv. **${entry.level}**)${shinyTag}`;
        })
      : ['*Nenhum Pymon treinado ainda.*'];
    desc = ['Os Pymons mais poderosos e evoluídos da terra:', '', ...lines].join('\n');
  } else if (category === 'dex') {
    title = '📖  ✦  Ranking de Mestres da Dex';
    color = PYXIE_COLORS.cyan || '#00f5d4';
    const entries = getTopDexUsers(10);
    const lines = entries.length
      ? entries.map((entry, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
          return `${medal} <@${entry.userId}>\n> 📖 **${entry.discoveredCount}/10** Espécies Descobertas`;
        })
      : ['*Nenhuma descoberta registrada na Dex ainda.*'];
    desc = ['Os maiores exploradores com compêndios completos:', '', ...lines].join('\n');
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Atualizado em tempo real • Use os botões para alternar') })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ranking_cat:coins:${viewerId}`)
      .setLabel('🪙 Moedas')
      .setStyle(category === 'coins' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ranking_cat:beans:${viewerId}`)
      .setLabel('🌱 Feijões')
      .setStyle(category === 'beans' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ranking_cat:pets:${viewerId}`)
      .setLabel('🐾 Pets')
      .setStyle(category === 'pets' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ranking_cat:dex:${viewerId}`)
      .setLabel('📖 Dex')
      .setStyle(category === 'dex' ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [buttonRow] };
}

function isRankingInteraction(interaction) {
  return typeof interaction.customId === 'string' && interaction.customId.startsWith('ranking_cat:');
}

async function handleRankingInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const cat = parts[1] || 'coins';
  const viewerId = parts[2];

  const view = await buildRankingView(interaction.guild, viewerId, cat);
  return interaction.update(view);
}

module.exports = {
  name: RANKING,
  aliases: ['placar', 'top', 'rank'],
  buildRankingView,
  isRankingInteraction,
  handleRankingInteraction,
  data: new SlashCommandBuilder()
    .setName(RANKING)
    .setDescription('Exibe os rankings globais de Moedas, Feijões Mágicos, Pymons e Dex.')
    .addStringOption((opt) =>
      opt
        .setName('categoria')
        .setDescription('Categoria do ranking')
        .setRequired(false)
        .addChoices(
          { name: '🪙 Moedas Mágicas', value: 'coins' },
          { name: '🌱 Feijões Mágicos', value: 'beans' },
          { name: '🐾 Nível dos Pymons', value: 'pets' },
          { name: '📖 Coleção da Dex', value: 'dex' }
        )
    ),
  async executePrefix({ message, args }) {
    const cat = String(args[0] || 'coins').toLowerCase();
    const validCat = ['coins', 'beans', 'pets', 'dex'].includes(cat) ? cat : 'coins';
    const view = await buildRankingView(message.guild, message.author.id, validCat);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const cat = interaction.options.getString('categoria') || 'coins';
    const view = await buildRankingView(interaction.guild, interaction.user.id, cat);
    await interaction.editReply(view);
  },
};