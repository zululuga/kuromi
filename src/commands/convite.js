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

  const desc = [
    'Leve toda a magia, diversão e interatividade dos **Pymons** para a sua comunidade!',
    '',
    '✨ **O QUE A PYXIE OFERECE AO SEU SERVIDOR:**',
    '> 🐾 **Tamagotchi & RPG de Pymons:** Choque ovos, alimente, faça carinho e evolua até o Nv. 100.',
    '> 🧭 **Dungeons Procedurais:** Explore labirintos gerados dinamicamente com D-Pad.',
    '> ⚔️ **Coliseu de Duelos & World Boss:** Batalhas estratégicas entre membros e chefes globais.',
    '> 🪙 **Economia & Profissões:** Mini-games interativos de trabalho, moedas e Feijões Mágicos.',
    '> 🔮 **Tarot & Relacionamentos:** Tiragens místicas diárias e sistema de casamentos.',
    '',
    '🔒 **SEGURANÇA & PRIVACIDADE:**',
    '> • Sem permissões invasivas de Administrador.',
    '> • Isolamento completo de dados por servidor.',
    '> • Alta performance e estabilidade 24/7.',
    '',
    'Clique no botão abaixo para adicionar a Pyxie com um único clique:',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.magenta || '#e60067')
    .setTitle('✨  ✦  Convide a Pyxie para seu Servidor!')
    .setDescription(desc)
    .setThumbnail(client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null)
    .setFooter({ text: pyxieFooter('Adicione a Pyxie e comece sua jornada!') })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('➕ Adicionar Pyxie ao Discord')
      .setURL(inviteUrl)
      .setStyle(ButtonStyle.Link)
  );

  return { embeds: [embed], components: [buttonRow] };
}

module.exports = {
  name: 'convite',
  aliases: ['invite', 'addbot', 'adicionar'],
  data: new SlashCommandBuilder()
    .setName('convite')
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
