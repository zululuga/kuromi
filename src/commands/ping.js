const { SlashCommandBuilder } = require('discord.js');
const { PING } = require('./commandNames');

module.exports = {
  name: PING,
  data: new SlashCommandBuilder()
    .setName(PING)
    .setDescription('Responde com pong para confirmar que o bot está vivo.'),
  async executePrefix({ message }) {
    await message.reply('pong! 🏓');
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ content: 'pong! 🏓' });
  },
};