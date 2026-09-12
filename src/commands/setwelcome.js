const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { setWelcomeChannel } = require('../services/database');
const { WELCOME } = require('./commandNames');
const { t } = require('../utils/i18n');

module.exports = {
  name: WELCOME,
  aliases: ['setwelcome', 'boasvindas', 'welcome'],
  data: new SlashCommandBuilder()
    .setName(WELCOME)
    .setDescription('Sets the channel where welcome messages are sent.')
    .setDescriptionLocalizations({
      'pt-BR': 'Define o canal onde a mensagem de boas-vindas será enviada.',
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setNameLocalizations({
          'en-US': 'channel',
          'en-GB': 'channel',
          'pt-BR': 'canal',
        })
        .setDescription('Text channel for welcomes / Canal de texto')
        .addChannelTypes([0])
        .setRequired(true)
    ),
  async executePrefix({ message, args, prefix }) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply(t('admin.noPermission', message));
      return;
    }

    const channel = message.mentions.channels.first() || message.guild?.channels.cache.get(args[0]);

    if (!channel || !channel.isTextBased()) {
      await message.reply(t('admin.welcomeNeedChannel', message));
      return;
    }

    setWelcomeChannel(message.guildId, channel.id);
    await message.reply({ content: t('admin.welcomeSuccess', message, { channel }) });
  },
  async executeSlash({ interaction }) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply(t('admin.noPermission', interaction));
      return;
    }

    const channel = interaction.options.getChannel('canal') || interaction.options.getChannel('channel');

    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({ content: t('admin.welcomeNeedChannel', interaction) });
      return;
    }

    setWelcomeChannel(interaction.guildId, channel.id);
    await interaction.editReply({ content: t('admin.welcomeSuccess', interaction, { channel }) });
  },
};