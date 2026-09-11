const { SlashCommandBuilder } = require('discord.js');
const { PING } = require('./commandNames');

module.exports = {
  name: PING,
  data: new SlashCommandBuilder()
    .setName(PING)
    .setDescription('Verifica a latência e o status da Pyxie.'),
  async executePrefix({ message }) {
    await message.reply('🏓 Pong! Pyxie está online e 100% operacional!');
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ content: '🏓 Pong! Pyxie está online e 100% operacional!' });
  },
};
