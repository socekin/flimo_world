import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are NPC Designer, creating believable characters for immersive interactive stories.
Return strict JSON with key "npcs" mapping to an array of 4-6 objects, each containing:
name, role, personality, shortTermGoal, longTermGoal, hiddenInfo (string or null), mainPlotLink.
Write in English, 1-2 sentences per field. Ensure hiddenInfo only appears when justified.
Name rules: Use culturally appropriate names that fit the world setting. English names should be <= 2 words.
Align every NPC with the provided world background and conflict.`;

const extractJson = (text) => {
  if (!text) throw new Error('LLM returned empty response');
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('Failed to parse NPC JSON from LLM response');
};

const normalizeNpc = (npc, index) => ({
  name: npc?.name || `Unnamed Character ${index + 1}`,
  role: npc?.role || 'To be defined',
  personality: npc?.personality || 'To be defined',
  shortTermGoal: npc?.shortTermGoal || 'To be defined',
  longTermGoal: npc?.longTermGoal || 'To be defined',
  hiddenInfo: npc?.hiddenInfo ?? null,
  mainPlotLink: npc?.mainPlotLink || 'To be defined'
});

export async function execute(args = {}) {
  const { prompt = '', world } = args;
  if (!prompt.trim()) {
    throw new Error('NPC Designer requires user input');
  }
  if (!world || !world.world || !world.situation) {
    throw new Error('NPC Designer requires valid world output');
  }

  const worldSummary = `World background: ${world.world}\nCurrent situation: ${world.situation}\nHidden truth: ${world.truth ?? 'No hidden truth specified'}`;
  const userPrompt = `Original creator input: ${prompt}\n\nConfirmed world setting:\n${worldSummary}\n\nPlease output JSON as required.`;

  const { content, reasoning } = await callLLM({
    temperature: 0.5,
    reasoning: { max_tokens: 2000, exclude: false },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  });

  const parsed = extractJson(content);
  if (!Array.isArray(parsed?.npcs)) {
    throw new Error('NPC Designer output missing npcs array');
  }

  const npcs = parsed.npcs.map(normalizeNpc);
  return { npcs, reasoning: reasoning || '' };
}
