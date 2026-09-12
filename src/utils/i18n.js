const { getGuildSettings, setGuildSettings } = require('../services/database');

const CRINGELANDIA_GUILD_ID = '1453890868980482090';

/**
 * Obtém o idioma ativo para um servidor/contexto.
 * - Servidor Cringelândia: 'pt' por padrão.
 * - Outros servidores / DMs: 'en' por padrão.
 * - Pode ser customizado com /py-idioma.
 */
function getLanguage(guildOrId) {
  const guildId = typeof guildOrId === 'string'
    ? guildOrId
    : (guildOrId?.guild?.id || guildOrId?.guildId || guildOrId?.id || null);

  if (!guildId) return 'en'; // DMs padrão em inglês

  const settings = getGuildSettings(guildId);
  if (settings && settings.lang) {
    return settings.lang;
  }

  // Se for a Cringelândia, o padrão é Português
  if (guildId === CRINGELANDIA_GUILD_ID) {
    return 'pt';
  }

  // Padrão global para todos os outros servidores é Inglês
  return 'en';
}

/**
 * Define o idioma oficial do servidor.
 */
function setGuildLanguage(guildId, lang) {
  const normalized = lang === 'pt' || lang === 'pt-BR' ? 'pt' : 'en';
  setGuildSettings(guildId, { lang: normalized });
  return normalized;
}

