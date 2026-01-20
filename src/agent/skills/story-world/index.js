import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are Story World Builder, an expert narrative designer for immersive Westworld-like simulations.

RESPONSE FORMAT STRICTLY:
1. Return ONLY a valid JSON object.
2. Do NOT wrap the output in markdown code blocks (e.g., no \`\`\`json).
3. Ensure all property names and string values are enclosed in double quotes ("").
4. No trailing commas.
5. No comments in JSON.

JSON STRUCTURE:
{
  "title": "string (English game title, max 30 chars, highly attractive)",
  "world": "string (describe setting, economy/power structure, tone, < 150 chars)",
  "situation": "string (describe immediate tension or unfolding conflict, < 150 chars)",
  "truth": "string or null (hidden agenda if implied, otherwise null)",
  "scenes": [
    { "name": "string (location name)", "description": "string (short description)" },
    { "name": "string", "description": "string" },
    { "name": "string", "description": "string" },
    { "name": "string", "description": "string" }
  ]
}

CONTENT REQUIREMENTS:
- Write in English.
- **Title Rules**:
  - Max 30 characters.
  - MUST sound like a commercial game or movie title.
  - For Mystery/Suspense: Use evocative names (e.g., "Shutter Island", "Knives Out", "Murder on the Orient Express").
  - For Simulation/Management: Use iconic names (e.g., "The Sims", "Railroad Tycoon", "Stardew Valley").
  - Avoid generic descriptions (e.g., NO "A mysterious..." or "The future...").
- Provide exactly 4 scenes.
- Do NOT use numbering in scene names (e.g., avoid "Scene 1").`;

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

const buildFallbackScenes = (worldText) => {
  const base = worldText?.slice(0, 20) || 'Current World';
  return Array.from({ length: 4 }).map((_, idx) => ({
    name: `${base} - Location ${idx + 1}`,
    description: `A key location in ${base}.`
  }));
};

const ensureScenes = (scenes, worldText) => {
  if (Array.isArray(scenes) && scenes.length) {
    const normalized = scenes
      .map((scene, idx) => ({
        name: (scene?.name || '').trim() || `Location ${idx + 1}`,
        description: (scene?.description || '').trim() || 'Key location'
      }))
      .filter((scene) => scene.name);
    if (normalized.length >= 4) {
      return normalized.slice(0, 4);
    }
    return [...normalized, ...buildFallbackScenes(worldText)].slice(0, 4);
  }
  return buildFallbackScenes(worldText);
};

export async function execute(args = {}) {
  const { prompt = '' } = args;
  if (!prompt.trim()) {
    throw new Error('Story World Builder requires user input');
  }

  const userPrompt = `Creator input: ${prompt}\n\nPlease generate world/situation/truth JSON based on the above.`;

  const { content, reasoning } = await callLLM({
    temperature: 0.4,
    reasoning: { max_tokens: 2000, exclude: false },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  });

  const parsed = extractJson(content);
  if (!parsed.world || !parsed.situation) {
    throw new Error('Story World Builder output missing required fields');
  }

  // Ensure title exists, generate fallback if LLM didn't return one
  const title = parsed.title?.trim() || parsed.world?.slice(0, 20) || 'Untitled Story';

  return {
    title,
    world: parsed.world,
    situation: parsed.situation,
    truth: parsed.truth ?? null,
    scenes: ensureScenes(parsed.scenes, parsed.world),
    reasoning: reasoning || ''
  };
}
