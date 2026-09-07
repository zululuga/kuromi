const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const marriageFile = path.join(__dirname, '..', '..', 'data', 'marriages.json');

function readMarriageData() {
  const directory = path.dirname(marriageFile);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(marriageFile)) return { marriages: {}, requests: {} };

  try {
    const raw = fs.readFileSync(marriageFile, 'utf8');
    const data = raw ? JSON.parse(raw) : {};
    return { marriages: data.marriages || {}, requests: data.requests || {} };
  } catch (error) {
    return { marriages: {}, requests: {} };
  }
}

function writeMarriageData(data) {
  fs.writeFileSync(marriageFile, JSON.stringify(data, null, 2), 'utf8');
}

function getSpouseId(userId) {
  return readMarriageData().marriages[userId] || null;
}

function createMarriageRequest(requesterId, targetId, guildId) {
  const data = readMarriageData();
  if (data.marriages[requesterId] || data.marriages[targetId]) return { created: false, reason: 'married' };
  if (
    Object.values(data.requests).some(
      (request) =>
        [request.requesterId, request.targetId].includes(requesterId) ||
        [request.requesterId, request.targetId].includes(targetId)
    )
  ) {
    return { created: false, reason: 'pending' };
  }

  const id = crypto.randomUUID();
  data.requests[id] = { requesterId, targetId, guildId, createdAt: new Date().toISOString() };
  writeMarriageData(data);
  return { created: true, id };
}

function resolveMarriageRequest(requestId, targetId, accepted) {
  const data = readMarriageData();
  const request = data.requests[requestId];
  if (!request || request.targetId !== targetId) return { resolved: false, reason: 'invalid' };

  delete data.requests[requestId];
  if (accepted) {
    data.marriages[request.requesterId] = request.targetId;
    data.marriages[request.targetId] = request.requesterId;
  }
  writeMarriageData(data);
  return { resolved: true, request };
}

function cancelMarriageRequest(requestId, requesterId) {
  const data = readMarriageData();
  const request = data.requests[requestId];
  if (!request || request.requesterId !== requesterId) return false;
  delete data.requests[requestId];
  writeMarriageData(data);
  return true;
}

module.exports = {
  getSpouseId,
  createMarriageRequest,
  resolveMarriageRequest,
  cancelMarriageRequest,
};