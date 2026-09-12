const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const MODULE_METADATA = {
  todos: { id: 'todos', label: 'Visão Geral / Todos', emoji: '📖', desc: 'Visão geral e índice de todas as categorias' },
  pymons: { id: 'pymons', label: 'Pymons & RPG', emoji: '🐾', desc: 'Dex, cuidados, chocadeira, dungeons, boss, duelos e expedições' },
  economia: { id: 'economia', label: 'Economia & Carreiras', emoji: '🪙', desc: 'Moedinhas, trabalho, profissões e ranking global' },
  loja: { id: 'loja', label: 'Loja & Mochila', emoji: '🎒', desc: 'Comidas, poções, ninho, baús e inventário' },
  tarot: { id: 'tarot', label: 'Tarot Místico', emoji: '🔮', desc: 'Tiragens diárias, 78 arcanos e suborno' },
  social: { id: 'social', label: 'Social & Casamentos', emoji: '💑', desc: 'Casamentos, divórcios, perfil de aventureiro e afinidade de casal' },
  utilidades: { id: 'utilidades', label: 'Utilidades & Sistema', emoji: '⚙️', desc: 'Status operacional, ping, convite, agenda e configurações' },
};

const COMMAND_CATEGORY_MAP = {
  pymons: 'pymons',
  'py-pymons': 'pymons',
  petexplorar: 'pymons',
  'py-explorar': 'pymons',
  petduelo: 'pymons',
  'py-duelo': 'pymons',
  boss: 'pymons',
  'py-boss': 'pymons',
  expedicao: 'pymons',
  'py-expedicao': 'pymons',
  trocar: 'pymons',
  'py-trocar': 'pymons',
  dex: 'pymons',
  'py-dex': 'pymons',
  adocao: 'pymons',

  diario: 'economia',
  'py-diario': 'economia',
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
  setareconomia: 'economia',
  resetareconomia: 'economia',

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

  tarot: 'tarot',
  'py-tarot': 'tarot',

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
  agenda: 'utilidades',
  'py-agenda': 'utilidades',
  emojis: 'utilidades',
  'py-emojis': 'utilidades',
  idioma: 'utilidades',
  'py-idioma': 'utilidades',
  sixseven: 'utilidades',
};

let _loadedCommands = null;

function setLoadedCommands(cmds) {
  _loadedCommands = cmds;
}

function getHelpModules(customCommands = null) {
  let commandsList = customCommands || _loadedCommands;
  if (!commandsList) {
    try {
      commandsList = require('./index').commands || [];
    } catch (e) {
      commandsList = [];
    }
  }

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

    const desc = cmd.data?.description || cmd.description || 'Comando da Pyxie';
    const category = cmd.category || COMMAND_CATEGORY_MAP[name] || 'utilidades';
    const targetBucket = moduleCommands[category] || moduleCommands.utilidades;

    targetBucket.push({
      name: `/${name}`,
      desc,
      aliases: cmd.aliases || [],
    });
  }

  return [
    MODULE_METADATA.todos,
    { ...MODULE_METADATA.pymons, commands: moduleCommands.pymons },
    { ...MODULE_METADATA.economia, commands: moduleCommands.economia },
    { ...MODULE_METADATA.loja, commands: moduleCommands.loja },
    { ...MODULE_METADATA.tarot, commands: moduleCommands.tarot },
    { ...MODULE_METADATA.social, commands: moduleCommands.social },
    { ...MODULE_METADATA.utilidades, commands: moduleCommands.utilidades },
  ];
}

function buildModularHelpEmbed(moduleId = 'todos', guildName = '') {
  const modules = getHelpModules();
  const mod = modules.find((m) => m.id === moduleId) || modules[0];
  const serverFooter = guildName ? `${guildName} • Guia de Comandos` : 'Guia de Comandos';

  const embed = new EmbedBuilder()
    .setColor('#E60067')
    .setTitle(`${mod.emoji}  ✦  Central de Ajuda — ${mod.label}`)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  if (mod.id === 'todos') {
    const moduleLines = modules.filter((m) => m.id !== 'todos')
      .map((m) => `**${m.emoji} ${m.label}** (${(m.commands || []).length} comandos)\n> *${m.desc}*`);

    const desc = [
      `Bem-vindo à Central de Ajuda${guildName ? ` de **${guildName}**` : ''}!`,
      '',
      '📖 **MÓDULOS E RECURSOS DO BOT**',
      '',
      moduleLines.join('\n\n'),
      '',
      '💡 *Selecione uma categoria no menu suspenso abaixo para ver todos os comandos:*',
    ].join('\n');

    embed.setDescription(desc);
  } else {
    const cmdLines = (mod.commands || []).length > 0
      ? mod.commands.map((cmd) => `**\`${cmd.name}\`**\n> *${cmd.desc}*`)
      : ['> *Nenhum comando disponível nesta categoria no momento.*'];

    const desc = [
      `*« ${mod.desc} »*`,
      '',
      `📋 **COMANDOS DESTE MÓDULO (${mod.commands?.length || 0})**`,
      '',
      cmdLines.join('\n\n'),
      '',
      '💡 *Use o menu abaixo para navegar entre outras categorias:*',
    ].join('\n');

    embed.setDescription(desc);
  }

  return embed;
}

function buildModularHelpComponents(currentModuleId = 'todos', userId = '') {
  const modules = getHelpModules();
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help_module_select:${userId}`)
    .setPlaceholder('📂 Escolha uma categoria de comandos...')
    .addOptions(
      modules.map((m) => ({
        label: m.label,
        value: m.id,
        emoji: m.emoji,
        description: m.desc.slice(0, 50),
        default: m.id === currentModuleId,
      }))
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildHelpMessage(requestedModule = 'todos', userId = '') {
  const embed = buildModularHelpEmbed(requestedModule);
  const components = buildModularHelpComponents(requestedModule, userId);
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
