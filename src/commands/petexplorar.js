const { SlashCommandBuilder } = require('discord.js');
const { getActivePet } = require('../services/pets');
const { PET_EXPLORE } = require('./commandNames');
const petHubCommand = require('./pet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName(PET_EXPLORE)
    .setDescription('Inicia expedições em dungeons procedurais com consumo de estamina por passo.')
    .addStringOption((option) =>
      option
        .setName('zona')
        .setDescription('Zona de dungeon')
        .setRequired(false)
        .addChoices(
          { name: '🌲 Bosque dos Guizos (Nv. 1+)', value: 'bosque' },
          { name: '🫧 Recifes Cantantes (Nv. 2+)', value: 'recife' },
          { name: '🪽 Colinas do Vento Doce (Nv. 3+)', value: 'colina' },
          { name: '🏰 Castelo Travesso de Pyxie (Nv. 5+)', value: 'castelo' }
        )
    ),
  aliases: ['dungeon', 'explorar', 'expedicao', 'aventura'],
  async execute(interaction) {
    const userId = interaction.user.id;
    const userTag = interaction.user.displayName || interaction.user.username;
    const directZone = interaction.options.getString('zona');

    if (directZone) {
      const activePet = getActivePet(userId);
      const { startProceduralRun } = require('../services/proceduralExplorer');
      startProceduralRun(userId, directZone, activePet);
    }

    // Abre diretamente na aba de Dungeons do Hub
    const { buildHubView } = petHubCommand;
    // O Hub trata de renderizar a aba de dungeon quando chamada via evento ou comando
    const view = require('./pet').isPetInteraction
      ? petHubCommand.buildHubView(userId, userTag)
      : null;

    // Redireciona para o Hub
    return petHubCommand.execute(interaction);
  },
  async executePrefix(message, args) {
    return petHubCommand.executePrefix(message);
  },
};