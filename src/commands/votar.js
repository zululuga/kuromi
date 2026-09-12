const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { getVoteUrl } = require('../services/topgg');
const { VOTE } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function isWeekend() {
  const day = new Date().getUTCDay();
  // Sexta (5), Sábado (6) ou Domingo (0) no Top.gg contam como fim de semana
  return day === 0 || day === 5 || day === 6;
}

function buildVoteView(clientOrBotId = null) {
  const botId = clientOrBotId || '1453888365618270331';
  const voteUrl = getVoteUrl(botId);
  const weekend = isWeekend();

  const desc = [
    'Apoie o crescimento do bot votando no **Top.gg** a cada 12 horas e receba recompensas exclusivas instantaneamente!',
    '',
    '🎁 **RECOMPENSAS POR VOTO:**',
    '> 🪙 **+100 Moedinhas** no cofre',
    '> 🥣 **+1x Ração da Floresta** no inventário',
    '> 🐾 **+50 XP** para o seu Pymon ativo',
    '',
    weekend
      ? '🔥 **BÔNUS DE FIM DE SEMANA ATIVO (2X):**\n> 🌟 *Todos os votos durante o fim de semana entregam o **DOBRO**! (+200 Moedas, 🧪 1x Poção Revitalizante e +100 XP)!*'
      : '✨ **DICA DE FIM DE SEMANA (2X):**\n> *De Sexta a Domingo, todos os votos entregam o **DOBRO** (+200 Moedas, 🧪 1x Poção Revitalizante e +100 XP)!*',
    '',
    '👉 *Clique no botão abaixo para abrir a página de votação:*',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(weekend ? PYXIE_COLORS.gold || '#facc15' : PYXIE_COLORS.magenta || '#e60067')
    .setTitle('🗳️  ✦  Vote na Pyxie no Top.gg')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Recompensas entregues automaticamente em segundos!') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Votar no Top.gg (12h)')
      .setEmoji('🗳️')
      .setStyle(ButtonStyle.Link)
      .setURL(voteUrl)
  );

  return { embeds: [embed], components: [row] };
}

const commandName = VOTE || 'py-votar';

module.exports = {
  name: commandName,
  aliases: ['votar', 'vote', 'py-vote'],
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName(commandName)
    .setDescription('Vote no bot no Top.gg e receba Moedinhas, Baús e XP para seu pet!'),
  async executePrefix({ message, client }) {
    const view = buildVoteView(client?.user?.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildVoteView(interaction.client?.user?.id);
    await interaction.editReply(view);
  },
  buildVoteView,
};

