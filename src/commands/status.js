const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { STATUS_IMAGE_URL } = require('../config');
const { STATUS } = require('./commandNames');
const { t } = require('../utils/i18n');

function buildStatusEmbed(serverName, userTag, source = null) {
  const desc = [
    t('status.desc', source),
    '',
    t('status.sessionHeader', source),
    t('status.server', source, { server: serverName || 'Direct Message' }),
    t('status.operator', source, { user: userTag }),
    t('status.statusOnline', source),
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle(t('status.title', source))
    .setDescription(desc)
    .setImage(STATUS_IMAGE_URL)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();
}

module.exports = {
  name: STATUS,
  aliases: ['status', 'uptime', 'info'],
  data: new SlashCommandBuilder()
    .setName(STATUS)
    .setDescription('View system and server status.')
    .setDescriptionLocalizations({
      'pt-BR': 'Mostra o status do bot e informações do servidor.',
    }),
  async executePrefix({ message }) {
    await message.reply({
      embeds: [buildStatusEmbed(message.guild?.name, message.author.tag, message)],
    });
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({
      embeds: [buildStatusEmbed(interaction.guild?.name, interaction.user.tag, interaction)],
    });
  },
};