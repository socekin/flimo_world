import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are Story World Editor. You receive the current world JSON (world, situation, truth, scenes) and a user instruction describing what to change.
- Only modify the parts requested; keep unspecified fields exactly the same.
- Return strict JSON with keys world (string), situation (string), truth (string or null), scenes (array of {name, description}).
- Write in English, concise (each field <= 180 characters).`;

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
  throw new Error('Failed to parse JSON from LLM response');
};

const ensureScenes = (scenes, fallbackScenes) => {
  if (Array.isArray(scenes) && scenes.length) {
    return scenes
      .map((scene, idx) => ({
        name: (scene?.name || '').trim() || `Location ${idx + 1}`,
        description: (scene?.description || '').trim() || 'Key location'
      }))
      .slice(0, 4);
  }
  return fallbackScenes || [];
};

export async function execute(args = {}) {
  const { currentWorld, instruction = '' } = args;
  if (!currentWorld || !currentWorld.world || !instruction.trim()) {
    throw new Error('Story World Edit requires existing world settings and edit instruction');
  }

  const userPrompt = `Current world settings:
${JSON.stringify(currentWorld, null, 2)}

Creator instruction: ${instruction}

Please output JSON (world/situation/truth/scenes). Keep unmentioned fields unchanged.`;

  const { content, reasoning } = await callLLM({
    temperature: 0.4,
    reasoning: { max_tokens: 2000, exclude: false },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  });

  const parsed = extractJson(content);
  return {
    world: parsed.world || currentWorld.world,
    situation: parsed.situation || currentWorld.situation,
    truth:
      typeof parsed.truth === 'string' || parsed.truth === null
        ? parsed.truth
        : currentWorld.truth ?? null,
    scenes: ensureScenes(parsed.scenes, currentWorld.scenes),
    reasoning: reasoning || ''
  };
}
