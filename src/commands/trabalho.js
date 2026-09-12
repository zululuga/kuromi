const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');
const professions = require('../services/professions');
const {
  finishWork,
  getUserAccount,
  getWorkStatus,
  startWork,
} = require('../services/economy');
const { formatCoins, formatRemaining } = require('./economyHelpers');
const { WORK } = require('./commandNames');
const { KUROMI_COLORS } = require('../utils/kuromiVoice');
const { PYXIE_COLORS } = require('../utils/pyxieVoice');

const WORK_MINIMUM = 20;
const WORK_MAXIMUM = 65;
const WORK_TIMEOUT_MS = 45 * 1000;

// Sessões ativas de minigames em RAM
const activeWorkSessions = new Map();

const PROFESSION_MINIGAMES = {
  programador: [
    {
      scenario: '💻 **Salvando o Projeto!**\nVocê acabou de programar uma nova funcionalidade no computador. O que você deve fazer antes de desligar?',
      correct: 'Salvar o arquivo e fazer backup do código',
      wrongs: [
        'Desligar o computador direto na tomada',
        'Apagar todo o código para liberar memória',
        'Jogar água no teclado',
      ],
    },
    {
      scenario: '🐛 **Erro de Digitação no Código!**\nO programa avisou que faltou fechar uma letra no comando. Como você resolve?',
      correct: 'Abrir o código e corrigir a digitação',
      wrongs: [
        'Chutar o monitor com força',
        'Trocar de mouse',
        'Formatar o computador inteiro',
      ],
    },
    {
      scenario: '🌐 **Botão no Site!**\nUm cliente pediu para colocar um botão clicável na página dele. O que você faz?',
      correct: 'Adicionar a linha do botão no código do site',
      wrongs: [
        'Desenhar um botão com canetinha na tela',
        'Furar o monitor com uma furadeira',
        'Colar um pedaço de fita adesiva na tela',
      ],
    },
  ],

  cozinheiro: [
    {
      scenario: '🍳 **Fritando um Ovo!**\nA frigideira está no fogo e você vai fritar um ovo. O que você coloca para não grudar?',
      correct: 'Um pouco de óleo ou manteiga',
      wrongs: [
        'Sabão em pó',
        'Suco de uva fervente',
        'Areia da praia',
      ],
    },
    {
      scenario: '🍲 **Sopa Fervendo!**\nA panela de sopa acabou de sair do fogão muito quente. O que fazer antes de provar?',
      correct: 'Esperar esfriar um pouco ou assoprar com cuidado',
      wrongs: [
        'Engolir tudo de uma vez sem mastigar',
        'Jogar pedras de carvão dentro da sopa',
        'Comer com a mão direto na panela pelando',
      ],
    },
    {
      scenario: '🍰 **Bolo Fofinho no Forno!**\nQual ingrediente clássico ajuda a massa do bolo a crescer e ficar macia?',
      correct: 'Fermento em pó',
      wrongs: [
        'Vinagre puro',
        'Sal grosso em excesso',
        'Pimenta malagueta',
      ],
    },
  ],

  agricultor: [
    {
      scenario: '🌱 **Plantação com Sede!**\nO sol forte da tarde deixou a terra da horta bem seca. O que as plantas precisam?',
      correct: 'Água fresca através da rega',
      wrongs: [
        'Refrigerante de cola gelado',
        'Óleo de motor usado',
        'Tinta guache colorida',
      ],
    },
    {
      scenario: '🍅 **Hora da Colheita!**\nOs tomates na horta estão bem vermelhos, maduros e cheirosos. O que você faz?',
      correct: 'Colher com cuidado e guardar na cesta',
      wrongs: [
        'Deixar apodrecer no chão',
        'Enterrar os tomates no fundo da terra',
        'Jogar pedras na plantação',
      ],
    },
    {
      scenario: '🥕 **Novo Canteiro!**\nO que é essencial colocar na terra adubada para nascer uma nova plantinha?',
      correct: 'Sementes ou mudas saudáveis',
      wrongs: [
        'Parafusos enferrujados',
        'Pilhas velhas',
        'Pedaços de plástico',
      ],
    },
  ],

  medico: [
    {
      scenario: '🩺 **Paciente com Febre!**\nUma pessoa chega dizendo que está com o corpo muito quente. O que você usa para medir a temperatura?',
      correct: 'Termômetro',
      wrongs: [
        'Régua escolar de plástico',
        'Balança de cozinha',
        'Cronômetro de corrida',
      ],
    },
    {
      scenario: '🩹 **Arranhão no Joelho!**\nUm aventureiro ralou o joelho no chão. Qual o primeiro passo do curativo?',
      correct: 'Lavar o machucado com água limpa e sabão neutro',
      wrongs: [
        'Passar terra por cima para tampar',
        'Esfregar com uma esponja de aço',
        'Cobrir com papelão sujo',
      ],
    },
    {
      scenario: '💧 **Muita Sede no Calor!**\nO paciente caminhou bastante no sol e está com sede e cansaço. O que ele deve beber?',
      correct: 'Bastante água fresca',
      wrongs: [
        'Óleo de cozinha',
        'Vinagre puro',
        'Água do mar com sal',
      ],
    },
  ],

  musico: [
    {
      scenario: '🎸 **Preparando o Violão!**\nO que você deve fazer antes de começar a tocar para o som sair bonito e afinado?',
      correct: 'Afinar as cordas no tom correto',
      wrongs: [
        'Cortar todas as cordas com alicate',
        'Passar cola branca nas cordas',
        'Mergulhar o violão num balde de água',
      ],
    },
    {
      scenario: '🥁 **Ritmo da Música!**\nVocê está tocando bateria com a banda. Qual é o seu papel principal?',
      correct: 'Manter o ritmo e o tempo da música',
      wrongs: [
        'Tocar o mais desgovernado e fora do tempo possível',
        'Parar de tocar de repente no meio da música',
        'Jogar as baquetas no público com raiva',
      ],
    },
    {
      scenario: '🎤 **Cuidando da Voz!**\nO cantor vai se apresentar hoje à noite. O que ele deve fazer para cuidar da voz?',
      correct: 'Beber água e aquecer a voz antes de cantar',
      wrongs: [
        'Gritar até ficar rouco antes do show',
        'Chupar pedras de gelo sem parar',
        'Comer areia',
      ],
    },
  ],

  professor: [
    {
      scenario: '📚 **Início da Aula!**\nOs alunos acabaram de entrar na sala. O que o professor faz para saber quem veio?',
      correct: 'Fazer a chamada dos alunos presentes',
      wrongs: [
        'Apagar a luz e ir embora dormir',
        'Mandar todo mundo correr sem rumo',
        'Esconder os cadernos de todos',
      ],
    },
    {
      scenario: '✏️ **Explicando a Lição!**\nO professor quer escrever uma explicação para a turma toda acompanhar. Onde ele escreve?',
      correct: 'Na lousa / quadro da sala de aula',
      wrongs: [
        'No chão da entrada',
        'Nas roupas dos alunos',
        'Na parede do banheiro',
      ],
    },
    {
      scenario: '📖 **Dúvida na Lição!**\nUm aluno levantou a mão porque não entendeu um exercício. Como agir?',
      correct: 'Explicar com calma de um jeito fácil de entender',
      wrongs: [
        'Rir do aluno e passar o dobro de lição',
        'Fingir que não ouviu e sair da sala',
        'Tirar todos os pontos da turma',
      ],
    },
  ],

  fotografo: [
    {
      scenario: '📸 **Ambiente Escuro!**\nVocê vai tirar uma foto num quarto escuro e quase não dá para enxergar nada. O que você usa?',
      correct: 'O flash da câmera ou acender as luzes',
      wrongs: [
        'Tampar a lente com a mão',
        'Apagar a única lâmpada acesa',
        'Fechar os olhos bem forte',
      ],
    },
    {
      scenario: '🖼️ **Foto Embaçada!**\nA foto ficou toda borrada e fora de foco. O que você ajusta na câmera?',
      correct: 'O foco na pessoa ou objeto que quer fotografar',
      wrongs: [
        'Chacoalhar a câmera com força ao apertar o botão',
        'Passar lixa na lente da câmera',
        'Tirar a foto correndo de costas',
      ],
    },
    {
      scenario: '🔋 **Bateria da Câmera!**\nVocê tem um ensaio fotográfico amanhã cedo. O que precisa fazer hoje à noite?',
      correct: 'Colocar a bateria da câmera para carregar',
      wrongs: [
        'Deixar a câmera ligada no chão a noite toda',
        'Molhar a bateria na pia',
        'Jogar a câmera no lixo',
      ],
    },
  ],

  mecanico: [
    {
      scenario: '🚗 **Pneu Furado!**\nO carro pegou um prego e o pneu murchou. Qual ferramenta você usa para erguer o carro e trocar a roda?',
      correct: 'O macaco mecânico / hidráulico',
      wrongs: [
        'Um pedaço de graveto fino',
        'Um secador de cabelo',
        'Um martelo de plástico de brinquedo',
      ],
    },
    {
      scenario: '🛢️ **Nível de Óleo!**\nVocê vai conferir se o motor tem óleo suficiente. Qual item você usa para checar?',
      correct: 'A vareta medidora de óleo do motor',
      wrongs: [
        'Um palito de dente',
        'Uma colher de sopa',
        'Um canudo de refrigerante',
      ],
    },
    {
      scenario: '🛑 **Farol Queimado!**\nO motorista avisa que um dos faróis dianteiros não está acendendo à noite. O que deve ser trocado?',
      correct: 'A lâmpada do farol',
      wrongs: [
        'O volante do carro',
        'O tapete do porta-malas',
        'A antena do rádio',
      ],
    },
  ],

  vendedor: [
    {
      scenario: '🤝 **Cliente Chegando na Loja!**\nUma pessoa acabou de entrar na sua loja. Qual a atitude mais educada?',
      correct: 'Cumprimentar com simpatia e perguntar como pode ajudar',
      wrongs: [
        'Ignorar a pessoa e ficar mexendo no celular',
        'Dizer para ela não encostar em nada',
        'Mandar a pessoa ir embora da loja',
      ],
    },
    {
      scenario: '💰 **Dando o Troco!**\nO item custa 15 moedas e o cliente pagou com uma nota de 20 moedas. Qual o troco?',
      correct: '5 moedas',
      wrongs: [
        '100 moedas',
        'Ficar com o dinheiro e não dar nada de troco',
        '50 moedas',
      ],
    },
    {
      scenario: '🏷️ **Promoção Especial!**\nA loja vai fazer uma queima de estoque. O que colocar nos produtos para destacar o preço baixo?',
      correct: 'Etiquetas chamativas com o desconto da promoção',
      wrongs: [
        'Esconder os produtos no armário trancado',
        'Colocar uma placa dizendo "loja fechada"',
        'Apagar as luzes da loja',
      ],
    },
  ],

  artista: [
    {
      scenario: '🎨 **Mistura de Cores!**\nVocê está pintando uma árvore e acabou a tinta verde. Quais cores misturar para criar verde?',
      correct: 'Azul e Amarelo',
      wrongs: [
        'Vermelho e Preto',
        'Branco e Roxo',
        'Rosa e Marrom',
      ],
    },
    {
      scenario: '🖌️ **Cuidando dos Pincéis!**\nDepois de pintar um quadro colorido, o que fazer com os pincéis para as cerdas não estragarem?',
      correct: 'Lavar bem com água e secar com cuidado',
      wrongs: [
        'Deixar secar sujo com tinta dura',
        'Cortar os pelos do pincel com tesoura',
        'Queimar as cerdas no fogo',
      ],
    },
    {
      scenario: '🖼️ **Onde Pintar a Tela!**\nO pintor vai começar um quadro novo com tinta a óleo. Onde ele apoia a tela de pintura?',
      correct: 'Em um cavalete de pintura',
      wrongs: [
        'Na janela de vidro do vizinho',
        'No chão do banheiro molhado',
        'No pneu do carro',
      ],
    },
  ],
};

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isWorkInteraction(interaction) {
  return typeof interaction.customId === 'string' && interaction.customId.startsWith('work_ans:');
}

