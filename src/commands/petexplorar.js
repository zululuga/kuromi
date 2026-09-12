const { SlashCommandBuilder } = require('discord.js');
const { getActivePet } = require('../services/pets');
const { startProceduralRun } = require('../services/proceduralExplorer');
const { PET_EXPLORE } = require('./commandNames');
const { buildDungeonTab } = require('./pet');
const { getLanguage } = require('../utils/i18n');

module.exports = {
  name: PET_EXPLORE,
  aliases: ['dungeon', 'explorar', 'expedicao', 'aventura', 'explore'],
  data: new SlashCommandBuilder()
    .setName(PET_EXPLORE)
    .setDescription('Explore procedural 2D dungeons with your active Pymon.')
    .setDescriptionLocalizations({
      'pt-BR': 'Inicia expedições em masmorras procedurais 2D com seu Pymon.',
    })
    .addStringOption((option) =>
      option
        .setName('zona')
        .setNameLocalizations({
          'en-US': 'zone',
          'en-GB': 'zone',
          'pt-BR': 'zona',
        })
        .setDescription('Dungeon zone / Zona da masmorra')
        .setRequired(false)
        .addChoices(
          { name: '🌲 Bosque dos Guizos (Nv. 1+)', value: 'bosque' },
          { name: '💧 Recifes Cantantes (Nv. 2+)', value: 'recife' },
          { name: '🪶 Colinas do Vento Doce (Nv. 3+)', value: 'colina' },
          { name: '🏰 Castelo Travesso de Pyxie (Nv. 5+)', value: 'castelo' }
        )
    ),
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const userTag = interaction.user.displayName || interaction.user.username;
    const isEn = getLanguage(interaction) === 'en';
    const { isPetOnExpedition, getActiveExpedition } = require('../services/petExpedition');
    if (isPetOnExpedition(userId)) {
      const exp = getActiveExpedition(userId);
      const remainingMins = Math.ceil((exp?.remainingMs || 0) / 60000);
      await interaction.editReply({
        content: isEn
          ? `🧭 **Your Pymon is currently on an expedition!**\nExpected return in **${remainingMins} minute(s)**. Use \`/expedicao\` to claim rewards after return before entering dungeons.`
          : `🧭 **Seu Pymon está atualmente em uma expedição!**\nRetorno previsto em **${remainingMins} minuto(s)**. Use \`/expedicao\` para coletar as recompensas após o retorno antes de entrar em masmorras.`,
      });
      return;
    }

    const directZone = interaction.options?.getString('zona') || interaction.options?.getString('zone');

    if (directZone) {
      const activePet = getActivePet(userId);
      startProceduralRun(userId, directZone, activePet);
    }

    const view = buildDungeonTab(userId, userTag, interaction);
    await interaction.editReply(view);
  },
  async executePrefix({ message }) {
    const userId = message.author.id;
    const userTag = message.author.displayName || message.author.username;
    const isEn = getLanguage(message) === 'en';
    const { isPetOnExpedition, getActiveExpedition } = require('../services/petExpedition');
    if (isPetOnExpedition(userId)) {
      const exp = getActiveExpedition(userId);
      const remainingMins = Math.ceil((exp?.remainingMs || 0) / 60000);
      await message.reply(
        isEn
          ? `🧭 **Your Pymon is currently on an expedition!**\nExpected return in **${remainingMins} minute(s)**. Use \`/expedicao\` to claim rewards after return before entering dungeons.`
          : `🧭 **Seu Pymon está atualmente em uma expedição!**\nRetorno previsto em **${remainingMins} minuto(s)**. Use \`/expedicao\` para coletar as recompensas após o retorno antes de entrar em masmorras.`
      );
      return;
    }

    const view = buildDungeonTab(userId, userTag, message);
    await message.reply(view);
  },
  isDungeonInteraction() {
    return false;
  },
  async handleDungeonInteraction() {},
};