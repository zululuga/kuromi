const KUROMI_COLORS = {
  pink: '#e60067',
  rose: '#ff8fb3',
  violet: '#8b5cf6',
  plum: '#4b0082',
  gold: '#f59e0b',
  green: '#22c55e',
  red: '#ef4444',
  ink: '#1a1a1a',
};

const KUROMI_FOOTER = 'Kuromi • drama, carinho e uma memória impecável para rancores';

function kuromiFooter(extra = '') {
  return extra ? `${KUROMI_FOOTER} • ${extra}` : KUROMI_FOOTER;
}

module.exports = { KUROMI_COLORS, KUROMI_FOOTER, kuromiFooter };
