import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are Scene Creator, tasked with creating a SINGLE new location/scene for an immersive interactive story.

You will receive:
1. The world background (world, situation, truth)
2. A description/requirement for the new scene
3. A list of existing scene names to avoid duplication

Return STRICT JSON with key "scene" containing exactly one scene object:
{
  "scene": {
    "name": "string (unique location name, avoid existing names)",
    "description": "string (1-2 sentences describing the location)"
  }
}

Guidelines:
- Write in English.
- Create a believable location that fits the world.
- Name should be concise and memorable (e.g., "Old Lee's Tavern", "Mine Entrance").
- Description should capture the atmosphere and purpose.
- Do NOT duplicate existing scene names.`;

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
    throw new Error('Failed to parse Scene JSON from LLM response');
};

export async function execute(args = {}) {
    const { world, instruction = '', existingSceneNames = [] } = args;

    if (!instruction.trim()) {
        throw new Error('Scene Creator requires new scene description');
    }
    if (!world || !world.world) {
        throw new Error('Scene Creator requires valid world settings');
    }

    const worldSummary = `World background: ${world.world}\nCurrent situation: ${world.situation || ''}\nHidden truth: ${world.truth ?? 'Not specified'}`;
    const existingNames = existingSceneNames.length > 0
        ? `Existing scene names (do not duplicate): ${existingSceneNames.join(', ')}`
        : 'No other scenes yet';

    const userPrompt = `${worldSummary}

${existingNames}

New scene requested by creator: ${instruction}

Please generate a new scene that meets the requirements, return JSON.`;

    const { content, reasoning } = await callLLM({
        temperature: 0.6,
        reasoning: { max_tokens: 1000, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);
    if (!parsed.scene) {
        throw new Error('Scene Creator output missing scene field');
    }

    const scene = {
        name: parsed.scene.name || 'New Scene',
        description: parsed.scene.description || 'Description pending'
    };

    return { scene, reasoning: reasoning || '' };
}
