const { SlashCommandBuilder } = require('discord.js');
const { buildPrefixStatusEmbed } = require('./commandHelpers');
const { getPrefix, setPrefix } = require('../utils/botUtils');
const { PREFIX } = require('./commandNames');

module.exports = {
  name: PREFIX,
  aliases: ['prefix'],
  data: new SlashCommandBuilder()
    .setName(PREFIX)
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