const TRANSLATIONS = {
  pt: {
    common: {
      footer: 'Pyxie',
      error: '❌ Ocorreu um erro ao processar sua solicitação.',
      onlyOwner: '❌ Este painel pertence a outro aventureiro.',
      cooldown: '⏳ Aguarde {time} para usar novamente.',
    },
    vote: {
      title: '🗳️  ✦  Vote na Pyxie no Top.gg',
      desc: 'Apoie o crescimento do bot votando no **Top.gg** a cada 12 horas e receba recompensas exclusivas instantaneamente!',
      rewardsTitle: '🎁 **RECOMPENSAS POR VOTO:**',
      rewardCoins: '> 🪙 **+100 Moedinhas** no cofre',
      rewardItem: '> 🥣 **+1x Ração da Floresta** no inventário',
      rewardXp: '> 🐾 **+50 XP** para o seu Pymon ativo',
      weekendActive: '🔥 **BÔNUS DE FIM DE SEMANA ATIVO (2X):**\n> 🌟 *Todos os votos durante o fim de semana entregam o **DOBRO**! (+200 Moedas, 🧪 1x Poção Revitalizante e +100 XP)!*',
      weekendTip: '✨ **DICA DE FIM DE SEMANA (2X):**\n> *De Sexta a Domingo, todos os votos entregam o **DOBRO** (+200 Moedas, 🧪 1x Poção Revitalizante e +100 XP)!*',
      cta: '👉 *Clique no botão abaixo para abrir a página de votação:*',
      btnLabel: 'Votar no Top.gg (12h)',
      footerText: 'Recompensas entregues automaticamente em segundos!',
    },
    daily: {
      titleClaimed: '🪙  ✦  Recompensa Diária Coletada!',
      descClaimed: 'Sua recompensa diária foi entregue com sucesso no seu cofre!',
      summaryTitle: '🪙 **RESUMO DA RECOMPENSA**',
      collected: '> 💰 **Moedas Coletadas:** **+{amount}**',
      balance: '> 🏦 **Saldo Atual:** **+{balance}**',
      magicBean: '> ✨ **SORTE ÉPICA (1% de Chance):** **+1x Feijão Mágico 🌱** (Total: **{total} 🌱**)',
      titleCooldown: '🪙  ✦  Cofre Diário em Cooldown',
      descCooldown: '⏳ Você já coletou sua recompensa diária hoje. Espere **{time}** para resgatar novamente o cofre diário!',
      voteWeekendBonus: '🔥 **BÔNUS DE FIM DE SEMANA ATIVO (2X):**\n> Vote no **Top.gg** e ganhe **+200 Moedas**, **🧪 1x Poção Revitalizante** e **+100 XP** para seu Pymon!',
      voteWeekdayBonus: '🗳️ **BÔNUS EXTRA NO TOP.GG (A CADA 12H):**\n> Vote no **Top.gg** e ganhe **+100 Moedas**, **🥣 1x Ração da Floresta** e **+50 XP** *(com dobro nos fins de semana!)*',
      btnLabel: 'Resgatar Bônus no Top.gg',
      btnLabelCooldown: 'Votar no Top.gg (Recompensa Extra)',
      footer: 'Recompensa renovada a cada 24 horas',
      footerCooldown: 'Voto no Top.gg disponível a cada 12 horas',
    },
    ping: {
      title: '🏓  ✦  Latência & Performance',
      wsLatency: '⚡ **Latência do WebSocket:** `{latency}ms`',
      apiLatency: '🌐 **Tempo de Resposta:** `{latency}ms`',
    },
    status: {
      title: '🌸  ✦  Status Operacional — Pyxie',
      uptime: '⏱️ **Tempo Online:** `{uptime}`',
      ram: '🧠 **Consumo de Memória:** `{ram} MB`',
      servers: '🌐 **Servidores:** `{servers}`',
      users: '👥 **Usuários Ativos:** `{users}`',
    },
    invite: {
      title: '✨ Convite da Pyxie',
      desc: 'Traga diversão, RPG de criaturas mágicas e entretenimento completo para o seu servidor Discord!\n\u200b',
      petsTitle: '🐾 Tamagotchi & Pymons',
      petsDesc: 'Adote, cuide, alimente e evolua companheiros mágicos com atributos, expedições e duelos.',
      dungeonsTitle: '🗺️ Dungeons 2D & World Boss',
      dungeonsDesc: 'Masmorras procedurais com movimentação em grade e combates épicos contra chefes mundiais.',
      economyTitle: '🪙 Economia & Comunidade',
      economyDesc: 'Profissões interativas, títulos de prestígio, mercado de trocas, Tarot místico e casamentos.',
      btnLabel: 'Adicionar Pyxie ao Servidor',
    },
    languageCmd: {
      current: '🌐 O idioma deste servidor está configurado como: **Português 🇧🇷**.',
      updated: '✅ Idioma do servidor atualizado com sucesso para: **{lang}**!',
    },
  },
  en: {
    common: {
      footer: 'Pyxie',
      error: '❌ An error occurred while processing your request.',
      onlyOwner: '❌ This panel belongs to another adventurer.',
      cooldown: '⏳ Please wait {time} before using this again.',
    },
    vote: {
      title: '🗳️  ✦  Vote for Pyxie on Top.gg',
      desc: 'Support the bot on **Top.gg** every 12 hours and claim exclusive instant rewards!',
      rewardsTitle: '🎁 **VOTE REWARDS:**',
      rewardCoins: '> 🪙 **+100 Coins** in your vault',
      rewardItem: '> 🥣 **+1x Forest Ration** in your backpack',
      rewardXp: '> 🐾 **+50 XP** for your active Pymon',
      weekendActive: '🔥 **WEEKEND BONUS ACTIVE (2X):**\n> 🌟 *All weekend votes deliver **DOUBLE REWARDS**! (+200 Coins, 🧪 1x Revitalizing Potion & +100 XP)!*',
      weekendTip: '✨ **WEEKEND TIP (2X):**\n> *From Friday to Sunday, all votes grant **DOUBLE REWARDS** (+200 Coins, 🧪 1x Revitalizing Potion & +100 XP)!*',
      cta: '👉 *Click the button below to open the voting page:*',
      btnLabel: 'Vote on Top.gg (12h)',
      footerText: 'Rewards delivered automatically in seconds!',
    },
    daily: {
      titleClaimed: '🪙  ✦  Daily Reward Collected!',
      descClaimed: 'Your daily reward has been safely deposited into your vault!',
      summaryTitle: '🪙 **REWARD SUMMARY**',
      collected: '> 💰 **Coins Collected:** **+{amount}**',
      balance: '> 🏦 **Current Balance:** **+{balance}**',
      magicBean: '> ✨ **EPIC LUCK (1% Chance):** **+1x Magic Bean 🌱** (Total: **{total} 🌱**)',
      titleCooldown: '🪙  ✦  Daily Vault on Cooldown',
      descCooldown: '⏳ You already collected your daily vault today. Please wait **{time}** before claiming again!',
      voteWeekendBonus: '🔥 **WEEKEND BONUS ACTIVE (2X):**\n> Vote on **Top.gg** and get **+200 Coins**, **🧪 1x Revitalizing Potion** and **+100 XP** for your Pymon!',
      voteWeekdayBonus: '🗳️ **EXTRA TOP.GG BONUS (EVERY 12H):**\n> Vote on **Top.gg** and get **+100 Coins**, **🥣 1x Forest Ration** and **+50 XP** *(with double on weekends!)*',
      btnLabel: 'Claim Bonus on Top.gg',
      btnLabelCooldown: 'Vote on Top.gg (Extra Reward)',
      footer: 'Reward resets every 24 hours',
      footerCooldown: 'Top.gg voting available every 12 hours',
    },
    ping: {
      title: '🏓  ✦  Latency & Performance',
      wsLatency: '⚡ **WebSocket Latency:** `{latency}ms`',
      apiLatency: '🌐 **API Response Time:** `{latency}ms`',
    },
    status: {
      title: '🌸  ✦  Operational Status — Pyxie',
      uptime: '⏱️ **Uptime:** `{uptime}`',
      ram: '🧠 **Memory Usage:** `{ram} MB`',
      servers: '🌐 **Servers:** `{servers}`',
      users: '👥 **Active Users:** `{users}`',
    },
    invite: {
      title: '✨ Invite Pyxie',
      desc: 'Bring fun, creature RPG adventure, and rich virtual economy to your Discord server!\n\u200b',
      petsTitle: '🐾 Tamagotchi & Pymons',
      petsDesc: 'Adopt, care for, feed, and evolve magical companions with stats, expeditions, and duels.',
      dungeonsTitle: '🗺️ 2D Dungeons & World Boss',
      dungeonsDesc: 'Procedural dungeons with grid movement and epic multiplayer world boss battles.',
      economyTitle: '🪙 Economy & Community',
      economyDesc: 'Interactive professions, prestige titles, trading system, mystic Tarot, and marriages.',
      btnLabel: 'Add Pyxie to Server',
    },
    languageCmd: {
      current: '🌐 This server language is set to: **English 🇺🇸**.',
      updated: '✅ Server language successfully updated to: **{lang}**!',
    },
  },
};

/**
 * Traduz uma chave para o idioma do contexto/servidor.
 */
function t(pathKey, source = null, replacements = {}) {
  const lang = getLanguage(source);
  const keys = pathKey.split('.');

  let current = TRANSLATIONS[lang] || TRANSLATIONS.en;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback para inglês se a chave faltar
      let fallback = TRANSLATIONS.en;
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return pathKey;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') return pathKey;

  let text = current;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

module.exports = {
  CRINGELANDIA_GUILD_ID,
  getLanguage,
  setGuildLanguage,
  t,
  TRANSLATIONS,
};
