const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { t } = require('../utils/i18n');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

const BOT_PERMISSIONS = 378880; // Send Messages, Embed Links, Attach Files, Read History, Use External Emojis

function getInviteUrl(clientId) {
  const id = clientId || process.env.DISCORD_CLIENT_ID || '1543650200718155897';
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`;
}

function buildInviteEmbed(client, guildOrSource = null) {
  const inviteUrl = getInviteUrl(client?.user?.id);

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta || '#e60067')
    .setTitle(t('invite.title', guildOrSource))
    .setDescription(t('invite.desc', guildOrSource))
    .addFields(
      {
        name: t('invite.petsTitle', guildOrSource),
        value: t('invite.petsDesc', guildOrSource),
        inline: false,
      },
      {
        name: t('invite.dungeonsTitle', guildOrSource),
        value: t('invite.dungeonsDesc', guildOrSource),
        inline: false,
      },
      {
        name: t('invite.economyTitle', guildOrSource),
        value: t('invite.economyDesc', guildOrSource),
        inline: false,
      }
    )
    .setThumbnail(client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(t('invite.btnLabel', guildOrSource))
      .setEmoji('✨')
      .setURL(inviteUrl)
      .setStyle(ButtonStyle.Link)
  );

  return { embeds: [embed], components: [buttonRow] };
}

module.exports = {
  name: 'py-convite',
  aliases: ['convite', 'invite', 'py-invite', 'adicionar'],
  buildInviteEmbed,
  data: new SlashCommandBuilder()
    .setName('py-convite')
    .setDescription('Get Pyxie official invite link / Link oficial para adicionar o bot.'),
  async executePrefix({ message, client }) {
    const view = buildInviteEmbed(client, message.guild?.id);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildInviteEmbed(interaction.client, interaction.guild?.id);
    await interaction.editReply(view);
  },
};
