const { SlashCommandBuilder } = require('discord.js');
const { PING } = require('./commandNames');

module.exports = {
  name: PING,
  data: new SlashCommandBuilder()
    .setName(PING)
    .setDescription('Verifica a latência e o status do bot.'),
  async executePrefix({ message }) {
    await message.reply('🏓 Pong! Bot online e operacional.');
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ content: '🏓 Pong! Bot online e operacional.' });
  },
};