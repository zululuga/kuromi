const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { getLanguage, setGuildLanguage, t } = require('../utils/i18n');
const { LANGUAGE } = require('./commandNames');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

function buildLanguageView(guildId) {
  const currentLang = getLanguage(guildId);
  const isPt = currentLang === 'pt';

  const desc = isPt
    ? [
        '🌐 **IDIOMA DO SERVIDOR**',
        '',
        '> Idioma atual: **🇧🇷 Português (Brasil)**',
        '',
        'Escolha o idioma desejado para as mensagens e painéis da Pyxie neste servidor:',
      ].join('\n')
    : [
        '🌐 **SERVER LANGUAGE**',
        '',
        '> Current language: **🇺🇸 English**',
        '',
        'Select the preferred language for Pyxie messages and panels in this server:',
      ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.lilac || '#a855f7')
    .setTitle(isPt ? '🌐  ✦  Configuração de Idioma' : '🌐  ✦  Language Configuration')
    .setDescription(desc)
    .setFooter({ text: pyxieFooter(isPt ? 'Configuração salva por servidor' : 'Setting saved per server') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lang_set:en:${guildId}`)
      .setLabel('English 🇺🇸')
      .setStyle(currentLang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`lang_set:pt:${guildId}`)
      .setLabel('Português 🇧🇷')
      .setStyle(currentLang === 'pt' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

function isLanguageInteraction(interaction) {
  return typeof interaction.customId === 'string' && interaction.customId.startsWith('lang_set:');
}

async function handleLanguageInteraction(interaction) {
  if (interaction.guild && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    const isPt = getLanguage(interaction.guild.id) === 'pt';
    return interaction.reply({
      content: isPt
        ? '❌ Você precisa da permissão de **Gerenciar Servidor** para alterar o idioma.'
        : '❌ You need **Manage Server** permissions to change the language.',
      flags: 64,
    });
  }

  const parts = interaction.customId.split(':');
  const targetLang = parts[1];
  const guildId = parts[2] || interaction.guildId;

  if (guildId) {
    setGuildLanguage(guildId, targetLang);
  }

  const view = buildLanguageView(guildId);
  await interaction.update(view);
}

const commandName = LANGUAGE || 'py-idioma';

module.exports = {
  name: commandName,
  aliases: ['idioma', 'language', 'lang', 'py-language', 'py-lang'],
  buildLanguageView,
  isLanguageInteraction,
  handleLanguageInteraction,
  data: new SlashCommandBuilder()
    .setName(commandName)
    .setDescription('Configure o idioma do bot no servidor / Set bot server language')
    .addStringOption((option) =>
      option
        .setName('idioma')
        .setDescription('Escolha o idioma / Choose language')
        .setRequired(false)
        .addChoices(
          { name: 'English 🇺🇸', value: 'en' },
          { name: 'Português 🇧🇷', value: 'pt' }
        )
    ),
  async executePrefix({ message, args }) {
    if (!message.guild) {
      return message.reply('Este comando deve ser usado dentro de um servidor.');
    }
    const chosen = args[0]?.toLowerCase();
    if (chosen === 'en' || chosen === 'english') {
      setGuildLanguage(message.guild.id, 'en');
      return message.reply('✅ Server language set to **English 🇺🇸**!');
    }
    if (chosen === 'pt' || chosen === 'portugues') {
      setGuildLanguage(message.guild.id, 'pt');
      return message.reply('✅ Idioma do servidor alterado para **Português 🇧🇷**!');
    }
    const view = buildLanguageView(message.guild.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    if (!interaction.guild) {
      return interaction.editReply({ content: 'This command must be run inside a server.' });
    }
    const chosen = interaction.options.getString('idioma');
    if (chosen) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply({
          content: '❌ You need **Manage Server** permissions to change the server language.',
        });
      }
      setGuildLanguage(interaction.guild.id, chosen);
      const isPt = chosen === 'pt';
      return interaction.editReply({
        content: isPt
          ? '✅ Idioma do servidor atualizado para **Português 🇧🇷**!'
          : '✅ Server language updated to **English 🇺🇸**!',
      });
    }

    const view = buildLanguageView(interaction.guild.id);
    await interaction.editReply(view);
  },
};