async function handleWorkInteraction(interaction) {
  const parts = interaction.customId.split(':');
  const selectedIdx = Number(parts[1]);
  const sessionUserId = parts[2];

  if (interaction.user.id !== sessionUserId) {
    return interaction.reply({
      content: '❌ Este expediente pertence a outro trabalhador. Use `/trabalho` para iniciar o seu!',
      flags: 64,
    });
  }

  const session = activeWorkSessions.get(sessionUserId);
  if (!session) {
    return interaction.reply({
      content: '⌛ Este expediente já foi finalizado ou expirou. Use `/trabalho` novamente quando estiver disponível!',
      flags: 64,
    });
  }

  activeWorkSessions.delete(sessionUserId);

  const isCorrect = selectedIdx === session.correctIndex;
  const isCriticalBonus = isCorrect && Math.random() < 0.02; // 2% de chance de bônus de Feijão Mágico em acertos

  const result = finishWork(sessionUserId, isCorrect, session.salary, isCriticalBonus);

  if (!isCorrect) {
    const desc = [
      'Você cometeu um equívoco na sua tomada de decisão profissional!',
      '',
      '💡 **DECISÃO TÉCNICA CORRETA**',
      `> *${session.correctText}*`,
      '',
      '⏳ **PRÓXIMO EXPEDIENTE**',
      '> Você não recebeu salário desta vez. Descanse e tente novamente em **3 horas**!',
    ].join('\n');

    const errorEmbed = new EmbedBuilder()
      .setColor(PYXIE_COLORS.crimson || '#ef4444')
      .setTitle(`❌  ✦  Expediente de ${session.professionLabel} Falhou`)
      .setDescription(desc)
      .setFooter({ text: 'Pyxie' })
      .setTimestamp();

    return interaction.update({ embeds: [errorEmbed], components: [] });
  }

  const desc = [
    'Você resolveu o desafio com maestria técnica e dedicação!',
    '',
    '💰 **REMUNERAÇÃO DO EXPEDIENTE**',
    `> 🪙 **Salário Recebido:** **+${formatCoins(result.amount)}**`,
    `> 💳 **Novo Saldo:** **${formatCoins(result.balance)}**`,
    '',
    '📈 **CARREIRA**',
    `> 🔨 **Total Concluído:** **${getUserAccount(sessionUserId).workCount}** trabalhos`,
  ];

  if (result.bonusBean) {
    desc.push(
      '',
      '✨ **BÔNUS ÉPICO DE DESEMPENHO (2% de Chance)!**',
      `> 🌱 Você recebeu **+1 Feijão Mágico** pelo serviço impecável! (Saldo: **${result.magicBeans} 🌱**)`
    );
  }

  const successEmbed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.emerald || '#10b981')
    .setTitle(`✅  ✦  Expediente de ${session.professionLabel} Concluído!`)
    .setDescription(desc.join('\n'))
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  return interaction.update({ embeds: [successEmbed], components: [] });
}

