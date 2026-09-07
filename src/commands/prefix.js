const { SlashCommandBuilder } = require('discord.js');
const { buildPrefixStatusEmbed } = require('./commandHelpers');
const { getPrefix, setPrefix } = require('../utils/botUtils');

module.exports = {
  name: 'prefix',
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Altera o prefixo do bot para outro valor.')
    .addStringOption((option) =>
      option.setName('valor').setDescription('Novo prefixo do bot').setRequired(false)
    ),
  async executePrefix({ message, args, prefix }) {
    const newValue = args.join(' ').trim();
    const newPrefix = setPrefix(newValue || prefix);

    await message.reply({
      embeds: [buildPrefixStatusEmbed(message.author.tag, newPrefix)],
    });
  },
  async executeSlash({ interaction }) {
    const value = interaction.options.getString('valor');
    const newPrefix = setPrefix(value || getPrefix());

    await interaction.editReply({
      embeds: [buildPrefixStatusEmbed(interaction.user.tag, newPrefix)],
    });
  },
};