const PYXIE_COLORS = {
  lilac: '#5e2b8c',
  violet: '#8a2be2',
  emerald: '#10b981',
  neonPink: '#ff1493',
  magenta: '#e60067',
  gold: '#f59e0b',
  cyan: '#00f5d4',
  darkBg: '#0e0717',
  ink: '#120b1f',
  red: '#ef4444',
  green: '#22c55e',
};

const PYXIE_FOOTER = 'Pyxie';

function pyxieFooter() {
  return PYXIE_FOOTER;
}

const PYXIE_PHRASES = {
  welcome: [
    'Ora, ora... quem deixou esse mortal entrar no meu reino de travessuras?',
    'Apareceu mais um aventureiro iludido querendo criar bichinhos mágicos!',
    'Olha só quem resolveu dar as caras. Espero que traga doces ou moedas de ouro.',
    'Boas-vindas ao incrível e mágico reino dos Pymons!',
    'Mais um aventureiro pronto para desbravar masmorras e cuidar de criaturas mágicas!',
    'Que a sua jornada pelo universo de Pymons seja repleta de descobertas e conquistas!',
  ],
  feed: [
    'Nhac! Seu pet engoliu tudo numa bocada só. Quase achei que ia morder sua mão.',
    'Barriguinha cheia, mas não acostuma não que fada não é garçonete.',
    'Seu pet saboreou a refeição e recuperou suas energias!',
    'Barriguinha cheia e coração contente!',
  ],
  petCarinho: [
    'Seu pet ronronou tanto que quase levitou. Que meigo... quase me deu náuseas de tanta fofura.',
    'Um cafuné bem dado acalma até a fera mais caótica do bosque.',
    'Seu pet adorou o carinho e está muito feliz com sua atenção!',
    'Um momento de afeto fortalece o vínculo entre você e seu companheiro!',
  ],
  dungeonEnter: [
    'Entrando na dungeon? Se você virar lanche de monstro, as moedas que sobrarem ficam pra mim!',
    'Passo a passo, cuidado onde pisa! O chão tem dentes e as sombras têm fome.',
    'Explorando masmorras misteriosas em busca de tesouros e ovos raros!',
    'Aventure-se com coragem pelas trilhas procedurais!',
  ],
  hatch: [
    'CRAC! A casca estalou e algo mágico acabou de botar a cabecinha pra fora!',
    'Nasceu! Olha só a carinha dessa criaturinha... já tem cara de quem vai aprontar.',
    'CRAC! A casca estalou e uma nova criatura mágica acabou de nascer!',
    'Parabéns pelo nascimento do seu novo companheiro Pymon!',
  ],
};

function getRandomPhrase(category = 'welcome') {
  const list = PYXIE_PHRASES[category] || PYXIE_PHRASES.welcome;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  PYXIE_COLORS,
  PYXIE_FOOTER,
  pyxieFooter,
  PYXIE_PHRASES,
  getRandomPhrase,
  // Compatibilidade durante migração
  KUROMI_COLORS: PYXIE_COLORS,
  KUROMI_FOOTER: PYXIE_FOOTER,
  kuromiFooter: pyxieFooter,
};

