const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const HELP_MODULES = [
  {
    id: 'todos',
    label: 'Visão Geral / Todos',
    emoji: '📖',
    desc: 'Visão geral e índice de todos os módulos',
  },
  {
    id: 'pymons',
    label: 'Pymons & RPG',
    emoji: '🐾',
    desc: 'Dex inicial, cuidados, chocadeira, dungeons e duelos PvP',
    commands: [
      { name: '/pymons (ou /pet)', desc: 'Dashboard do Pymon ativo, botões de ação e escolha de starter para iniciantes.' },
      { name: '/petexplorar [zona]', desc: 'Envia seu Pymon para explorar dungeons em busca de ovos e moedas.' },
      { name: '/petduelo @usuario [aposta]', desc: 'Desafia outro jogador para um combate por turnos no Coliseu.' },
    ],
  },
  {
    id: 'loja',
    label: 'Loja & Inventário',
    emoji: '🎒',
    desc: 'Comidas, poções, baús e gestão da mochila',
    commands: [
      { name: '/loja', desc: 'Abre o catálogo da Lojinha da Kuromi com categorias e botões de compra rápida.' },
      { name: '/inventario (ou ku!mochila)', desc: 'Exibe sua mochila de itens com opções interativas de uso e venda.' },
      { name: '/comprar <item> [qtd]', desc: 'Compra itens diretamente da loja com moedas da carteira.' },
      { name: '/vender <item> [qtd]', desc: 'Vende itens acumulados em explorações por moedinhas.' },
      { name: '/usar <item>', desc: 'Aplica os efeitos de um item (comida, cura, elixir) no pet ativo.' },
    ],
  },
  {
    id: 'economia',
    label: 'Economia & Carreiras',
    emoji: '🪙',
    desc: 'Moedinhas, trabalho, profissões e ranking',
    commands: [
      { name: '/diario (ou ku!diario)', desc: 'Resgata sua recompensa diária de Moedinhas a cada 24h.' },
      { name: '/carteira [@user]', desc: 'Consulta o saldo de moedas e posição no ranking.' },
      { name: '/profissao [escolha]', desc: 'Escolhe ou troca sua carreira profissional.' },
      { name: '/trabalho', desc: 'Executa seu trabalho diário para receber salário e bônus.' },
      { name: '/ranking', desc: 'Exibe o ranking dos usuários mais ricos da Cringelândia.' },
    ],
  },
  {
    id: 'tarot',
    label: 'Tarot Cringelândia',
    emoji: '🔮',
    desc: 'Tiragens diárias, 78 cartas e suborno',
    commands: [
      { name: '/tarot', desc: 'Realiza a tiragem da sua carta diária com renderização procedural de alta qualidade.' },
      { name: 'Suborno do Tarot', desc: 'Pague 350 moedas para forçar uma nova leitura se o destino foi cruel.' },
    ],
  },
  {
    id: 'social',
    label: 'Social & Casamentos',
    emoji: '💑',
    desc: 'Casamentos, divórcios, perfil e ships',
    commands: [
      { name: '/casal [@user1] [@user2]', desc: 'Calcula a compatibilidade amorosa e gera um cartão ilustrado.' },
      { name: '/casamento @user', desc: 'Pede alguém em casamento oficial na Cringelândia (custa 1.000 moedas).' },
      { name: '/divorcio', desc: 'Encerra o casamento atual com seu cônjuge.' },
      { name: '/perfil [@user]', desc: 'Exibe o cartão de perfil completo com cônjuge e finanças.' },
    ],
  },
  {
    id: 'utilidades',
    label: 'Utilidades & Servidor',
    emoji: '⚙️',
    desc: 'Status, ping, boas-vindas e configurações',
    commands: [
      { name: '/ajuda [modulo]', desc: 'Abre este guia categorizado.' },
      { name: '/ping', desc: 'Testa a latência e tempo de resposta da Kuromi.' },
      { name: '/status', desc: 'Mostra o status de operação do bot e informações do servidor.' },
      { name: '/boasvindas #canal', desc: 'Configura o canal de recepção de novos membros (apenas moderadores).' },
      { name: '/agenda', desc: 'Exibe horários das automações ativas (Tarot, Bump Guide).' },
    ],
  },
];

function buildModularHelpEmbed(moduleId = 'todos') {
  const mod = HELP_MODULES.find((m) => m.id === moduleId) || HELP_MODULES[0];

  const embed = new EmbedBuilder()
    .setColor('#E60067')
    .setTitle(`${mod.emoji}  ✦  Central de Ajuda da Kuromi — ${mod.label}`)
    .setFooter({ text: 'Cringelândia • Kuromi explica com paciência (mas não abuse)' })
    .setTimestamp();

  if (mod.id === 'todos') {
    embed.setDescription(
      'Bem-vindo ao manual completo da Kuromi!\n' +
      'Selecione um **módulo no menu suspenso abaixo** para ver os comandos detalhados:\n\n' +
      HELP_MODULES.filter((m) => m.id !== 'todos')
        .map((m) => `> ${m.emoji} **${m.label}**\n> *${m.desc}*`)
        .join('\n\n')
    );
  } else {
    embed.setDescription(`*${mod.desc}*\n\n**Comandos Disponíveis:**`);
    (mod.commands || []).forEach((cmd) => {
      embed.addFields({
        name: cmd.name,
        value: `> ${cmd.desc}`,
        inline: false,
      });
    });
  }

  return embed;
}

function buildModularHelpComponents(currentModuleId = 'todos', userId = '') {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`help_module_select:${userId}`)
    .setPlaceholder('📂 Escolha uma categoria de comandos...')
    .addOptions(
      HELP_MODULES.map((m) => ({
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
  HELP_MODULES,
  buildModularHelpEmbed,
  buildModularHelpComponents,
  buildHelpMessage,
};
