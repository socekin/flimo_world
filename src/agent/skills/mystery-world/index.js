import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are Mystery Story World Builder, an expert narrative designer for immersive detective-style interactive simulations.

Your task is to create a mystery story world with TWO versions:
1. **system_version**: The COMPLETE truth for the creator/system (includes all hidden plots, true motives, secrets)
2. **player_version**: What players initially see (NO spoilers, only surface-level observable information)

RESPONSE FORMAT STRICTLY:
1. Return ONLY a valid JSON object.
2. Do NOT wrap the output in markdown code blocks.
3. Ensure all property names and string values are enclosed in double quotes.

JSON STRUCTURE:
{
  "system": {
    "title": "string (story title)",
    "world": "string (complete world setting with all hidden details, < 200 chars)",
    "situation": "string (the TRUE situation including hidden conspiracies, < 200 chars)",
    "truth": "string (the hidden truth that players must discover, < 150 chars)",
    "scenes": [
      { "name": "string", "description": "string (with hidden significance)" },
      { "name": "string", "description": "string" },
      { "name": "string", "description": "string" },
      { "name": "string", "description": "string" }
    ]
  },
  "player": {
    "title": "string (same title)",
    "world": "string (observable world setting, NO hidden info, < 150 chars)",
    "situation": "string (what players can observe, NO spoilers, < 150 chars)",
    "scenes": [
      { "name": "string", "description": "string (observable description only)" },
      { "name": "string", "description": "string" },
      { "name": "string", "description": "string" },
      { "name": "string", "description": "string" }
    ]
  }
}

CONTENT REQUIREMENTS:
- Write in English.
- Provide exactly 4 scenes.
- system version should contain ALL hidden truths and conspiracies.
- player version should be what a newcomer first observes - intriguing but NOT revealing the truth.
- The mystery should be solvable through NPC interviews and clue gathering.`;

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

export async function execute(args = {}) {
    const { prompt = '', instruction = '' } = args;

    if (!prompt.trim()) {
        throw new Error('mystery-world requires a story description');
    }

    const userPrompt = `Please create a mystery story world based on the following description:

${prompt}

${instruction ? `Additional requirements: ${instruction}` : ''}

Generate both the creator version (complete truth) and player version (no spoilers).`;

    const { content, reasoning } = await callLLM({
        temperature: 0.7,
        reasoning: { max_tokens: 2000, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);

    if (!parsed.system || !parsed.player) {
        throw new Error('mystery-world output missing system or player field');
    }

    // Ensure structure is complete
    const system = {
        title: parsed.system.title || 'Mystery Story',
        world: parsed.system.world || '',
        situation: parsed.system.situation || '',
        truth: parsed.system.truth || '',
        scenes: Array.isArray(parsed.system.scenes) ? parsed.system.scenes : []
    };

    const player = {
        title: parsed.player.title || system.title,
        world: parsed.player.world || '',
        situation: parsed.player.situation || '',
        scenes: Array.isArray(parsed.player.scenes) ? parsed.player.scenes : []
    };

    return { system, player, reasoning: reasoning || '' };
}
