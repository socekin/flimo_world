import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are NPC Editor. You receive the full JSON of a single NPC and an instruction describing what to change.
- Update only the specified aspects; keep all other fields identical to the original.
- Return strict JSON with key "npc" containing the updated NPC.
- Write in English, concise (1-2 sentences per field).
- If renaming, use culturally appropriate names. English names should be <= 2 words.`;

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

export async function execute(args = {}) {
  const { targetNpc, instruction = '' } = args;
  if (!targetNpc || !targetNpc.name || !instruction.trim()) {
    throw new Error('NPC Edit requires existing NPC and edit instruction');
  }

  const userPrompt = `Target NPC:
${JSON.stringify(targetNpc, null, 2)}

Creator instruction: ${instruction}

Please return JSON only ({ "npc": { ... } }), keep unmentioned fields unchanged.`;

  const { content, reasoning } = await callLLM({
    temperature: 0.5,
    reasoning: { max_tokens: 2000, exclude: false },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  });

  const parsed = extractJson(content);
  if (!parsed.npc) {
    throw new Error('NPC Edit output missing npc field');
  }

  const updatedNpc = {
    ...targetNpc,
    ...parsed.npc,
    hiddenInfo:
      parsed.npc.hiddenInfo === undefined ? targetNpc.hiddenInfo : parsed.npc.hiddenInfo
  };

  return { npc: updatedNpc, reasoning: reasoning || '' };
}
