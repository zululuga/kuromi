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

const WORK_MINIMUM = 20;
const WORK_MAXIMUM = 65;
const WORK_TIMEOUT_MS = 45 * 1000;

// Sessões ativas de minigames em RAM
const activeWorkSessions = new Map();

const PROFESSION_MINIGAMES = {
  programador: [
    {
      scenario: '💻 **Bug Crítico em Produção!**\nO log disparou: `TypeError: Cannot read properties of undefined (reading "map")`. Qual a correção adequada?',
      correct: 'Aplicar Optional Chaining (?.map) ou validação de array',
      wrongs: [
        'Reiniciar o servidor em looping',
        'Deletar a tabela no banco de dados',
        'Ignorar os logs com um try/catch vazio',
      ],
    },
    {
      scenario: '⚡ **Otimização de Performance!**\nUma consulta de dados em masmorras está levando 5 segundos. O que fazer para acelerar?',
      correct: 'Criar índices adequados nas colunas mais filtradas',
      wrongs: [
        'Adicionar um setTimeout de 10 segundos',
        'Substituir tudo por loops síncronos aninhados',
        'Diminuir a memória RAM do servidor',
      ],
    },
    {
      scenario: '🛡️ **Falha de Integração no Deploy!**\nA pipeline acusou módulo ausente após nova feature. Qual o procedimento padrão?',
      correct: 'Atualizar dependências no package.json e rodar clean install',
      wrongs: [
        'Apagar o repositório Git',
        'Desativar o firewall do servidor',
        'Remover todos os testes unitários',
      ],
    },
  ],

  cozinheiro: [
    {
      scenario: '🍳 **Risoto Alquímico de Cogumelos!**\nO prato está quase pronto. Qual o segredo para finalizar com cremosidade perfeita (*Mantecatura*)?',
      correct: 'Adicionar manteiga gelada e queijo ralado fora do fogo',
      wrongs: [
        'Despejar 500ml de vinagre puro',
        'Ferver em fogo alto por mais 40 minutos',
        'Adicionar açúcar cristal e mexer com garfo',
      ],
    },
    {
      scenario: '🍲 **Molho de Tomate Rústico!**\nO molho artesanal ficou com acidez acentuada. Qual o truque clássico da culinária?',
      correct: 'Uma pitada de bicarbonato ou um toque sutil de doçura',
      wrongs: [
        'Espremer dois limões inteiros',
        'Adicionar meio copo de água fria',
        'Colocar sal grosso em excesso',
      ],
    },
    {
      scenario: '🥘 **Ponto da Carne no Banquete!**\nO cliente exigente pediu carne suculenta ao ponto. O que fazer após retirá-la da grelha?',
      correct: 'Deixar a carne descansar 2 minutos para redistribuir os sucos',
      wrongs: [
        'Cortar imediatamente em fatias finas na frigideira',
        'Lavar a carne na água da pia',
        'Colocar no congelador por 10 minutos',
      ],
    },
  ],

  agricultor: [
    {
      scenario: '🌾 **Alerta de Pragas na Lavoura!**\nUma colônia de pulgões apareceu nos brotos de feijão. Qual o tratamento orgânico recomendado?',
      correct: 'Aplicar calda de óleo de nim com água em horário fresco',
      wrongs: [
        'Lançar água fervente sobre toda a plantação',
        'Espalhar salmoura concentrada na terra',
        'Queimar as folhas infectadas com maçarico',
      ],
    },
    {
      scenario: '🌱 **Preparo do Solo para Plantio!**\nA terra está compactada e com baixa retenção de nutrientes. Qual a melhor intervenção?',
      correct: 'Aeracionar o solo e incorporar matéria orgânica curtida',
      wrongs: [
        'Adicionar pedra brita e cascalho grosso',
        'Cobrir tudo com lona plástica fechada',
        'Compactar com rolo compressor',
      ],
    },
    {
      scenario: '🚜 **Irrigação em Dias de Calor Extremo!**\nO sol está escaldante ao meio-dia. Qual o horário ideal para a rega?',
      correct: 'No início da manhã ou no final da tarde',
      wrongs: [
        'Exatamente ao meio-dia sob o sol a pino',
        'Nunca regar durante o verão',
        'Apenas uma vez a cada duas semanas',
      ],
    },
  ],

  medico: [
    {
      scenario: '🩺 **Primeiros Socorros na Enfermaria!**\nUm aventureiro chega com sangramento ativo no braço após emboscada. Qual a conduta inicial?',
      correct: 'Fazer compressão direta com gaze limpa e elevar o membro',
      wrongs: [
        'Fazer o paciente correr para aquecer o sangue',
        'Oferecer refeição pesada imediatamente',
        'Aplicar gelo seco não protegido direto na ferida',
      ],
    },
    {
      scenario: '💧 **Desidratação e Exaustão!**\nO paciente apresenta tontura, boca seca e fraqueza após cruzar a dungeon. O que prescrever?',
      correct: 'Reposição hidroeletrolítica com soro oral e repouso',
      wrongs: [
        'Bebida ultra açucarada e exercício físico intenso',
        'Jejum absoluto de líquidos por 24 horas',
        'Banho de sauna quente prolongado',
      ],
    },
    {
      scenario: '🩹 **Suspeita de Entorse no Tornozelo!**\nO paciente pisou em falso numa armadilha. Qual o protocolo padrão RICE/GELO?',
      correct: 'Repouso, gelo protegido, compressão e elevação do membro',
      wrongs: [
        'Puxar o pé com força para estalar',
        'Massagear vigorosamente o local inchado',
        'Continuar andando normalmente sem imobilizar',
      ],
    },
  ],

  musico: [
    {
      scenario: '🎵 **Harmonia & Resolução Musical!**\nA música está em tonalidade de Dó Maior (C). Qual acorde cria a tensão perfeita para voltar à tônica?',
      correct: 'Acorde de Sol Maior (G7 - Dominante)',
      wrongs: [
        'Acorde de Ré Sustenido Diminuto',
        'Acorde de Fá Menor com Nona',
        'Desafinar a corda mais grave',
      ],
    },
    {
      scenario: '🎸 **Afinação de Cordas!**\nVocê vai tocar uma balada acústica na afinação padrão (EADGBE). Qual a 3ª corda?',
      correct: 'Corda Sol (G)',
      wrongs: [
        'Corda Fá (F)',
        'Corda Dó (C)',
        'Corda Si (B)',
      ],
    },
    {
      scenario: '🥁 **Controle de Andamento!**\nO arranjo pede uma execução lenta e solene (Andante / Adagio). Qual a faixa de BPM indicada?',
      correct: 'Entre 60 e 80 BPM',
      wrongs: [
        '220 BPM em ritmo de Speed Metal',
        '0 BPM sem tocar notas',
        '500 BPM acelerado',
      ],
    },
  ],

  professor: [
    {
      scenario: '📚 **Gramática & Ortografia!**\nQual das alternativas apresenta todas as palavras grafadas corretamente segundo a norma culta?',
      correct: 'Exceção, Privilégio, Beneficente',
      wrongs: [
        'Excessão, Previlégio, Beneficiente',
        'Exceção, Previlégio, Beneficente',
        'Excessão, Privilégio, Beneficiente',
      ],
    },
    {
      scenario: '📐 **Desafio Matemático da Turma!**\nSe uma jornada de 120 km é feita a uma velocidade média de 60 km/h, quanto tempo dura o trajeto?',
      correct: '2 horas',
      wrongs: [
        '3 horas e meia',
        '1 hora e 15 minutos',
        '45 minutos',
      ],
    },
    {
      scenario: '🔬 **Conhecimentos Científicos!**\nQual organela celular vegetal é responsável por realizar a fotossíntese?',
      correct: 'Cloroplasto',
      wrongs: [
        'Lisossomo',
        'Centríolo',
        'Complexo Golgiense',
      ],
    },
  ],

  fotografo: [
    {
      scenario: '📸 **Fotografia de Ação em Movimento!**\nVocê quer congelar o salto de um Pymon sem borrões. Como ajustar o obturador?',
      correct: 'Velocidade alta (1/1000s ou mais rápida)',
      wrongs: [
        'Longa exposição de 10 segundos',
        'Desligar o foco automático e tampar a lente',
        'Diminuir a velocidade para 1/2s',
      ],
    },
    {
      scenario: '✨ **Retrato com Fundo Desfocado (*Bokeh*)!**\nPara isolar o sujeito com desfoque estético suave no fundo, qual abertura de diafragma utilizar?',
      correct: 'Abertura ampla com número f baixo (f/1.4 ou f/1.8)',
      wrongs: [
        'Abertura mínima com número f alto (f/22 ou f/32)',
        'Usar flash direto no olho do modelo',
        'Colocar a câmera no modo paisagem fechado',
      ],
    },
    {
      scenario: '🌅 **Fotografia na Hora de Ouro (*Golden Hour*)!**\nO sol está se pondo com luz quente e suave. Qual equilíbrio de branco (WB) realça o tom?',
      correct: 'Luz do Dia / Sombra (Daylight / Cloudy) para tons dourados',
      wrongs: [
        'Fluorescente fria esverdeada',
        'Tungstênio azulado congelante',
        'Preto e branco sem contraste',
      ],
    },
  ],

  mecanico: [
    {
      scenario: '🔧 **Diagnóstico de Ruído no Freio!**\nO veículo emite um som agudo de atrito metálico toda vez que o pedal de freio é acionado. Qual o diagnóstico?',
      correct: 'Pastilhas de freio gastas atingindo o indicador de desgaste',
      wrongs: [
        'Pneu dianteiro com excesso de ar',
        'Vela de ignição encharcada',
        'Retrovisor lateral desalinhado',
      ],
    },
    {
      scenario: '🌡️ **Superaquecimento do Motor!**\nO ponteiro de temperatura subiu para a faixa vermelha em subida de serra. O que verificar?',
      correct: 'Vazamento no radiador / funcionamento da ventoinha',
      wrongs: [
        'Calibragem do estepe no porta-malas',
        'Trocar as palhetas do limpador de para-brisa',
        'Ligar o rádio no volume máximo',
      ],
    },
    {
      scenario: '🔋 **Falha na Partida Matinal!**\nAo girar a chave, o motor de arranque gira pesado e as luzes do painel piscam fracas. Qual a causa?',
      correct: 'Bateria com carga baixa ou com fim de vida útil',
      wrongs: [
        'Tanque com excesso de combustível',
        'Escapamento esportivo entupido',
        'Bancos desregulados',
      ],
    },
  ],

  vendedor: [
    {
      scenario: '💼 **Objeção de Preço do Cliente!**\nO cliente diz: "Gostei muito do item, mas achei o valor um pouco alto". Qual a resposta consultiva ideal?',
      correct: 'Demonstrar o valor agregado, durabilidade e benefícios exclusivos',
      wrongs: [
        'Dizer que se ele não tem dinheiro não deveria estar na loja',
        'Ficar em silêncio e virar as costas',
        'Aumentar o preço para ver se ele compra mais rápido',
      ],
    },
    {
      scenario: '🤝 **Abordagem a um Cliente Indeciso!**\nO cliente está olhando vários produtos sem saber qual escolher. Como agir?',
      correct: 'Fazer perguntas abertas para entender a necessidade real dele',
      wrongs: [
        'Empurrar o produto mais caro sem dar explicações',
        'Dizer que todos os produtos são ruins',
        'Pressionar para ele passar o cartão imediatamente',
      ],
    },
    {
      scenario: '📦 **Fidelização e Pós-Venda!**\nApós fechar a venda de um equipamento valioso, qual a melhor atitude para reter o cliente?',
      correct: 'Oferecer suporte, canais de atendimento e garantia clara',
      wrongs: [
        'Bloquear o número do cliente após o pagamento',
        'Cobrar taxa extra de pós-venda surpresa',
        'Não emitir comprovante',
      ],
    },
  ],

  artista: [
    {
      scenario: '🎨 **Mistura e Teoria das Cores!**\nVocê precisa compor um tom de Violeta Profundo para o manto de um mago. Quais cores misturar?',
      correct: 'Azul e Vermelho',
      wrongs: [
        'Amarelo e Verde',
        'Laranja e Marrom',
        'Preto e Amarelo',
      ],
    },
    {
      scenario: '🖌️ **Profundidade em Paisagem!**\nComo criar a sensação de que as montanhas ao fundo estão muito distantes?',
      correct: 'Usar tons mais claros, azulados e com menos contraste (Perspectiva Atmosférica)',
      wrongs: [
        'Pintar as montanhas com preto sólido e traços grossos',
        'Colocar detalhes minuciosos nas folhas mais distantes',
        'Apagar o céu completamente',
      ],
    },
    {
      scenario: '💡 **Ponto Focal e Contraste!**\nPara fazer o olhar do observador ir direto ao personagem principal da tela, qual elemento usar?',
      correct: 'Alto contraste de luz e sombra direcionado ao personagem (Chiaroscuro)',
      wrongs: [
        'Deixar a tela inteira em tons médios idênticos',
        'Borrar a tela toda igualmente',
        'Pintar tudo de cinza neutro',
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
      .setColor(KUROMI_COLORS.crimson || '#ef4444')
      .setTitle(`❌  ✦  Expediente de ${session.professionLabel} Falhou`)
      .setDescription(desc)
      .setFooter({ text: 'Trabalho • Revise seus conhecimentos e volte mais forte!' })
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
    .setColor(KUROMI_COLORS.emerald || '#10b981')
    .setTitle(`✅  ✦  Expediente de ${session.professionLabel} Concluído!`)
    .setDescription(desc.join('\n'))
    .setFooter({ text: 'Trabalho • Volte em 3 horas para um novo expediente' })
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
    .setColor(KUROMI_COLORS.violet || '#a855f7')
    .setTitle(`💼  ✦  Expediente de ${profDef.label} — Minigame`)
    .setDescription(questionDesc)
    .setFooter({ text: 'Minigame de Trabalho • Escolha a opção correta para receber seu salário' })
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