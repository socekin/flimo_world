import { callLLM } from '../../../lib/llmClient';

const SYSTEM_PROMPT = `You are Mystery NPC Designer, an expert at creating complex characters for detective-style interactive games.

Your task is to create NPCs with:
1. Hidden motives and secrets
2. Breaking points (conditions under which they confess)
3. Distinct personas with voice patterns

RESPONSE FORMAT STRICTLY:
1. Return ONLY a valid JSON object with key "npcs" containing an array.
2. Do NOT wrap the output in markdown code blocks.

JSON STRUCTURE for each NPC:
{
  "id": "snake_case_id",
  "name": "Character Name (English, <= 2 words)",
  "current_location": "Scene name",
  "profile": {
    "role": "Character role (e.g., Sheriff, Bartender)",
    "description": "Complete description including hidden motives and secrets (< 100 chars)",
    "age": number,
    "gender": "Male" or "Female",
    "goal": "True goal, may differ from apparent goal",
    "breaking_point": {
      "trigger_concepts": ["keyword1", "keyword2", "keyword3"],
      "logic": "When player mentions/shows these evidences, the character's psychological defense collapses",
      "reaction": "Behavior when breaking down",
      "confession_content": "What they confess after breaking"
    },
    "carry_with": ["item1", "item2", "item3"],
    "recent_events": "Recent key events",
    "short_term_plan": "Current action plan",
    "social_network": {
      "other_npc_id": "Relationship description and hidden attitude"
    },
    "persona": {
      "voice": {
        "register": "Speaking style (e.g., assertive, nervous, sweet)",
        "addressing_user": "How they address the player",
        "quirks": ["speech habits or mannerisms"],
        "sample_phrases": ["typical phrase 1", "typical phrase 2"]
      },
      "public_stance": "Public position/attitude",
      "what_i_will_volunteer": ["information they'll share freely"],
      "what_i_wont_say": "What they won't reveal until breaking point is triggered",
      "common_lies": ["common lies/excuses"]
    }
  }
}

REQUIREMENTS:
- Write in English.
- Create NPCs that form an interconnected web of relationships.
- Each NPC should have unique breaking_point triggers.
- At least one NPC should be the true culprit, one should be a red herring.
- Ensure social_network references use valid NPC ids.
- Only include CLEAR, real-world relationships in social_network. Do NOT add vague entries.
- Relationship labels must be concrete social ties such as: boss, subordinate, colleague, spouse, lover, relative, creditor, debtor, employer, employee, partner, neighbor, classmate, competitor, supplier, customer, friend, ex, mentor, landlord, tenant.`;

const extractJson = (text) => {
    if (!text) throw new Error('LLM returned empty response');

    let cleaned = text.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    // Try direct parsing
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            // Continue trying other methods
            console.warn('[extractJson] Direct parsing failed:', e.message);
        }
    }

    // Find the first complete JSON object
    const start = cleaned.indexOf('{');
    if (start === -1) {
        throw new Error('No JSON object start marker found');
    }

    // Use bracket matching to find JSON end position
    let depth = 0;
    let inString = false;
    let escape = false;
    let jsonEnd = -1;

    for (let i = start; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\' && inString) {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '{') depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) {
                jsonEnd = i;
                break;
            }
        }
    }

    if (jsonEnd === -1) {
        // Fallback to simple method
        const end = cleaned.lastIndexOf('}');
        if (end > start) {
            jsonEnd = end;
        } else {
            throw new Error('No JSON object end marker found');
        }
    }

    const jsonStr = cleaned.slice(start, jsonEnd + 1);

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('[extractJson] JSON parsing failed:', e.message);
        console.error('[extractJson] Attempted to parse:', jsonStr.slice(0, 500) + '...');
        throw new Error(`JSON parsing failed: ${e.message}`);
    }
};

const normalizeNpc = (npc, scenes) => {
    const profile = npc.profile || {};
    const breakingPoint = profile.breaking_point || {};
    const persona = profile.persona || {};
    const voice = persona.voice || {};

    return {
        id: npc.id || `npc_${Date.now()}`,
        name: npc.name || 'Unnamed Character',
        current_location: npc.current_location || (scenes[0]?.name || 'Unknown Location'),
        profile: {
            role: profile.role || 'Bystander',
            description: profile.description || '',
            age: profile.age || 30,
            gender: profile.gender || 'Male',
            goal: profile.goal || '',
            breaking_point: {
                trigger_concepts: Array.isArray(breakingPoint.trigger_concepts) ? breakingPoint.trigger_concepts : [],
                logic: breakingPoint.logic || '',
                reaction: breakingPoint.reaction || '',
                confession_content: breakingPoint.confession_content || ''
            },
            carry_with: Array.isArray(profile.carry_with) ? profile.carry_with : [],
            recent_events: profile.recent_events || '',
            short_term_plan: profile.short_term_plan || '',
            social_network: profile.social_network || {},
            persona: {
                voice: {
                    register: voice.register || '',
                    addressing_user: voice.addressing_user || 'you',
                    quirks: Array.isArray(voice.quirks) ? voice.quirks : [],
                    sample_phrases: Array.isArray(voice.sample_phrases) ? voice.sample_phrases : []
                },
                public_stance: persona.public_stance || '',
                what_i_will_volunteer: Array.isArray(persona.what_i_will_volunteer) ? persona.what_i_will_volunteer : [],
                what_i_wont_say: persona.what_i_wont_say || '',
                common_lies: Array.isArray(persona.common_lies) ? persona.common_lies : []
            }
        }
    };
};

export async function execute(args = {}) {
    const { worldSystem, count = 5 } = args;

    if (!worldSystem || !worldSystem.world) {
        throw new Error('mystery-npc requires creator version of world setting');
    }

    const scenes = worldSystem.scenes || [];
    const sceneNames = scenes.map(s => s.name).join(', ');

    const userPrompt = `Please create ${count} NPCs for the following mystery story:

Story background: ${worldSystem.world}
Current situation: ${worldSystem.situation}
Hidden truth: ${worldSystem.truth}
Scene list: ${sceneNames}

Requirements:
1. Each NPC should be in a different scene
2. NPCs should have complex relationship networks
3. At least 1 is the true culprit, 1 is a red herring
4. Each NPC has unique breaking point trigger conditions

Please return JSON.`;

    const { content, reasoning } = await callLLM({
        temperature: 0.8,
        reasoning: { max_tokens: 3000, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const parsed = extractJson(content);
    const rawNpcs = parsed.npcs || parsed.NPC || parsed.npc_list || [];

    if (!Array.isArray(rawNpcs) || rawNpcs.length === 0) {
        throw new Error('mystery-npc failed to generate valid NPCs');
    }

    const npcs = rawNpcs.map(npc => normalizeNpc(npc, scenes));

    return { npcs, reasoning: reasoning || '' };
}
