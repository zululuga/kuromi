const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildPrefixStatusEmbed } = require('./commandHelpers');
const { getPrefix, setPrefix } = require('../utils/botUtils');
const { PREFIX } = require('./commandNames');

module.exports = {
  name: PREFIX,
  aliases: ['prefix'],
  data: new SlashCommandBuilder()
    .setName(PREFIX)
    .setDescription('Altera o prefixo do bot para outro valor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('valor').setDescription('Novo prefixo do bot').setRequired(false)
    ),
  async executePrefix({ message, args, prefix }) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply('❌ Apenas administradores podem alterar o prefixo do bot.');
      return;
    }

    const newValue = args.join(' ').trim();
    const newPrefix = setPrefix(newValue || prefix);

    await message.reply({
      embeds: [buildPrefixStatusEmbed(message.author.tag, newPrefix)],
    });
  },
  async executeSlash({ interaction }) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply('❌ Apenas administradores podem alterar o prefixo do bot.');
      return;
    }

    const value = interaction.options.getString('valor');
    const newPrefix = setPrefix(value || getPrefix());

    await interaction.editReply({
      embeds: [buildPrefixStatusEmbed(interaction.user.tag, newPrefix)],
    });
  },
};