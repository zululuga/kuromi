const { EmbedBuilder } = require('discord.js');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');

function formatCoins(coins) {
  const val = Number(coins) || 0;
  return `${val.toLocaleString('pt-BR')} Moedinhas`;
}

function formatRemaining(remainingMs) {
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}min`;
}

function buildCurrencyFields(currencies) {
  return currencies.map((currency) => ({
    name: `${currency.emoji} ${currency.label}`,
    value: (Number(currency.amount) || 0).toLocaleString('pt-BR'),
    inline: true,
  }));
}

function buildWalletEmbed(user, currencies, position) {
  const currencyLines = currencies.map((currency) =>
    `> ${currency.emoji} **${currency.label}:** ${(Number(currency.amount) || 0).toLocaleString('pt-BR')}`
  );

  const desc = [
    'Patrimônio e recursos acumulados em sua jornada:',
    '',
    '💎 **SALDOS DISPONÍVEIS**',
    ...currencyLines,
    '',
    '🏆 **POSIÇÃO NO RANKING**',
    `> 🏅 **Colocação:** ${position ? `#${position}` : 'Ainda sem colocação'}`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.gold)
    .setTitle(`🪙  ✦  Carteira de ${user.displayName || user.username}`)
    .setDescription(desc)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Economia Global • Ganhe moedas em /diario, /trabalho e Dungeons' })
    .setTimestamp();
}

/**
 * Constrói o Embed de perfil com layout exuberante, espaçamento generoso e dados integrados.
 */
function buildProfileEmbed({ user, account, spouse, rankPosition, professionLabel, activePet, dexStats, equippedTitle }) {
  const titlePrefix = equippedTitle ? `[${equippedTitle.emoji} ${equippedTitle.name}] ` : '';
  const coinsVal = Number(account?.coins) || 0;
  const magicBeansVal = Number(account?.magicBeans) || 0;
  const workVal = Number(account?.workCount) || 0;
  const rankStr = rankPosition ? `#${rankPosition} Global` : 'Ainda sem colocação';

  const dedicationLevel =
    workVal >= 50 ? 'Mestre' : (workVal >= 20 ? 'Veterano' : (workVal >= 5 ? 'Praticante' : 'Iniciante'));

  const petDisplay = activePet
    ? `> ${activePet.emoji || '🐾'} **${activePet.name}** (Nv. ${activePet.level || 1}) ${activePet.shiny ? '✨ *(Shiny Raro)*' : ''}\n` +
      `> ❤️ **HP:** ${activePet.stats?.hp || 55}/${activePet.stats?.maxHp || 55}  •  ⚡ **Energia:** ${activePet.energy || 100}%  •  🍖 **Fome:** ${activePet.hunger || 100}%\n` +
      `> 🧭 **Expedições:** ${activePet.totalExploracoes || 0}  •  ⚔️ **Duelos:** ${activePet.duelosVencidos || 0}V / ${activePet.duelosPerdidos || 0}D`
    : '> *Nenhum Pymon ativo no momento. Use `/pymons` para adotar seu companheiro!*';

  const dexDisplay = dexStats
    ? `> 📖 **Descobertos:** ${dexStats.totalUnlocked}/${dexStats.totalSpecies} Espécies\n> ✨ **Shinies:** ${dexStats.totalShinies} Desbloqueados`
    : '> 📖 **0/10** Espécies';

  const marriageDisplay = spouse
    ? `> 💍 **Casado(a) com:** ${spouse}`
    : '> 🕊️ *Solteiro(a) • Coração Livre*';

  let bioText = 'Aventureiro destemido explorando o universo de Pymons.';
  if (account?.bio && account.bio.trim()) {
    bioText = account.bio.trim();
  } else if (equippedTitle?.desc) {
    bioText = equippedTitle.desc;
  }

  const bioQuote = `> *« ${bioText} »*`;

  const description = [
    bioQuote,
    '',
    '💎 **TESOURO & ECONOMIA**',
    `> 🪙 **Moedinhas:** ${coinsVal.toLocaleString('pt-BR')}`,
    `> 🌱 **Feijões Mágicos:** ${magicBeansVal.toLocaleString('pt-BR')} 🌱`,
    `> 🏆 **Ranking:** ${rankStr}`,
    '',
    '💼 **CARREIRA & VOCAÇÃO**',
    `> 🔨 **Profissão:** ${professionLabel || 'Nenhuma (Use `/profissao`)'}`,
    `> 📈 **Expedientes:** ${workVal} trabalhos concluídos`,
    `> ⭐ **Dedicação:** ${dedicationLevel}`,
    '',
    '🐾 **COMPANHEIRO PYMON**',
    petDisplay,
    '',
    '📖 **COMPÊNDIO DA DEX**',
    dexDisplay,
    '',
    '💍 **VÍNCULO SOCIAL**',
    marriageDisplay,
  ].join('\n');

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.violet || '#c084fc')
    .setTitle(`👤  ✦  ${titlePrefix}${user.displayName || user.username}`)
    .setDescription(description)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Perfil de Aventureiro • Use os botões abaixo para gerenciar títulos' })
    .setTimestamp();
}

function buildRankingEmbed(entries, memberMap, viewerRank) {
  const lines = entries.length
    ? entries.map((entry, index) => {
        const member = memberMap.get(entry.userId);
        const name = member?.displayName || `Usuário ${entry.userId}`;
        const beans = Number(entry.magicBeans) || 0;
        const beansText = beans > 0 ? `  •  🌱 **${beans} Feijões**` : '';
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**#${index + 1}**`;
        return `${medal} **${name}**\n> 🪙 **${formatCoins(entry.coins)}**${beansText}`;
      })
    : ['*Ainda não há usuários no ranking.*'];

  const desc = [
    'Os maiores magnatas e aventureiros mais prósperos:',
    '',
    lines.join('\n\n'),
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta || '#e60067')
    .setTitle('🏆  ✦  Ranking Global de Economia')
    .setDescription(desc)
    .setFooter({ text: 'Ranking Global • Atualizado em tempo real' })
    .setTimestamp();

  if (viewerRank) {
    const viewer = memberMap.get(viewerRank.userId);
    if (viewer) embed.setThumbnail(viewer.user.displayAvatarURL({ dynamic: true, size: 256 }));
    embed.addFields({
      name: '👤 Sua Colocação Atual',
      value: `> 🏅 **Posição #${viewerRank.position}** com **${formatCoins(viewerRank.coins)}**`,
    });
  }

  return embed;
}

module.exports = {
  formatCoins,
  formatRemaining,
  buildCurrencyFields,
  buildWalletEmbed,
  buildProfileEmbed,
  buildRankingEmbed,
};