async function runWork(source, reply) {
  const user = source.user || source.author;
  const account = getUserAccount(user.id);

  if (!account.profession || !professions[account.profession]) {
    await reply({
      content: '❌ Você ainda não possui uma profissão registrada! Use `/profissao` para escolher sua vocação antes de trabalhar.',
      ephemeral: true,
    });
    return;
  }

  const status = getWorkStatus(user.id);
  if (!status.available) {
    await reply({
      content: `⏳ Você já trabalhou recentemente! Aguarde **${formatRemaining(status.remainingMs)}** para iniciar um novo expediente.`,
      ephemeral: true,
    });
    return;
  }

  const professionKey = account.profession;
  const profDef = professions[professionKey];
  const minigames = PROFESSION_MINIGAMES[professionKey] || PROFESSION_MINIGAMES.programador;
  const chosenGame = minigames[Math.floor(Math.random() * minigames.length)];

  const allChoices = [
    { text: chosenGame.correct, correct: true },
    ...chosenGame.wrongs.map((w) => ({ text: w, correct: false })),
  ];

  const shuffledChoices = shuffleArray(allChoices);
  const correctIndex = shuffledChoices.findIndex((c) => c.correct);

  const salary = Math.floor(Math.random() * (WORK_MAXIMUM - WORK_MINIMUM + 1)) + WORK_MINIMUM;

  // Inicia o cooldown e registra o trabalho
  startWork(user.id, { profession: professionKey, salary });

  activeWorkSessions.set(user.id, {
    correctIndex,
    correctText: chosenGame.correct,
    salary,
    professionKey,
    professionLabel: profDef.label,
    startedAt: Date.now(),
  });

  // Timeout automático da sessão
  setTimeout(() => {
    if (activeWorkSessions.has(user.id)) {
      activeWorkSessions.delete(user.id);
    }
  }, WORK_TIMEOUT_MS);

  const questionDesc = [
    chosenGame.scenario,
    '',
    '⏱️ **TEMPO DE RESPOSTA: 45 SEGUNDOS**',
    'Escolha a melhor alternativa nos botões abaixo:',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(PYXIE_COLORS.violet || '#a855f7')
    .setTitle(`💼  ✦  Expediente de ${profDef.label} — Minigame`)
    .setDescription(questionDesc)
    .setFooter({ text: 'Pyxie' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder();
  shuffledChoices.forEach((choice, idx) => {
    const labelLetters = ['A', 'B', 'C', 'D'];
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`work_ans:${idx}:${user.id}`)
        .setLabel(`[${labelLetters[idx]}] ${choice.text}`.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
    );
  });

  await reply({ embeds: [embed], components: [buttonRow] });
}

module.exports = {
  name: WORK,
  isWorkInteraction,
  handleWorkInteraction,
  data: new SlashCommandBuilder()
    .setName(WORK)
    .setDescription('Inicia um minigame interativo da sua profissão para receber Moedinhas e Feijões Mágicos.'),
  async executePrefix({ message }) {
    await runWork(message, (payload) => message.reply(payload));
  },
  async executeSlash({ interaction }) {
    await runWork(interaction, (payload) => interaction.editReply(payload));
  },
};