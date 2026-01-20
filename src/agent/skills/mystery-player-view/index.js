import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are NPC Player View Generator.

Your task is to transform complete NPC data (with hidden motives, breaking points, etc.) into a player-friendly version that:
1. REMOVES all spoilers (true motives, breaking points, confession content)
2. KEEPS only observable information (appearance, visible behavior, public relationships)
3. Creates intrigue without revealing the truth

RESPONSE FORMAT:
Return a valid JSON object with key "npcs" containing an array of player-view NPCs.

Each player-view NPC should have:
{
  "id": "same as original",
  "name": "same as original",
  "role": "public role (may differ from true role)",
  "description": "observable appearance and behavior ONLY, NO hidden motives (< 80 chars)",
  "age": number,
  "gender": "Male/Female",
  "goal": "apparent goal that a newcomer would perceive",
  "carry_with": ["only VISIBLE items, exclude hidden evidence"],
  "recent_events": "what can be OBSERVED, not the true story",
  "short_term_plan": "visible behavior pattern",
  "social_network": { "npc_id": "simple relationship label, NO hidden attitudes" }
}

RULES:
- Write in English.
- Player descriptions should be intriguing but NOT reveal the truth.
- Remove items that are hidden (like "hidden in the inside pocket...").
- social_network should only show public relationships (like "boss", "colleague"), not true feelings.
- Only include CLEAR, real-world relationships in social_network. Do NOT add vague entries.
- Relationship labels must be concrete social ties such as: boss, subordinate, colleague, spouse, lover, relative, creditor, debtor, employer, employee, partner, neighbor, classmate, competitor, supplier, customer, friend, ex, mentor, landlord, tenant.`;

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

const normalizePlayerNpc = (npc) => ({
    id: npc.id || '',
    name: npc.name || '',
    role: npc.role || '',
    description: npc.description || '',
    age: npc.age || 30,
    gender: npc.gender || 'Male',
    goal: npc.goal || '',
    carry_with: Array.isArray(npc.carry_with) ? npc.carry_with : [],
    recent_events: npc.recent_events || '',
    short_term_plan: npc.short_term_plan || '',
    social_network: npc.social_network || {}
});

export async function execute(args = {}) {
    const { npcs, worldPlayer } = args;

    if (!npcs || !Array.isArray(npcs) || npcs.length === 0) {
        throw new Error('mystery-player-view requires NPC array');
    }

    // Build NPC info summary for LLM transformation
    const npcSummaries = npcs.map(npc => ({
        id: npc.id,
        name: npc.name,
        current_location: npc.current_location,
        profile: npc.profile
    }));

    const userPrompt = `Please transform the following complete NPC data into player-visible version (no spoilers):

Player-visible world background: ${worldPlayer?.world || ''}
Player-visible situation: ${worldPlayer?.situation || ''}

Complete NPC data:
${JSON.stringify(npcSummaries, null, 2)}

Requirements:
1. Remove all hidden motives, breaking points, confession content
2. Keep only observable appearance and behavior
3. Descriptions should be intriguing but not spoil
4. Items should only include visible ones

Please return JSON.`;

    const { content, reasoning } = await callLLM({
        temperature: 0.5,
        reasoning: { max_tokens: 2000, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);
    const rawNpcs = parsed.npcs || parsed.player_npcs || [];

    if (!Array.isArray(rawNpcs) || rawNpcs.length === 0) {
        throw new Error('mystery-player-view failed to generate valid data');
    }

    const playerNpcs = rawNpcs.map(normalizePlayerNpc);

    return { playerNpcs, reasoning: reasoning || '' };
}
