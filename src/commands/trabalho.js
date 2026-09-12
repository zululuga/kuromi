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
      scenario: '💻 **Bug Crítico em Produção!**\nO log disparou: `TypeError: Cannot read properties of undefined (reading "map")`. Qual a correção adequada?',
      correct: 'Aplicar Optional Chaining (?.map) ou validação de array',
      scenario: '💻 **Salvando o Projeto!**\nVocê acabou de programar uma nova funcionalidade no computador. O que você deve fazer antes de desligar?',
      correct: 'Salvar o arquivo e fazer backup do código',
      wrongs: [
        'Reiniciar o servidor em looping',
        'Deletar a tabela no banco de dados',
        'Ignorar os logs com um try/catch vazio',
        'Desligar o computador direto na tomada',
        'Apagar todo o código para liberar memória',
        'Jogar água no teclado',
      ],
    },
    {
      scenario: '⚡ **Otimização de Performance!**\nUma consulta de dados em masmorras está levando 5 segundos. O que fazer para acelerar?',
      correct: 'Criar índices adequados nas colunas mais filtradas',
      scenario: '🐛 **Erro de Digitação no Código!**\nO programa avisou que faltou fechar uma letra no comando. Como você resolve?',
      correct: 'Abrir o código e corrigir a digitação',
      wrongs: [
        'Adicionar um setTimeout de 10 segundos',
        'Substituir tudo por loops síncronos aninhados',
        'Diminuir a memória RAM do servidor',
        'Chutar o monitor com força',
        'Trocar de mouse',
        'Formatar o computador inteiro',
      ],
    },
    {
      scenario: '🛡️ **Falha de Integração no Deploy!**\nA pipeline acusou módulo ausente após nova feature. Qual o procedimento padrão?',
      correct: 'Atualizar dependências no package.json e rodar clean install',
      scenario: '🌐 **Botão no Site!**\nUm cliente pediu para colocar um botão clicável na página dele. O que você faz?',
      correct: 'Adicionar a linha do botão no código do site',
      wrongs: [
        'Apagar o repositório Git',
        'Desativar o firewall do servidor',
        'Remover todos os testes unitários',
        'Desenhar um botão com canetinha na tela',
        'Furar o monitor com uma furadeira',
        'Colar um pedaço de fita adesiva na tela',
      ],
    },
  ],

  cozinheiro: [
    {
      scenario: '🍳 **Risoto Alquímico de Cogumelos!**\nO prato está quase pronto. Qual o segredo para finalizar com cremosidade perfeita (*Mantecatura*)?',
      correct: 'Adicionar manteiga gelada e queijo ralado fora do fogo',
      scenario: '🍳 **Fritando um Ovo!**\nA frigideira está no fogo e você vai fritar um ovo. O que você coloca para não grudar?',
      correct: 'Um pouco de óleo ou manteiga',
      wrongs: [
        'Despejar 500ml de vinagre puro',
        'Ferver em fogo alto por mais 40 minutos',
        'Adicionar açúcar cristal e mexer com garfo',
        'Sabão em pó',
        'Suco de uva fervente',
        'Areia da praia',
      ],
    },
    {
      scenario: '🍲 **Molho de Tomate Rústico!**\nO molho artesanal ficou com acidez acentuada. Qual o truque clássico da culinária?',
      correct: 'Uma pitada de bicarbonato ou um toque sutil de doçura',
      scenario: '🍲 **Sopa Fervendo!**\nA panela de sopa acabou de sair do fogão muito quente. O que fazer antes de provar?',
      correct: 'Esperar esfriar um pouco ou assoprar com cuidado',
      wrongs: [
        'Espremer dois limões inteiros',
        'Adicionar meio copo de água fria',
        'Colocar sal grosso em excesso',
        'Engolir tudo de uma vez sem mastigar',
        'Jogar pedras de carvão dentro da sopa',
        'Comer com a mão direto na panela pelando',
      ],
    },
    {
      scenario: '🥘 **Ponto da Carne no Banquete!**\nO cliente exigente pediu carne suculenta ao ponto. O que fazer após retirá-la da grelha?',
      correct: 'Deixar a carne descansar 2 minutos para redistribuir os sucos',
      scenario: '🍰 **Bolo Fofinho no Forno!**\nQual ingrediente clássico ajuda a massa do bolo a crescer e ficar macia?',
      correct: 'Fermento em pó',
      wrongs: [
        'Cortar imediatamente em fatias finas na frigideira',
        'Lavar a carne na água da pia',
        'Colocar no congelador por 10 minutos',
        'Vinagre puro',
        'Sal grosso em excesso',
        'Pimenta malagueta',
      ],
    },
  ],

  agricultor: [
    {
      scenario: '🌾 **Alerta de Pragas na Lavoura!**\nUma colônia de pulgões apareceu nos brotos de feijão. Qual o tratamento orgânico recomendado?',
      correct: 'Aplicar calda de óleo de nim com água em horário fresco',
      scenario: '🌱 **Plantação com Sede!**\nO sol forte da tarde deixou a terra da horta bem seca. O que as plantas precisam?',
      correct: 'Água fresca através da rega',
      wrongs: [
        'Lançar água fervente sobre toda a plantação',
        'Espalhar salmoura concentrada na terra',
        'Queimar as folhas infectadas com maçarico',
        'Refrigerante de cola gelado',
        'Óleo de motor usado',
        'Tinta guache colorida',
      ],
    },
    {
      scenario: '🌱 **Preparo do Solo para Plantio!**\nA terra está compactada e com baixa retenção de nutrientes. Qual a melhor intervenção?',
      correct: 'Aeracionar o solo e incorporar matéria orgânica curtida',
      scenario: '🍅 **Hora da Colheita!**\nOs tomates na horta estão bem vermelhos, maduros e cheirosos. O que você faz?',
      correct: 'Colher com cuidado e guardar na cesta',
      wrongs: [
        'Adicionar pedra brita e cascalho grosso',
        'Cobrir tudo com lona plástica fechada',
        'Compactar com rolo compressor',
        'Deixar apodrecer no chão',
        'Enterrar os tomates no fundo da terra',
        'Jogar pedras na plantação',
      ],
    },
    {
      scenario: '🚜 **Irrigação em Dias de Calor Extremo!**\nO sol está escaldante ao meio-dia. Qual o horário ideal para a rega?',
      correct: 'No início da manhã ou no final da tarde',
      scenario: '🥕 **Novo Canteiro!**\nO que é essencial colocar na terra adubada para nascer uma nova plantinha?',
      correct: 'Sementes ou mudas saudáveis',
      wrongs: [
        'Exatamente ao meio-dia sob o sol a pino',
        'Nunca regar durante o verão',
        'Apenas uma vez a cada duas semanas',
        'Parafusos enferrujados',
        'Pilhas velhas',
        'Pedaços de plástico',
      ],
    },
  ],

  medico: [
    {
      scenario: '🩺 **Primeiros Socorros na Enfermaria!**\nUm aventureiro chega com sangramento ativo no braço após emboscada. Qual a conduta inicial?',
      correct: 'Fazer compressão direta com gaze limpa e elevar o membro',
      scenario: '🩺 **Paciente com Febre!**\nUma pessoa chega dizendo que está com o corpo muito quente. O que você usa para medir a temperatura?',
      correct: 'Termômetro',
      wrongs: [
        'Fazer o paciente correr para aquecer o sangue',
        'Oferecer refeição pesada imediatamente',
        'Aplicar gelo seco não protegido direto na ferida',
        'Régua escolar de plástico',
        'Balança de cozinha',
        'Cronômetro de corrida',
      ],
    },
    {
      scenario: '💧 **Desidratação e Exaustão!**\nO paciente apresenta tontura, boca seca e fraqueza após cruzar a dungeon. O que prescrever?',
      correct: 'Reposição hidroeletrolítica com soro oral e repouso',
      scenario: '🩹 **Arranhão no Joelho!**\nUm aventureiro ralou o joelho no chão. Qual o primeiro passo do curativo?',
      correct: 'Lavar o machucado com água limpa e sabão neutro',
      wrongs: [
        'Bebida ultra açucarada e exercício físico intenso',
        'Jejum absoluto de líquidos por 24 horas',
        'Banho de sauna quente prolongado',
        'Passar terra por cima para tampar',
        'Esfregar com uma esponja de aço',
        'Cobrir com papelão sujo',
      ],
    },
    {
      scenario: '🩹 **Suspeita de Entorse no Tornozelo!**\nO paciente pisou em falso numa armadilha. Qual o protocolo padrão RICE/GELO?',
      correct: 'Repouso, gelo protegido, compressão e elevação do membro',
      scenario: '💧 **Muita Sede no Calor!**\nO paciente caminhou bastante no sol e está com sede e cansaço. O que ele deve beber?',
      correct: 'Bastante água fresca',
      wrongs: [
        'Puxar o pé com força para estalar',
        'Massagear vigorosamente o local inchado',
        'Continuar andando normalmente sem imobilizar',
        'Óleo de cozinha',
        'Vinagre puro',
        'Água do mar com sal',
      ],
    },
  ],

  musico: [
    {
      scenario: '🎵 **Harmonia & Resolução Musical!**\nA música está em tonalidade de Dó Maior (C). Qual acorde cria a tensão perfeita para voltar à tônica?',
      correct: 'Acorde de Sol Maior (G7 - Dominante)',
      scenario: '🎸 **Preparando o Violão!**\nO que você deve fazer antes de começar a tocar para o som sair bonito e afinado?',
      correct: 'Afinar as cordas no tom correto',
      wrongs: [
        'Acorde de Ré Sustenido Diminuto',
        'Acorde de Fá Menor com Nona',
        'Desafinar a corda mais grave',
        'Cortar todas as cordas com alicate',
        'Passar cola branca nas cordas',
        'Mergulhar o violão num balde de água',
      ],
    },
    {
      scenario: '🎸 **Afinação de Cordas!**\nVocê vai tocar uma balada acústica na afinação padrão (EADGBE). Qual a 3ª corda?',
      correct: 'Corda Sol (G)',
      scenario: '🥁 **Ritmo da Música!**\nVocê está tocando bateria com a banda. Qual é o seu papel principal?',
      correct: 'Manter o ritmo e o tempo da música',
      wrongs: [
        'Corda Fá (F)',
        'Corda Dó (C)',
        'Corda Si (B)',
        'Tocar o mais desgovernado e fora do tempo possível',
        'Parar de tocar de repente no meio da música',
        'Jogar as baquetas no público com raiva',
      ],
    },
    {
      scenario: '🥁 **Controle de Andamento!**\nO arranjo pede uma execução lenta e solene (Andante / Adagio). Qual a faixa de BPM indicada?',
      correct: 'Entre 60 e 80 BPM',
      scenario: '🎤 **Cuidando da Voz!**\nO cantor vai se apresentar hoje à noite. O que ele deve fazer para cuidar da voz?',
      correct: 'Beber água e aquecer a voz antes de cantar',
      wrongs: [
        '220 BPM em ritmo de Speed Metal',
        '0 BPM sem tocar notas',
        '500 BPM acelerado',
        'Gritar até ficar rouco antes do show',
        'Chupar pedras de gelo sem parar',
        'Comer areia',
      ],
    },
  ],

  professor: [
    {
      scenario: '📚 **Gramática & Ortografia!**\nQual das alternativas apresenta todas as palavras grafadas corretamente segundo a norma culta?',
      correct: 'Exceção, Privilégio, Beneficente',
      scenario: '📚 **Início da Aula!**\nOs alunos acabaram de entrar na sala. O que o professor faz para saber quem veio?',
      correct: 'Fazer a chamada dos alunos presentes',
      wrongs: [
        'Excessão, Previlégio, Beneficiente',
        'Exceção, Previlégio, Beneficente',
        'Excessão, Privilégio, Beneficiente',
        'Apagar a luz e ir embora dormir',
        'Mandar todo mundo correr sem rumo',
        'Esconder os cadernos de todos',
      ],
    },
    {
      scenario: '📐 **Desafio Matemático da Turma!**\nSe uma jornada de 120 km é feita a uma velocidade média de 60 km/h, quanto tempo dura o trajeto?',
      correct: '2 horas',
      scenario: '✏️ **Explicando a Lição!**\nO professor quer escrever uma explicação para a turma toda acompanhar. Onde ele escreve?',
      correct: 'Na lousa / quadro da sala de aula',
      wrongs: [
        '3 horas e meia',
        '1 hora e 15 minutos',
        '45 minutos',
        'No chão da entrada',
        'Nas roupas dos alunos',
        'Na parede do banheiro',
      ],
    },
    {
      scenario: '🔬 **Conhecimentos Científicos!**\nQual organela celular vegetal é responsável por realizar a fotossíntese?',
      correct: 'Cloroplasto',
      scenario: '📖 **Dúvida na Lição!**\nUm aluno levantou a mão porque não entendeu um exercício. Como agir?',
      correct: 'Explicar com calma de um jeito fácil de entender',
      wrongs: [
        'Lisossomo',
        'Centríolo',
        'Complexo Golgiense',
        'Rir do aluno e passar o dobro de lição',
        'Fingir que não ouviu e sair da sala',
        'Tirar todos os pontos da turma',
      ],
    },
  ],

  fotografo: [
    {
      scenario: '📸 **Fotografia de Ação em Movimento!**\nVocê quer congelar o salto de um Pymon sem borrões. Como ajustar o obturador?',
      correct: 'Velocidade alta (1/1000s ou mais rápida)',
      scenario: '📸 **Ambiente Escuro!**\nVocê vai tirar uma foto num quarto escuro e quase não dá para enxergar nada. O que você usa?',
      correct: 'O flash da câmera ou acender as luzes',
      wrongs: [
        'Longa exposição de 10 segundos',
        'Desligar o foco automático e tampar a lente',
        'Diminuir a velocidade para 1/2s',
        'Tampar a lente com a mão',
        'Apagar a única lâmpada acesa',
        'Fechar os olhos bem forte',
      ],
    },
    {
      scenario: '✨ **Retrato com Fundo Desfocado (*Bokeh*)!**\nPara isolar o sujeito com desfoque estético suave no fundo, qual abertura de diafragma utilizar?',
      correct: 'Abertura ampla com número f baixo (f/1.4 ou f/1.8)',
      scenario: '🖼️ **Foto Embaçada!**\nA foto ficou toda borrada e fora de foco. O que você ajusta na câmera?',
      correct: 'O foco na pessoa ou objeto que quer fotografar',
      wrongs: [
        'Abertura mínima com número f alto (f/22 ou f/32)',
        'Usar flash direto no olho do modelo',
        'Colocar a câmera no modo paisagem fechado',
        'Chacoalhar a câmera com força ao apertar o botão',
        'Passar lixa na lente da câmera',
        'Tirar a foto correndo de costas',
      ],
    },
    {
      scenario: '🌅 **Fotografia na Hora de Ouro (*Golden Hour*)!**\nO sol está se pondo com luz quente e suave. Qual equilíbrio de branco (WB) realça o tom?',
      correct: 'Luz do Dia / Sombra (Daylight / Cloudy) para tons dourados',
      scenario: '🔋 **Bateria da Câmera!**\nVocê tem um ensaio fotográfico amanhã cedo. O que precisa fazer hoje à noite?',
      correct: 'Colocar a bateria da câmera para carregar',
      wrongs: [
        'Fluorescente fria esverdeada',
        'Tungstênio azulado congelante',
        'Preto e branco sem contraste',
        'Deixar a câmera ligada no chão a noite toda',
        'Molhar a bateria na pia',
        'Jogar a câmera no lixo',
      ],
    },
  ],

  mecanico: [
    {
      scenario: '🔧 **Diagnóstico de Ruído no Freio!**\nO veículo emite um som agudo de atrito metálico toda vez que o pedal de freio é acionado. Qual o diagnóstico?',
      correct: 'Pastilhas de freio gastas atingindo o indicador de desgaste',
      scenario: '🚗 **Pneu Furado!**\nO carro pegou um prego e o pneu murchou. Qual ferramenta você usa para erguer o carro e trocar a roda?',
      correct: 'O macaco mecânico / hidráulico',
      wrongs: [
        'Pneu dianteiro com excesso de ar',
        'Vela de ignição encharcada',
        'Retrovisor lateral desalinhado',
        'Um pedaço de graveto fino',
        'Um secador de cabelo',
        'Um martelo de plástico de brinquedo',
      ],
    },
    {
      scenario: '🌡️ **Superaquecimento do Motor!**\nO ponteiro de temperatura subiu para a faixa vermelha em subida de serra. O que verificar?',
      correct: 'Vazamento no radiador / funcionamento da ventoinha',
      scenario: '🛢️ **Nível de Óleo!**\nVocê vai conferir se o motor tem óleo suficiente. Qual item você usa para checar?',
      correct: 'A vareta medidora de óleo do motor',
      wrongs: [
        'Calibragem do estepe no porta-malas',
        'Trocar as palhetas do limpador de para-brisa',
        'Ligar o rádio no volume máximo',
        'Um palito de dente',
        'Uma colher de sopa',
        'Um canudo de refrigerante',
      ],
    },
    {
      scenario: '🔋 **Falha na Partida Matinal!**\nAo girar a chave, o motor de arranque gira pesado e as luzes do painel piscam fracas. Qual a causa?',
      correct: 'Bateria com carga baixa ou com fim de vida útil',
      scenario: '🛑 **Farol Queimado!**\nO motorista avisa que um dos faróis dianteiros não está acendendo à noite. O que deve ser trocado?',
      correct: 'A lâmpada do farol',
      wrongs: [
        'Tanque com excesso de combustível',
        'Escapamento esportivo entupido',
        'Bancos desregulados',
        'O volante do carro',
        'O tapete do porta-malas',
        'A antena do rádio',
      ],
    },
  ],

  vendedor: [
    {
      scenario: '💼 **Objeção de Preço do Cliente!**\nO cliente diz: "Gostei muito do item, mas achei o valor um pouco alto". Qual a resposta consultiva ideal?',
      correct: 'Demonstrar o valor agregado, durabilidade e benefícios exclusivos',
      scenario: '🤝 **Cliente Chegando na Loja!**\nUma pessoa acabou de entrar na sua loja. Qual a atitude mais educada?',
      correct: 'Cumprimentar com simpatia e perguntar como pode ajudar',
      wrongs: [
        'Dizer que se ele não tem dinheiro não deveria estar na loja',
        'Ficar em silêncio e virar as costas',
        'Aumentar o preço para ver se ele compra mais rápido',
        'Ignorar a pessoa e ficar mexendo no celular',
        'Dizer para ela não encostar em nada',
        'Mandar a pessoa ir embora da loja',
      ],
    },
    {
      scenario: '🤝 **Abordagem a um Cliente Indeciso!**\nO cliente está olhando vários produtos sem saber qual escolher. Como agir?',
      correct: 'Fazer perguntas abertas para entender a necessidade real dele',
      scenario: '💰 **Dando o Troco!**\nO item custa 15 moedas e o cliente pagou com uma nota de 20 moedas. Qual o troco?',
      correct: '5 moedas',
      wrongs: [
        'Empurrar o produto mais caro sem dar explicações',
        'Dizer que todos os produtos são ruins',
        'Pressionar para ele passar o cartão imediatamente',
        '100 moedas',
        'Ficar com o dinheiro e não dar nada de troco',
        '50 moedas',
      ],
    },
    {
      scenario: '📦 **Fidelização e Pós-Venda!**\nApós fechar a venda de um equipamento valioso, qual a melhor atitude para reter o cliente?',
      correct: 'Oferecer suporte, canais de atendimento e garantia clara',
      scenario: '🏷️ **Promoção Especial!**\nA loja vai fazer uma queima de estoque. O que colocar nos produtos para destacar o preço baixo?',
      correct: 'Etiquetas chamativas com o desconto da promoção',
      wrongs: [
        'Bloquear o número do cliente após o pagamento',
        'Cobrar taxa extra de pós-venda surpresa',
        'Não emitir comprovante',
        'Esconder os produtos no armário trancado',
        'Colocar uma placa dizendo "loja fechada"',
        'Apagar as luzes da loja',
      ],
    },
  ],

  artista: [
    {
      scenario: '🎨 **Mistura e Teoria das Cores!**\nVocê precisa compor um tom de Violeta Profundo para o manto de um mago. Quais cores misturar?',
      correct: 'Azul e Vermelho',
      scenario: '🎨 **Mistura de Cores!**\nVocê está pintando uma árvore e acabou a tinta verde. Quais cores misturar para criar verde?',
      correct: 'Azul e Amarelo',
      wrongs: [
        'Amarelo e Verde',
        'Laranja e Marrom',
        'Preto e Amarelo',
        'Vermelho e Preto',
        'Branco e Roxo',
        'Rosa e Marrom',
      ],
    },
    {
      scenario: '🖌️ **Profundidade em Paisagem!**\nComo criar a sensação de que as montanhas ao fundo estão muito distantes?',
      correct: 'Usar tons mais claros, azulados e com menos contraste (Perspectiva Atmosférica)',
      scenario: '🖌️ **Cuidando dos Pincéis!**\nDepois de pintar um quadro colorido, o que fazer com os pincéis para as cerdas não estragarem?',
      correct: 'Lavar bem com água e secar com cuidado',
      wrongs: [
        'Pintar as montanhas com preto sólido e traços grossos',
        'Colocar detalhes minuciosos nas folhas mais distantes',
        'Apagar o céu completamente',
        'Deixar secar sujo com tinta dura',
        'Cortar os pelos do pincel com tesoura',
        'Queimar as cerdas no fogo',
      ],
    },
    {
      scenario: '💡 **Ponto Focal e Contraste!**\nPara fazer o olhar do observador ir direto ao personagem principal da tela, qual elemento usar?',
      correct: 'Alto contraste de luz e sombra direcionado ao personagem (Chiaroscuro)',
      scenario: '🖼️ **Onde Pintar a Tela!**\nO pintor vai começar um quadro novo com tinta a óleo. Onde ele apoia a tela de pintura?',
      correct: 'Em um cavalete de pintura',
      wrongs: [
        'Deixar a tela inteira em tons médios idênticos',
        'Borrar a tela toda igualmente',
        'Pintar tudo de cinza neutro',
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