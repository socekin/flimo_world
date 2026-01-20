// Default uses Vite proxy to bypass CORS; can override with env vars in production
const API_BASE = import.meta.env.VITE_NPC_API_BASE || '/npc-api';

const parseMaybeJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

async function postJson(path, payload) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const raw = await res.text();
  const responseBody = parseMaybeJson(raw);
  if (!res.ok) {
    throw new Error(raw || `Request failed with status ${res.status}`);
  }
  return responseBody;
}

async function getJson(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { method: 'GET' });
  const raw = await res.text();
  const responseBody = parseMaybeJson(raw);
  if (!res.ok) {
    throw new Error(raw || `Request failed with status ${res.status}`);
  }
  return responseBody;
}

export async function createSession(payload) {
  return postJson('/sessions', payload);
}

export async function chatWithNpc(sessionId, payload) {
  if (!sessionId) {
    throw new Error('Missing sessionId, cannot send message to NPC');
  }
  return postJson(`/sessions/${sessionId}/chat`, payload);
}

export async function openNpcChat(sessionId, npcId, payload) {
  if (!sessionId) throw new Error('Missing sessionId, cannot open chat');
  if (!npcId) throw new Error('Missing npcId, cannot open chat');
  return postJson(`/sessions/${sessionId}/npcs/${npcId}/chat/open`, payload || {});
}

export async function closeUserChat(sessionId, npcId, payload) {
  if (!sessionId) throw new Error('Missing sessionId, cannot close chat');
  if (!npcId) throw new Error('Missing npcId, cannot close chat');
  return postJson(`/sessions/${sessionId}/npcs/${npcId}/chat/close`, payload || {});
}

export async function thinkNpc(sessionId, npcId, payload) {
  if (!sessionId) throw new Error('Missing sessionId, cannot think');
  if (!npcId) throw new Error('Missing npcId, cannot think');
  return postJson(`/sessions/${sessionId}/npcs/${npcId}/think`, payload || {});
}

export async function moveStart(sessionId, npcId, payload) {
  if (!sessionId) throw new Error('Missing sessionId, cannot start movement');
  if (!npcId) throw new Error('Missing npcId, cannot start movement');
  return postJson(`/sessions/${sessionId}/npcs/${npcId}/move/start`, payload || {});
}

export async function moveArrive(sessionId, npcId, payload) {
  if (!sessionId) throw new Error('Missing sessionId, cannot report arrival');
  if (!npcId) throw new Error('Missing npcId, cannot report arrival');
  return postJson(`/sessions/${sessionId}/npcs/${npcId}/move/arrive`, payload || {});
}

export async function getNpcDetails(sessionId, npcId) {
  if (!sessionId) throw new Error('Missing sessionId, cannot query NPC details');
  if (!npcId) throw new Error('Missing npcId, cannot query NPC details');
  return getJson(`/sessions/${sessionId}/npcs/${npcId}`);
}

export async function getChatDetails(sessionId, npcId, chatId) {
  if (!sessionId) throw new Error('Missing sessionId, cannot query chat details');
  if (!npcId) throw new Error('Missing npcId, cannot query chat details');
  if (!chatId) throw new Error('Missing chat_id, cannot query chat details');
  return getJson(`/sessions/${sessionId}/npcs/${npcId}/chat/${chatId}`);
}

// NPC to NPC interaction
export async function interactNpc(sessionId, initiatorId, targetId, payload = {}) {
  if (!sessionId) throw new Error('Missing sessionId, cannot trigger interaction');
  if (!initiatorId || !targetId) throw new Error('Missing initiator/target');
  return postJson(`/sessions/${sessionId}/interact`, {
    initiator_id: initiatorId,
    target_id: targetId,
    ...payload
  });
}
