const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const { PYXIE_COLORS, pyxieFooter } = require('../utils/pyxieVoice');

const BOT_PERMISSIONS = 378880; // Send Messages, Embed Links, Attach Files, Read History, Use External Emojis

function getInviteUrl(clientId) {
  const id = clientId || process.env.DISCORD_CLIENT_ID || '1543650200718155897';
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`;
}

function buildInviteEmbed(client) {
  const inviteUrl = getInviteUrl(client?.user?.id);

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta || '#e60067')
    .setTitle('✨ Convite da Pyxie')
    .setDescription('Traga diversão, RPG de criaturas mágicas e entretenimento completo para o seu servidor Discord!\n\u200b')
    .addFields(
      {
        name: '🐾 Tamagotchi & Pymons',
        value: 'Adote, cuide, alimente e evolua companheiros mágicos com atributos, expedições e duelos.',
        inline: false,
      },
      {
        name: '🗺️ Dungeons 2D & World Boss',
        value: 'Masmorras procedurais com movimentação em grade e combates épicos contra chefes mundiais.',
        inline: false,
      },
      {
        name: '🪙 Economia & Comunidade',
        value: 'Profissões interativas, títulos de prestígio, mercado de trocas, Tarot místico e casamentos.',
        inline: false,
      },
      {
        name: '🔒 Seguro e Confiável',
        value: 'Permissões transparentes (sem administrador) e operação ininterrupta 24 horas por dia.',
        inline: false,
      }
    )
    .setThumbnail(client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Adicionar ao Servidor')
      .setEmoji('✨')
      .setURL(inviteUrl)
      .setStyle(ButtonStyle.Link)
  );

  return { embeds: [embed], components: [buttonRow] };
}

const { INVITE } = require('./commandNames');

module.exports = {
  name: INVITE,
  aliases: ['convite', 'invite', 'addbot', 'adicionar'],
  data: new SlashCommandBuilder()
    .setName(INVITE)
    .setDescription('Receba o link oficial de convite para adicionar a Pyxie ao seu servidor.'),
  async executePrefix({ message }) {
    const view = buildInviteEmbed(message.client);
    await message.reply(view);
  },
  async executeSlash({ interaction }) {
    const view = buildInviteEmbed(interaction.client);
    await interaction.editReply(view);
  },
};

