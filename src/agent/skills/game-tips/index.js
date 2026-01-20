import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `ROLE
You are a game copywriter writing opening text for mystery/puzzle games.

TASK
Generate 2 lines of opening text for a mystery game start screen:
- Line 1: A question or statement that draws the player in, hints at the mystery or their role
- Line 2: A call to action, creates urgency, makes them want to click "Start"

OUTPUT FORMAT (strict)
Return ONLY a valid JSON object:
{
  "text": "Line 1\\nLine 2"
}

CONSTRAINTS
1. Exactly 2 lines in English, separated by \\n.
2. Each line: 10-25 words.
3. Modern English. Avoid archaic or overly formal language.
4. Simple, direct, conversational. NOT choppy or forced poetry.
5. Avoid clichés: shrouded in mystery, fate awaits, dark secrets, etc.

STYLE
- Simple and direct, like talking to the player
- Line 1: Can be a question ("As a..., how will you...?") or a hook statement
- Line 2: Clear call to action, mentions a location/mission/urgency
- Emotional but not over-dramatic

GOOD EXAMPLES:
- "As an inspector, how will you uncover the truth?\\nSet sail now — the town of Westridge needs you."
- "The town went silent three days ago. No one knows what happened.\\nOnly you can break this silence."
- "The vault was robbed. The suspects are right in front of you.\\nInvestigator, find the answer within 48 hours."

BAD EXAMPLES (avoid):
- "City blackout. Signal cut. You must intervene. Restart everything." (too choppy)
- "Mist shrouds truth. Darkness awaits light." (clichés, forced parallelism)`;


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
 * Generate game opening text
 * @param {Object} args - { world, situation, truth }
 * @returns {Promise<{ tips: string[], reasoning: string }>}
 */
export async function execute(args = {}) {
    const { world = '', situation = '', truth = '' } = args;

    if (!world.trim() && !situation.trim()) {
        throw new Error('game-tips requires story background information');
    }

    const userPrompt = `INPUT
World Background: ${world}
Current Situation: ${situation}
${truth ? `Hidden Truth: ${truth}` : ''}

Generate the 2-line opening text now.`;

    const { content, reasoning } = await callLLM({
        temperature: 0.8,
        reasoning: { max_tokens: 500, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);

    if (!parsed.text) {
        throw new Error('game-tips output missing text field');
    }

    // Split text into array for compatibility with existing interface
    const lines = parsed.text.split('\n').filter(l => l.trim());
    return {
        tips: lines.slice(0, 2), // Max 2 lines
        reasoning: reasoning || ''
    };
}


