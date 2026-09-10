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

const PYXIE_FOOTER = 'Pyxie • O Universo Encantado de Pymons';

function pyxieFooter(extra = '') {
  return extra ? `${PYXIE_FOOTER} • ${extra}` : PYXIE_FOOTER;
}

const PYXIE_PHRASES = {
  welcome: [
    'Boas-vindas ao incrível e mágico reino dos Pymons!',
    'Mais um aventureiro pronto para desbravar masmorras e cuidar de criaturas mágicas!',
    'Que a sua jornada pelo universo de Pymons seja repleta de descobertas e conquistas!',
  ],
  feed: [
    'Seu pet saboreou a refeição e recuperou suas energias!',
    'Barriguinha cheia e coração contente!',
  ],
  petCarinho: [
    'Seu pet adorou o carinho e está muito feliz com sua atenção!',
    'Um momento de afeto fortalece o vínculo entre você e seu companheiro!',
  ],
  dungeonEnter: [
    'Explorando masmorras misteriosas em busca de tesouros e ovos raros!',
    'Aventure-se com coragem pelas trilhas procedurais!',
  ],
  hatch: [
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

