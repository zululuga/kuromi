const { SlashCommandBuilder } = require('discord.js');
const { getActivePet } = require('../services/pets');
const { startProceduralRun } = require('../services/proceduralExplorer');
const { PET_EXPLORE } = require('./commandNames');
const petHubCommand = require('./pet');

module.exports = {
  name: PET_EXPLORE,
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
  async executeSlash({ interaction }) {
    const userId = interaction.user.id;
    const directZone = interaction.options?.getString('zona');

    if (directZone) {
      const activePet = getActivePet(userId);
      startProceduralRun(userId, directZone, activePet);
    }

    // Abre na aba de Dungeon do Hub
    return petHubCommand.executeSlash({ interaction });
  },
  async executePrefix({ message, args }) {
    return petHubCommand.executePrefix({ message });
  },
  isDungeonInteraction() {
    return false;
  },
  async handleDungeonInteraction() {},
};