const cooldowns = new Map();
const dailyCounters = new Map();

function getBrasiliaDayKey() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasilia = new Date(utc - 3 * 3600000);
  return `${brasilia.getFullYear()}-${String(brasilia.getMonth() + 1).padStart(2, '0')}-${String(brasilia.getDate()).padStart(2, '0')}`;
}

function checkCooldown(key, cooldownMs) {
  const now = Date.now();
  const lastTime = cooldowns.get(key) || 0;
  const elapsed = now - lastTime;

  if (elapsed < cooldownMs) {
    return {
      onCooldown: true,
      remainingMs: cooldownMs - elapsed,
      remainingSec: Math.ceil((cooldownMs - elapsed) / 1000),
    };
  }

  return { onCooldown: false, remainingMs: 0, remainingSec: 0 };
}

function setCooldown(key) {
  cooldowns.set(key, Date.now());
}

function getDailyCount(userId, action) {
  const dayKey = getBrasiliaDayKey();
  const key = `${dayKey}:${action}:${userId}`;
  return dailyCounters.get(key) || 0;
}

function checkDailyLimit(userId, action, maxTimes = 3) {
  const current = getDailyCount(userId, action);
  const allowed = current < maxTimes;
  return {
    allowed,
    current,
    max: maxTimes,
    remaining: Math.max(0, maxTimes - current),
  };
}

function incrementDailyCount(userId, action) {
  const dayKey = getBrasiliaDayKey();
  const key = `${dayKey}:${action}:${userId}`;
  const current = dailyCounters.get(key) || 0;
  dailyCounters.set(key, current + 1);
  return current + 1;
}

module.exports = {
  checkCooldown,
  setCooldown,
  checkDailyLimit,
  incrementDailyCount,
  getDailyCount,
};

