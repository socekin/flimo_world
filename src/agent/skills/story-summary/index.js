import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `ROLE
You are a game narrative writer creating story introductions for mystery games.

TASK
Convert the provided world setting and situation into a 2-paragraph narrative summary for players.
- Paragraph 1: Introduce the setting, atmosphere, and underlying tensions
- Paragraph 2: Introduce the player's role and the immediate situation they face

OUTPUT FORMAT (strict)
Return ONLY a valid JSON object:
{
  "summary": "First paragraph...\\n\\nSecond paragraph..."
}

CONSTRAINTS
1. Write in English, narrative style like a novel opening.
2. Each paragraph: 80-150 words.
3. DO NOT reveal the hidden truth directly, but you may hint at secrets/mysteries.
4. Create atmosphere and intrigue.
5. Paragraph 2 should mention the player's role and what they face.
6. Use \\n\\n to separate paragraphs.`;

const extractJson = (text) => {
    if (!text) throw new Error('LLM response is empty');
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

/**
 * Generate story summary
 * @param {Object} args - { world, situation, truth }
 * @returns {Promise<{ summary: string, reasoning: string }>}
 */
export async function execute(args = {}) {
    const { world = '', situation = '', truth = '' } = args;

    if (!world.trim() && !situation.trim()) {
        throw new Error('story-summary requires story background information');
    }

    const userPrompt = `Generate a player-facing story summary based on the following background:

World Background: ${world}
Current Situation: ${situation}
${truth ? `Hidden Truth (for reference only, do not reveal directly): ${truth}` : ''}

Create a 2-paragraph narrative-style story introduction that helps players understand the world and their role.`;

    const { content, reasoning } = await callLLM({
        temperature: 0.7,
        reasoning: { max_tokens: 500, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);

    if (!parsed.summary) {
        throw new Error('story-summary output missing summary field');
    }

    return {
        summary: parsed.summary,
        reasoning: reasoning || ''
    };
}

