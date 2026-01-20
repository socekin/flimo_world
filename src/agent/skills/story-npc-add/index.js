import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are NPC Creator, tasked with creating a SINGLE new character for an immersive interactive story.

You will receive:
1. The world background (world, situation, truth)
2. A description/requirement for the new NPC
3. A list of existing NPC names to avoid duplication

Return STRICT JSON with key "npc" containing exactly one NPC object:
{
  "npc": {
    "name": "string (unique name, avoid existing names)",
    "role": "string (identity/profession)",
    "personality": "string (1-2 sentences)",
    "shortTermGoal": "string (immediate objective)",
    "longTermGoal": "string (longer term aspiration)",
    "hiddenInfo": "string or null (secret only if justified)",
    "mainPlotLink": "string (connection to main plot)"
  }
}

Guidelines:
- Write in English.
- Create a believable character that fits the world.
- 1-2 sentences per field, concise but vivid.
- Name rules: Use culturally appropriate names. English names should be <= 2 words.
- Do NOT duplicate existing NPC names.
- Only include hiddenInfo if there's a justified secret.`;

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

const normalizeNpc = (npc) => ({
    name: npc?.name || 'New Character',
    role: npc?.role || 'To be defined',
    personality: npc?.personality || 'To be defined',
    shortTermGoal: npc?.shortTermGoal || 'To be defined',
    longTermGoal: npc?.longTermGoal || 'To be defined',
    hiddenInfo: npc?.hiddenInfo ?? null,
    mainPlotLink: npc?.mainPlotLink || 'To be defined'
});

export async function execute(args = {}) {
    const { world, instruction = '', existingNpcNames = [] } = args;

    if (!instruction.trim()) {
        throw new Error('NPC Creator requires new character description');
    }
    if (!world || !world.world || !world.situation) {
        throw new Error('NPC Creator requires valid world settings');
    }

    const worldSummary = `World background: ${world.world}\nCurrent situation: ${world.situation}\nHidden truth: ${world.truth ?? 'Not specified'}`;
    const existingNames = existingNpcNames.length > 0
        ? `Existing NPC names (do not duplicate): ${existingNpcNames.join(', ')}`
        : 'No other NPCs yet';

    const userPrompt = `${worldSummary}

${existingNames}

New character requested by creator: ${instruction}

Please generate a new NPC that meets the requirements, return JSON.`;

    const { content, reasoning } = await callLLM({
        temperature: 0.6,
        reasoning: { max_tokens: 1500, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);
    if (!parsed.npc) {
        throw new Error('NPC Creator output missing npc field');
    }

    return {
        npc: normalizeNpc(parsed.npc),
        reasoning: reasoning || ''
    };
}
