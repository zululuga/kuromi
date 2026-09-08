const { EmbedBuilder } = require('discord.js');
const { KUROMI_COLORS } = require('../utils/kuromiVoice');

function formatCoins(coins) {
  return `${coins.toLocaleString('pt-BR')} Moedinhas`;
}

function formatRemaining(remainingMs) {
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}min`;
}

function buildCurrencyFields(currencies) {
  return currencies.map((currency) => ({
    name: `${currency.emoji} ${currency.label}`,
    value: currency.amount.toLocaleString('pt-BR'),
    inline: true,
  }));
}

function buildWalletEmbed(user, currencies, position) {
  return new EmbedBuilder()
    .setColor(KUROMI_COLORS.gold)
    .setTitle(`🪙  ✦  Carteira de ${user.displayName || user.username}`)
    .setDescription('Seus saldos atuais. Não gaste tudo de uma vez; eu não vou fingir que não avisei.')
    .addFields(...buildCurrencyFields(currencies), {
      name: 'Colocação em Moedinhas',
      value: position ? `#${position}` : 'Ainda sem colocação',
    })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();
}

function buildProfileEmbed(user, currencies, spouse, position, profession, workCount = 0, pet, totalAventuras = 0) {
  const petLabel = pet ? `${pet.shiny ? '✨ ' : ''}${pet.label}${pet.shiny ? ' (Shiny)' : ''}` : 'Nenhum pet adotado';
  return new EmbedBuilder()
    .setColor(KUROMI_COLORS.pink)
    .setTitle(`👤  ✦  Perfil de ${user.displayName || user.username}`)
    .addFields(
      { name: '💍 Cônjuge', value: spouse ? `${spouse}` : 'Solteiro(a), por enquanto. Não faça drama.' },
      { name: 'Colocação em Moedinhas', value: position ? `#${position}` : 'Ainda sem colocação' },
      { name: '💼 Profissão', value: profession || 'Nenhuma. Decidir é aparentemente difícil.' },
      { name: '📈 Trabalhos realizados', value: String(workCount) },
      { name: '🐾 Pet atual', value: petLabel },
      { name: '🧭 Aventuras concluídas', value: String(totalAventuras) },
      ...buildCurrencyFields(currencies)
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();
}

function buildRankingEmbed(entries, memberMap, viewerRank) {
  const lines = entries.length
    ? entries.map((entry, index) => {
        const member = memberMap.get(entry.userId);
        const name = member?.displayName || `Usuário ${entry.userId}`;
        return `**${index + 1}.** ${name} — ${formatCoins(entry.coins)}`;
      })
    : ['Ainda não há usuários no ranking. Que falta de ambição.'];

  const embed = new EmbedBuilder()
    .setColor(KUROMI_COLORS.pink)
    .setTitle('🏆  ✦  Ranking de Moedinhas')
    .setDescription(lines.join('\n'))
    .setTimestamp();

  if (viewerRank) {
    const viewer = memberMap.get(viewerRank.userId);
    if (viewer) embed.setThumbnail(viewer.user.displayAvatarURL({ dynamic: true, size: 256 }));
    embed.addFields({ name: 'Sua colocação', value: `#${viewerRank.position} — ${formatCoins(viewerRank.coins)}. Não se acostume.` });
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