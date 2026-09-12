const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getLanguage, t } = require('../utils/i18n');

const MODULE_METADATA = {
  todos: { id: 'todos', label: 'Visão Geral / Todos', emoji: '📖', desc: 'Visão geral e índice de todas as categorias' },
  pymons: { id: 'pymons', label: 'Pymons & RPG', emoji: '🐾', desc: 'Dex, cuidados, chocadeira, masmorras, boss, duelos e expedições' },
  economia: { id: 'economia', label: 'Economia & Carreiras', emoji: '🪙', desc: 'Moedinhas, trabalho, profissões, rankings e cofres' },
  loja: { id: 'loja', label: 'Loja & Mochila', emoji: '🎒', desc: 'Comidas, poções, ninho, baús e inventário' },
  tarot: { id: 'tarot', label: 'Tarot Místico', emoji: '🔮', desc: 'Tiragens diárias, 78 arcanos e oráculo do destino' },
  social: { id: 'social', label: 'Social & Casamentos', emoji: '💑', desc: 'Casamentos, divórcios, perfil de aventureiro e afinidade' },
  utilidades: { id: 'utilidades', label: 'Utilidades & Sistema', emoji: '⚙️', desc: 'Status operacional, ping, convite, agenda, idioma e configurações' },
};

const MODULE_KEYS = ['todos', 'pymons', 'economia', 'loja', 'tarot', 'social', 'utilidades'];
const MODULE_EMOJIS = {
  todos: '📖',
  pymons: '🐾',
  economia: '🪙',
  loja: '🎒',
  tarot: '🔮',
  social: '💑',
  utilidades: '⚙️',
};

const COMMAND_CATEGORY_MAP = {
  // Pymons & RPG
  pymons: 'pymons',
  'py-pymons': 'pymons',
  petexplorar: 'pymons',
  'py-explorar': 'pymons',
  explorar: 'pymons',
  petduelo: 'pymons',
  'py-duelo': 'pymons',
  duelo: 'pymons',
  boss: 'pymons',
  'py-boss': 'pymons',
  expedicao: 'pymons',
  'py-expedicao': 'pymons',
  trocar: 'pymons',
  'py-trocar': 'pymons',
  dex: 'pymons',
  'py-dex': 'pymons',
  adocao: 'pymons',

  // Economia & Carreiras
  diario: 'economia',
  'py-diario': 'economia',
  daily: 'economia',
  carteira: 'economia',
  'py-carteira': 'economia',
  profissao: 'economia',
  'py-profissao': 'economia',
  trabalho: 'economia',
  'py-trabalho': 'economia',
  ranking: 'economia',
  'py-ranking': 'economia',
  votar: 'economia',
  'py-votar': 'economia',
  configeconomia: 'economia',
  'py-configeconomia': 'economia',
  setareconomia: 'economia',
  'py-setareconomia': 'economia',
  resetareconomia: 'economia',
  'py-resetareconomia': 'economia',

  // Loja & Mochila
  loja: 'loja',
  'py-loja': 'loja',
  inventario: 'loja',
  'py-inventario': 'loja',
  comprar: 'loja',
  'py-comprar': 'loja',
  vender: 'loja',
  'py-vender': 'loja',
  usar: 'loja',
  'py-usar': 'loja',

  // Tarot Místico
  tarot: 'tarot',
  'py-tarot': 'tarot',

  // Social & Casamentos
  casal: 'social',
  'py-ship': 'social',
  'py-casal': 'social',
  ship: 'social',
  casamento: 'social',
  'py-casamento': 'social',
  divorcio: 'social',
  'py-divorcio': 'social',
  perfil: 'social',
  'py-perfil': 'social',

  // Utilidades & Sistema
  ajuda: 'utilidades',
  'py-ajuda': 'utilidades',
  help: 'utilidades',
  ping: 'utilidades',
  'py-ping': 'utilidades',
  status: 'utilidades',
  'py-status': 'utilidades',
  convite: 'utilidades',
  'py-convite': 'utilidades',
  boasvindas: 'utilidades',
  'py-boasvindas': 'utilidades',
  setwelcome: 'utilidades',
  agenda: 'utilidades',
  'py-agenda': 'utilidades',
  emojis: 'utilidades',
  'py-emojis': 'utilidades',
  idioma: 'utilidades',
  'py-idioma': 'utilidades',
  sixseven: 'utilidades',
  'py-sixseven': 'utilidades',
};

