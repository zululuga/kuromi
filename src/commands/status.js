const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { STATUS_IMAGE_URL } = require('../config');

function buildStatusEmbed(serverName, userTag) {
  return new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('✅ Bot online')
    .setDescription('Estou monitorando o servidor e pronto para ajudar!')
    .addFields(
      { name: 'Servidor', value: serverName || 'N/A' },
      { name: 'Usuário', value: userTag }
    )
    .setImage(STATUS_IMAGE_URL)
    .setTimestamp();
}

module.exports = {
  name: 'status',
  data: new SlashCommandBuilder()
    .setName('status')
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