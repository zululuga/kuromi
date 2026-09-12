const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PING } = require('./commandNames');
const { t } = require('../utils/i18n');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function buildPingView(client, source = null) {
  const wsLatency = Math.round(client?.ws?.ping || 0);

  const desc = [
    t('ping.wsLatency', source, { latency: wsLatency }),
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.green || '#22c55e')
    .setTitle(t('ping.title', source))
    .setDescription(desc)
    .setFooter({ text: pyxieFooter('Pyxie Core Engine') })
    .setTimestamp();

  return { embeds: [embed] };
}

module.exports = {
  name: PING,
  aliases: ['ping', 'pong', 'latencia'],
  data: new SlashCommandBuilder()
    .setName(PING)
    .setDescription('Check bot WebSocket latency and API responsiveness.')
    .setDescriptionLocalizations({
      'pt-BR': 'Verifica a latência do WebSocket e tempo de resposta da API.',
    }),
  async executePrefix({ message, client }) {
    const view = buildPingView(client, message);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildPingView(interaction.client, interaction);
    await interaction.editReply(view);
  },
};
