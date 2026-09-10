const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { STATUS_IMAGE_URL } = require('../config');
const { STATUS } = require('./commandNames');

function buildStatusEmbed(serverName, userTag) {
  const desc = [
    'Sistema operacional e serviços ativos em perfeita execução.',
    '',
    '📡 **DADOS DA SESSÃO**',
    `> 🏠 **Servidor:** ${serverName || 'Privado / DM'}`,
    `> 👤 **Operador:** ${userTag}`,
    `> 🟢 **Status:** 100% Online & Monitorando`,
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('✅  ✦  Status do Sistema — Online')
    .setDescription(desc)
    .setImage(STATUS_IMAGE_URL)
    .setFooter({ text: 'Status • Monitoramento Operacional' })
    .setTimestamp();
}

module.exports = {
  name: STATUS,
  data: new SlashCommandBuilder()
    .setName(STATUS)
    .setDescription('Mostra o status do bot e informações do servidor.'),
  async executePrefix({ message }) {
    await message.reply({
      embeds: [buildStatusEmbed(message.guild?.name, message.author.tag)],
    });
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({
      embeds: [buildStatusEmbed(interaction.guild?.name, interaction.user.tag)],
    });
  },
};