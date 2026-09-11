const { EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PYXIE_COLORS } = require('./pyxieVoice');

// Tabela de Vantagens e Fraquezas Elementais do Universo de Pymons
// Ciclo Pentagonal Primário:
// ORVALHO (💧) -> SILVESTRE (🌿) -> BRISA (⚡) -> CHARME (🌸) -> TRAVESSURA (🔮) -> ORVALHO (💧)
const ELEMENT_DEFINITIONS = {
  ORVALHO: {
    name: 'Orvalho',
    element: 'ORVALHO',
    emoji: '💧',
    strongAgainst: 'SILVESTRE',
    strongEmoji: '🌿',
    weakAgainst: 'TRAVESSURA',
    weakEmoji: '🔮',
    description: 'Água límpida e cura natural. Condensa umidade e afoga terrenos silvestres.',
  },
  SILVESTRE: {
    name: 'Silvestre',
    element: 'SILVESTRE',
    emoji: '🌿',
    strongAgainst: 'BRISA',
    strongEmoji: '⚡',
    weakAgainst: 'ORVALHO',
    weakEmoji: '💧',
    description: 'Plantas, raízes ancestrais e terra firme. Absorve e ancora correntes de vento e relâmpago.',
  },
  BRISA: {
    name: 'Brisa',
    element: 'BRISA',
    emoji: '⚡',
    strongAgainst: 'CHARME',
    strongEmoji: '🌸',
    weakAgainst: 'SILVESTRE',
    weakEmoji: '🌿',
    description: 'Vento cortante e relâmpagos arcanos. Dispersa aromas e ilusões de fadas e doçura.',
  },
  CHARME: {
    name: 'Charme',
    element: 'CHARME',
    emoji: '🌸',
    strongAgainst: 'TRAVESSURA',
    strongEmoji: '🔮',
    weakAgainst: 'BRISA',
    weakEmoji: '⚡',
    description: 'Magia de fada, amor e luz protetora. Purifica malícias e desconcerta travessuras sombrias.',
  },
  TRAVESSURA: {
    name: 'Travessura',
    element: 'TRAVESSURA',
    emoji: '🔮',
    strongAgainst: 'ORVALHO',
    strongEmoji: '💧',
    weakAgainst: 'CHARME',
    weakEmoji: '🌸',
    description: 'Fogo caótico, sombras e ilusões psíquicas. Evapora e corrompe orvalhos e fontes puras.',
  },
};

function buildElementChartEmbed() {
  const fields = Object.values(ELEMENT_DEFINITIONS).map((e) => ({
    name: `${e.emoji} Elemento ${e.name}`,
    value: [
      `> ⚔️ **Vantagem (+25% dano):** Forte contra ${e.strongEmoji} **${e.strongAgainst}**`,
      `> 🛡️ **Fraqueza (-20% dano):** Fraco contra ${e.weakEmoji} **${e.weakAgainst}**`,
      `> 📜 *${e.description}*`,
    ].join('\n'),
    inline: false,
  }));

  return new EmbedBuilder()
    .setColor(PYXIE_COLORS.violet || '#8a2be2')
    .setTitle('⚖️ Guia de Afinidades & Fraquezas Elementais')
    .setDescription(
      'No Universo de Pymons, cada criatura e World Boss possui uma afinidade elemental.\n' +
      'Aproveite as vantagens de tipo para causar **+25% de dano crítico elemental** em duelos e chefes titânicos!\n\u200b'
    )
    .addFields(fields)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();
}

function buildElementChartButton(customId = 'show_element_chart') {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel('Tabela Elemental')
    .setEmoji('⚖️')
    .setStyle(ButtonStyle.Secondary);
}

module.exports = {
  ELEMENT_DEFINITIONS,
  buildElementChartEmbed,
  buildElementChartButton,
};
