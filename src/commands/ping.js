const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde com pong para confirmar que o bot está vivo.'),
  async executePrefix({ message }) {
    await message.reply('pong! 🏓');
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ content: 'pong! 🏓' });
  },
};