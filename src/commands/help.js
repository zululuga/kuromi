const { SlashCommandBuilder } = require('discord.js');
const { buildHelpEmbed } = require('./commandHelpers');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra a lista de comandos e funções do bot.'),
  async executePrefix({ message }) {
    await message.reply({ embeds: [buildHelpEmbed()] });
  },
  async executeSlash({ interaction }) {
    await interaction.editReply({ embeds: [buildHelpEmbed()] });
  },
};