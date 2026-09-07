const { SlashCommandBuilder } = require('discord.js');
const { setWelcomeChannel } = require('../services/database');
const { WELCOME } = require('./commandNames');

module.exports = {
  name: WELCOME,
  aliases: ['setwelcome'],
  data: new SlashCommandBuilder()
    .setName(WELCOME)
    .setDescription('Define o canal onde a mensagem de boas-vindas será enviada.')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal de texto para as boas-vindas')
        .addChannelTypes([0])
        .setRequired(true)
    ),
  async executePrefix({ message, args, prefix }) {
    const channel = message.mentions.channels.first() || message.guild?.channels.cache.get(args[0]);

    if (!channel || !channel.isTextBased()) {
      await message.reply(`❌ Você precisa indicar um canal de texto válido. Use: ${prefix}boasvindas #canal`);
      return;
    }

    setWelcomeChannel(message.guildId, channel.id);
    await message.reply({ content: `✅ Canal de boas-vindas configurado para ${channel}.` });
  },
  async executeSlash({ interaction }) {
    const channel = interaction.options.getChannel('canal');

    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({ content: 'Você precisa indicar um canal de texto válido.' });
      return;
    }

    setWelcomeChannel(interaction.guildId, channel.id);
    await interaction.editReply({ content: `Canal de boas-vindas configurado para ${channel}.` });
  },
};