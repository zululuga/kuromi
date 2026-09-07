const { SlashCommandBuilder } = require('discord.js');
const { buildHelpEmbed } = require('./commandHelpers');
const { HELP } = require('./commandNames');

module.exports = {
  name: HELP,
  aliases: ['help'],
  data: new SlashCommandBuilder()
    .setName(HELP)
    .setDescription('Mostra a lista de comandos e funções do bot.')
    .addIntegerOption((option) =>
      option.setName('pagina').setDescription('Número da página').setMinValue(1).setRequired(false)
    ),
  async executePrefix({ message, args }) {
    const page = Number.parseInt(args[0], 10) || 1;
    await message.reply({ embeds: [buildHelpEmbed(page)] });
  },
  async executeSlash({ interaction }) {
    const page = interaction.options.getInteger('pagina') || 1;
    await interaction.editReply({ embeds: [buildHelpEmbed(page)] });
  },
};