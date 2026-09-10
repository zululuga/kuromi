const { EmbedBuilder } = require('discord.js');
const { KUROMI_COLORS } = require('../utils/kuromiVoice');

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
  return new EmbedBuilder()
    .setColor(KUROMI_COLORS.gold)
    .setTitle(`🪙  ✦  Carteira de ${user.displayName || user.username}`)
    .setDescription('Seus saldos e patrimônio acumulado.')
    .addFields(...buildCurrencyFields(currencies), {
      name: '🏆 Colocação em Moedinhas',
      value: position ? `#${position}` : 'Ainda sem colocação',
      inline: true,
    })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: 'Economia Global • Use /diario e /trabalho para ganhar moedas' })
    .setTimestamp();
}

/**
 * Constrói o Embed de perfil com layout exuberante e dados integrados de Pymons e Dex.
 */
function buildProfileEmbed({ user, account, spouse, rankPosition, professionLabel, activePet, dexStats, equippedTitle }) {
  const titlePrefix = equippedTitle ? `[${equippedTitle.emoji} ${equippedTitle.name}] ` : '';
  const coinsVal = Number(account?.coins) || 0;
  const magicBeansVal = Number(account?.magicBeans) || 0;
  const workVal = Number(account?.workCount) || 0;

  const petDisplay = activePet
    ? `${activePet.emoji || '🐾'} **${activePet.name}** (Nv. ${activePet.level || 1}) ${activePet.shiny ? '✨ *(Shiny Raro)*' : ''}\n> ❤️ HP: **${activePet.stats?.hp || 55}/${activePet.stats?.maxHp || 55}**  •  ⚡ Energia: **${activePet.energy || 100}%**  •  🍖 Fome: **${activePet.hunger || 100}%**`
    : '*Nenhum Pymon ativo. Use `/pymons` para iniciar sua jornada!*';

  const dexDisplay = dexStats
    ? `📖 **${dexStats.totalUnlocked}/${dexStats.totalSpecies}** Espécies  •  ✨ **${dexStats.totalShinies}** Shinies`
    : '📖 **0/10** Espécies';

  const adventuresDisplay = activePet
    ? `🧭 **${activePet.totalExploracoes || 0}** Expedições  •  ⚔️ **${activePet.duelosVencidos || 0}V / ${activePet.duelosPerdidos || 0}D**`
    : '🧭 **0** Expedições';

  return new EmbedBuilder()
    .setColor(KUROMI_COLORS.violet || '#c084fc')
    .setTitle(`👤  ✦  ${titlePrefix}${user.displayName || user.username}`)
    .setDescription(
      equippedTitle
        ? `> *« ${equippedTitle.desc} »*`
        : '> *Aventureiro destemido explorando o universo de Pymons.*'
    )
    .addFields(
      {
        name: '💎 Tesouro & Economia',
        value: `🪙 **Moedinhas:** ${coinsVal.toLocaleString('pt-BR')}\n🌱 **Feijões Mágicos:** ${magicBeansVal.toLocaleString('pt-BR')} 🌱\n🏆 **Ranking:** ${rankPosition ? `#${rankPosition} Global` : 'Não ranqueado'}`,
        inline: true,
      },
      {
        name: '💼 Carreira & Vocação',
        value: `🔨 **Profissão:** ${professionLabel || 'Nenhuma'}\n📈 **Expedientes:** ${workVal} trabalhos\n⭐ **Dedicação:** ${workVal >= 50 ? 'Mestre' : (workVal >= 20 ? 'Veterano' : (workVal >= 5 ? 'Praticante' : 'Iniciante'))}`,
        inline: true,
      },
      {
        name: '💍 Vínculo Social',
        value: spouse ? `💍 Casado(a) com ${spouse}` : '🕊️ Solteiro(a) • Coração Livre',
        inline: false,
      },
      {
        name: '🐾 Companheiro Pymon',
        value: petDisplay,
        inline: false,
      },
      {
        name: '📖 Compêndio da Dex',
        value: dexDisplay,
        inline: true,
      },
      {
        name: '🧭 Aventuras & Duelos',
        value: adventuresDisplay,
        inline: true,
      }
    )
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
        const beansText = beans > 0 ? ` • ${beans} 🌱` : '';
        return `**${index + 1}.** ${name} — ${formatCoins(entry.coins)}${beansText}`;
      })
    : ['Ainda não há usuários no ranking.'];

  const embed = new EmbedBuilder()
    .setColor(KUROMI_COLORS.pink)
    .setTitle('🏆  ✦  Ranking Global de Economia')
    .setDescription(lines.join('\n'))
    .setTimestamp();

  if (viewerRank) {
    const viewer = memberMap.get(viewerRank.userId);
    if (viewer) embed.setThumbnail(viewer.user.displayAvatarURL({ dynamic: true, size: 256 }));
    embed.addFields({ name: 'Sua colocação', value: `#${viewerRank.position} — ${formatCoins(viewerRank.coins)}` });
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