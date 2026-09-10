/**
 * Gerenciador de Emojis da Aplicação (Discord Application Emojis).
 * Permite que o bot utilize emojis personalizados registrados globalmente na sua aplicação Discord
 * (até 2.000 emojis) sem depender de servidores externos ou Nitro, com fallbacks automáticos em Unicode.
 */

const APP_EMOJI_CACHE = new Map();

// Mapeamento padrão de identificadores para emojis Unicode e nomes de assets da aplicação
const EMOJI_DEFINITIONS = {
  // Moedas & Economia
  COIN: { name: 'moedinha', fallback: '🪙' },
  MAGIC_BEAN: { name: 'feijao_magico', fallback: '🌱' },
  DIAMOND: { name: 'diamante', fallback: '💎' },
  BAG: { name: 'mochila', fallback: '🎒' },
  TROPHY: { name: 'trofeu', fallback: '🏆' },
  CROWN: { name: 'coroa', fallback: '👑' },

  // Pymons & Elementos
  PET: { name: 'pymon', fallback: '🐾' },
  SHINY: { name: 'shiny_star', fallback: '✨' },
  EGG: { name: 'pymon_egg', fallback: '🥚' },
  DEX: { name: 'dex_book', fallback: '📖' },
  HEART: { name: 'coracao', fallback: '💖' },
  ENERGY: { name: 'energia', fallback: '⚡' },
  HUNGER: { name: 'comida', fallback: '🍖' },

  // Dungeons & Navegação
  COMPASS: { name: 'bussola', fallback: '🧭' },
  SWORD: { name: 'espada', fallback: '⚔️' },
  SHIELD: { name: 'escudo', fallback: '🛡️' },
  CHEST: { name: 'bau', fallback: '📦' },
  PORTAL: { name: 'portal', fallback: '🚩' },
  FOUNTAIN: { name: 'fonte', fallback: '⛲' },
  TRAP: { name: 'armadilha', fallback: '🪤' },

  // UI & Notificações
  CHECK: { name: 'check_mark', fallback: '✅' },
  CROSS: { name: 'cross_mark', fallback: '❌' },
  HOURGLASS: { name: 'ampulheta', fallback: '⏳' },
  GIFT: { name: 'presente', fallback: '🎁' },
  SPARKLES: { name: 'brilhos', fallback: '✨' },
};

/**
 * Inicializa e sincroniza o cache com os Application Emojis do bot.
 * @param {import('discord.js').Client} client
 */
async function syncApplicationEmojis(client) {
  try {
    if (!client?.application) return;
    const appEmojis = await client.application.emojis.fetch();
    APP_EMOJI_CACHE.clear();
    for (const [id, emoji] of appEmojis) {
      APP_EMOJI_CACHE.set(emoji.name.toLowerCase(), emoji.toString());
    }
  } catch (error) {
    // Caso o bot não tenha permissões ou a feature não esteja configurada, usa fallbacks silenciosamente
  }
}

/**
 * Obtém a representação em string do emoji (Application Emoji ou Fallback Unicode).
 * @param {keyof typeof EMOJI_DEFINITIONS | string} emojiKey
 * @returns {string}
 */
function getEmoji(emojiKey) {
  const def = EMOJI_DEFINITIONS[emojiKey];
  if (!def) return typeof emojiKey === 'string' ? emojiKey : '✨';

  const cached = APP_EMOJI_CACHE.get(def.name.toLowerCase());
  return cached || def.fallback;
}

module.exports = {
  EMOJI_DEFINITIONS,
  syncApplicationEmojis,
  getEmoji,
};

