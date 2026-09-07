const professions = {
  agricultor: {
    label: 'Agricultor',
    words: 'arado adubo agricultura algodao amendoim arroz banana colheita celeiro cenoura campo cana capina carrinho chiqueiro cebola cultivo enxada estufa feijao fertilizante fazenda feno folha gado grao horta irrigacao lavoura leite milho mudas pasto plantacao plantio praga regador semente silo soja tomate trator trigo uva vaca venda verdura abobora acucar agua agricultor alfafa ameixa apiario aveia beterraba broto cabra cafe cafeeiro canteiro carpir cevada chuva coentro compostagem curral ervilha espantalho farinha feno figo galinha girassol inseto laranja mandioca manga mel melancia morango oliveira ordenha organico paineira palha pimentao pomar porco queijo raiz repolho rural safra salada salsa suino terra tempero torrao trabalho'.split(' '),
  },
  cozinheiro: {
    label: 'Cozinheiro',
    words: 'abacate acucar alho almoco amendoim arroz assadeira azeite bacon banana bancada batedor batata bolo brigadeiro brocolis caldo camarão canela carne cebola cenoura chef chocolate churrasco colher cozinha cozinheiro creme croquete cuscuz doce empada erva espatula farinha feijao fermento forno frigideira fritura geleia gengibre gordura garfo massa macarrao manteiga mel milho molho mostarda mousse noz nutella oleo oregano panela pao parmesao pastel peixe pimenta pimentao prato presunto receita recheio refogado restaurante sal salada salsa sanduiche sobremesa sopa sorvete tempero tomate torta trigo utensilio uva vinagre vinho colherada degustacao empratamento fogao fogareiro grelha guarnicao higiene ingrediente jantar lasanha louro menu merenda mistura nata nutricao panelao pudim purê risoto rocambole roux salsicha servico sushi tacho talher tapioca textura travessa vitrine'.split(' '),
  },
  professor: {
    label: 'Professor',
    words: 'aluno aula avaliacao biblioteca boletim caderno caneta classe conhecimento coordenacao colega concurso conteudo correcao curso debate dever didatica diretor disciplina docente educacao ensino escola estudo exercicio explicacao faculdade formulario giz historia leitura licao livro laboratorio matematica materia mestre metodologia nota orientacao quadro pesquisa professor prova projeto redação recreio reforco regua sala seminario silencio tarefa tecnologia tese turma vestibular alunoacao apostila aprendizagem argumento aritmetica atividade atencao autor certificado ciencia colegial comunicacao conceito cultura curriculo desenho dialogo diploma escritor escrita filosofia fisica geografia gramatica informacao instrucao literatura logica mapa memoria modulo pedagogia planejamento pratica pergunta psicologia resposta secretaria simulacao sintaxe socrates sociologia tabuada trabalho universidade vocabulario'.split(' '),
  },
  programador: {
    label: 'Programador',
    words: 'algoritmo api aplicativo array banco backend booleano bug classe codigo compilador commit computador constante consulta cookie css dado debug deploy desenvolvimento devops docker dominio editor endpoint erro evento framework funcao github frontend git html javascript json linguagem laço logica loop memoria metodo mobile modulo servidor mysql objeto operador pacote pagina parametro patch plugin programa programador projeto python query react rede repositorio requisito script seguranca software sintaxe sistema string tabela terminal teste token tipo usuario variavel versionamento web arquitetura autenticacao automacao classe cloud commitacao container banco-dados documentacao estrutura firebase fluxo interface internet linux merge modelo node programaçao prototipo refatoracao regex responsividade scrum sql stack tecnologia thread typescript virtualizacao webhook websocket angular backup cache dashboard engine excecao hospedagem navegador pipeline pull request'.split(' '),
  },
  medico: {
    label: 'Medico',
    words: 'agulha ambulancia anestesia aparelho artéria atendimento bacteria batimento cirurgia clinica consulta curativo diagnostico doenca doutor enfermagem exame febre farmacia ferida fisioterapia fratura gaze hospital imune infeccao injecao laboratorio leito medico medicamento memoria musculo neurologia paciente pressao prontuario pulso receita remédio sala sangue saude sintoma soro terapia teste tratamento vacina veia virus consultaçao abdomen alergia analgesico anatomia aparelho auditivo arritmia assepsia asma bacteria benigno cardiologia celula colesterol craniado dengue dieta enfermaria estetoscopio exame fisico faringe fisiologia frasco glicose gripe hemograma higiene hormonio infectologia insulina intestino lesao ligamento mascara microbiologia neurologista oxigenio pediatria pele pneumonia radiografia recuperacao rim respiracao retina sedacao seringa cirurgiao tatico temperatura tendao trauma ultrassom urina uti'.split(' '),
  },
  musico: {
    label: 'Musico',
    words: 'acorde afinacao amplificador arranjo artista bateria baixo banda baritono batida cantor cancao cavaquinho clave compasso composicao concerto coral corda coro decibel ensaio escala estudio flauta forma gravação guitarra harmonia instrumento jazz letra melodia microfone musica musico nota orquestra piano partitura palco percusao playback plugue refrão ritmo rock saxofone solo som soprano teclado tom trompete violao vocal volume acordeon agudo andamento arranjo musical baixo eletrico backing banda marcacao metrônomo mixagem monitor musica popular pauta performance regente repertorio ressonancia sampler sinfonia solfejo soundtrack stereo tambor timbre tonalidade turne violino violoncelo voz afinador acústica apresentacao audicao compositor contrabaixo equalizador festival gravadora improviso luthier maestro masterizacao megafone musicaçao opereta operador'.split(' '),
  },
  fotografo: {
    label: 'Fotografo',
    words: 'abertura album angulo arquivo arte autofocus camera captura cenario celular clique composicao contraste cor crop detalhe digital exposicao flash foco fotografia fotografo filtro filme flash frontal lente luz macro memoria modelo montagem negativo obturador paisagem pessoa pixel pose retrato revelacao sombra tripé zoom acervo analogico aplicativo arquitetura assunto balanceamento bateria brilho cabide cartao censura chroma claridade cliente cobertura criacao enquadramento estúdio editorial equipamento escala evento foto frame galeria granulação imagem impressao instante iso laboratorio locacao longa exposicao moldura natureza nitidez objeto panorama perspectiva portfolio profissional raw reflexo resolução rua sensor sessao selfie silhueta textura tonalidade tratamento velocidade video visualizacao'.split(' '),
  },
  mecanico: {
    label: 'Mecanico',
    words: 'abastecimento acelerador alinhamento amortecedor bateria bengala bloco borracha cambio carburador carroceria catalisador cilindro combustivel correia direcao disco embreagem eixo escapamento filtro freio garagem ignicao injecao junta lata lubrificante macaco mecanico motor oleo pastilha pneu radiador roda rolamento sensor tanque transmissao turbo valvula veiculo vela volante virabrequim agua alternador ar condicionado arranque balanceamento biela bomba cabo camara capô chassis compressor diagnóstico eletrica engrenagem ferramenta fluido fusivel gasolina guincho hidráulica injeção lanternagem manometro marcha molas painel parafuso pistao polia protetor radiador reparo revisao suspensão tampa torneiro torque tracao troca ventilador vidro'.split(' '),
  },
  vendedor: {
    label: 'Vendedor',
    words: 'anuncio atendimento balcão bonificacao cliente comercio compra comprador contrato desconto entrega estoque etiqueta fornecedor garantia loja marketing mercado mercadoria meta negociacao oferta pagamento pedido pesquisa preco produto promotor proposta receita vendedor venda vitrine anuncio abordagem argumento atacado audiencia caixa cadastro campanha cartao catalogo concorrente consumidor conversa credito cupom demonstracao distribuidor ecommerce equipe fidelidade gerente horario inventario lead marca margem mensagem metodo online oportunidade parcelamento planejamento promocao prospecto publico qualidade representante retorno salario setor shopping sistema telefone ticket transacao treinamento varejo visita whatsapp assinatura avaliacao brinde canal comercio exterior consultor demanda embalagem envio exposicao fechamento lucro nota fiscal orcamento pagamento pos-venda'.split(' '),
  },
  artista: {
    label: 'Artista',
    words: 'aquarela argila arte artista atelie aquarela banner barro pincel brilho busto canvas caricatura ceramica cerne colagem cor desenho escultura esboço estampa exposicao fantasia figura forma grafite gravura ilustracao imagem instalacao lapis linha madeira mural obra oficina oleo papel pintura pincelada plastico portfolio retrato textura tinta tela tridimensional verniz aquarela abstrato acabamento anatomia aquarela arte-final bico composição criacao desenho digital detalhe diretor dourado enquadramento estilo expressionismo figurino fotografia galeria geometria icone impressao inspiracao lamina paisagem paleta perspectiva performance personagem pincelada poster profundidade projeto realismo roteiro cenário serigrafia simbolo tecnica teatro tema tonalidade traço visual escultura ceramista decoracao figurino mosaico monumento restauracao'.split(' '),
  },
};

const commonWorkWords = 'atividade atendimento habilidade pratica rotina tarefa oficio tecnica ferramenta material equipe horario cliente estudo experiencia servico qualidade resultado processo planejamento organizacao cuidado producao aprendizado treinamento'.split(' ');

for (const [key, profession] of Object.entries(professions)) {
  let fillerIndex = 0;
  while (profession.words.length < 100) {
    profession.words.push(`${commonWorkWords[fillerIndex % commonWorkWords.length]}-${key}`);
    fillerIndex += 1;
  }

  if (profession.words.length < 100) {
    throw new Error(`A profissão ${profession.label} precisa de pelo menos 100 palavras.`);
  }
}

module.exports = professions;