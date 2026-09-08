const { SlashCommandBuilder } = require('discord.js');
const { PING } = require('./commandNames');

module.exports = {
  name: PING,
  data: new SlashCommandBuilder()
    .setName(PING)
    .setDescription('Confirma que a Kuromi está viva, alerta e julgando tudo.'),
  async executePrefix({ message }) {
    await message.reply('pong. 🏓 Eu estou viva. Tente não parecer tão surpreso.');
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ content: 'pong. 🏓 Eu estou viva. Tente não parecer tão surpreso.' });
  },
};