let _loadedCommands = null;

function setLoadedCommands(cmds) {
  _loadedCommands = cmds;
}

function getHelpModules(customCommands = null, source = null) {
  let commandsList = customCommands || _loadedCommands;
  if (!commandsList) {
    try {
      commandsList = require('./index').commands || [];
    } catch (e) {
      commandsList = [];
    }
  }

  const isEn = getLanguage(source) === 'en';

  const moduleCommands = {
    pymons: [],
    economia: [],
    loja: [],
    tarot: [],
    social: [],
    utilidades: [],
  };

  const seen = new Set();
  for (const cmd of commandsList) {
    const name = cmd.data?.name || cmd.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);

    let desc = '';
    if (isEn) {
      desc = cmd.data?.description || cmd.description || 'Pyxie command';
    } else {
      desc = cmd.data?.description_localizations?.['pt-BR'] ||
        cmd.data?.descriptionLocalizations?.['pt-BR'] ||
        cmd.description ||
        cmd.data?.description ||
        'Comando da Pyxie';
    }

    const category = cmd.category || COMMAND_CATEGORY_MAP[name] || 'utilidades';
    const targetBucket = moduleCommands[category] || moduleCommands.utilidades;

    targetBucket.push({
      name: `/${name}`,
      desc,
      aliases: cmd.aliases || [],
    });
  }

  return MODULE_KEYS.map((key) => {
    const label = t(`help.categories.${key}.label`, source) || MODULE_METADATA[key]?.label || key;
    const desc = t(`help.categories.${key}.desc`, source) || MODULE_METADATA[key]?.desc || '';
    const emoji = MODULE_EMOJIS[key] || '📖';
    if (key === 'todos') {
      return { id: key, label, emoji, desc };
    }
    return { id: key, label, emoji, desc, commands: moduleCommands[key] || [] };
  });
}

function buildModularHelpEmbed(moduleId = 'todos', guildName = '', source = null) {
  const isEn = getLanguage(source) === 'en';
  const modules = getHelpModules(null, source);
  const mod = modules.find((m) => m.id === moduleId) || modules[0];

  const embed = new EmbedBuilder()
    .setColor('#E60067')
    .setTitle(t('help.title', source, { emoji: mod.emoji, label: mod.label }))
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  if (mod.id === 'todos') {
    const moduleLines = modules
      .filter((m) => m.id !== 'todos')
      .map((m) => `**${m.emoji} ${m.label}** (${(m.commands || []).length} ${isEn ? 'commands' : 'comandos'})\n> *${m.desc}*`);

    const serverPrefix = guildName ? ` (**${guildName}**)` : '';
    const desc = [
      t('help.welcome', source, { server: serverPrefix }),
      '',
      t('help.modulesHeader', source),
      '',
      moduleLines.join('\n\n'),
      '',
      t('help.tipDropdown', source),
    ].join('\n');

    embed.setDescription(desc);
  } else {
    const cmdLines = (mod.commands || []).length > 0
      ? mod.commands.map((cmd) => `**\`${cmd.name}\`**\n> *${cmd.desc}*`)
      : [t('help.noCommands', source)];

    const desc = [
      `*« ${mod.desc} »*`,
      '',
      t('help.commandsHeader', source, { count: mod.commands?.length || 0 }),
      '',
      cmdLines.join('\n\n'),
      '',
      t('help.tipNav', source),
    ].join('\n');

    embed.setDescription(desc);
  }

  return embed;
}

function buildModularHelpComponents(currentModuleId = 'todos', userId = '', source = null) {
  const modules = getHelpModules(null, source);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help_module_select:${userId}`)
    .setPlaceholder(t('help.selectPlaceholder', source))
    .addOptions(
      modules.map((m) => ({
        label: m.label,
        value: m.id,
        emoji: m.emoji,
        description: (m.desc || '').slice(0, 50),
        default: m.id === currentModuleId,
      }))
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildHelpMessage(requestedModule = 'todos', userId = '', source = null) {
  const embed = buildModularHelpEmbed(requestedModule, '', source);
  const components = buildModularHelpComponents(requestedModule, userId, source);
  return { embed, components, page: 1, totalPages: 1 };
}

module.exports = {
  MODULE_METADATA,
  get HELP_MODULES() {
    return getHelpModules();
  },
  setLoadedCommands,
  getHelpModules,
  buildModularHelpEmbed,
  buildModularHelpComponents,
  buildHelpMessage,
};
