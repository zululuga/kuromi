const automations = new Map();

function registerAutomation(automation) {
  automations.set(automation.id, { ...automation });
}

function updateAutomation(id, updates) {
  const current = automations.get(id);
  if (current) automations.set(id, { ...current, ...updates });
}

function getAutomationSchedule(now = Date.now()) {
  return [...automations.values()]
    .map((automation) => ({
      ...automation,
      remainingMs: Math.max(0, automation.nextAt - now),
    }))
    .sort((left, right) => left.nextAt - right.nextAt);
}

module.exports = {
  getAutomationSchedule,
  registerAutomation,
  updateAutomation,
};
