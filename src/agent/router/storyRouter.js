import { callLLM } from '../../lib/llmClient';

const SYSTEM_PROMPT = `You are the Flimo Agent. Your job is to analyze the creator's input and decide the next action.

Context you have:
- Current world setting (world, situation, truth, scenes)
- Full NPC profiles (name, role, personality, goals, hiddenInfo, etc.)
- Recent conversation history (last 5 turns, if available)

Return STRICT JSON:
{
  "regenerate": boolean,
  "worldInstruction": string or null,
  "environmentInstruction": string or null,
  "environmentEditIndex": number or null,
  "newNpcInstruction": string or null,
  "deleteNpcName": string or null,
  "sceneAddInstruction": string or null,
  "sceneDeleteName": string or null,
  "npcInstructions": [
    { "name": "NPC name", "textInstruction": "..." or null, "imageInstruction": "..." or null }
  ],
  "clarificationQuestion": string or null,
  "suggestions": [string] or null,
  "conversationalResponse": string or null
}

Guidelines:
- If the creator wants a brand-new story, set regenerate=true and leave other fields null/empty.
- If they want to modify the world background/situation/truth, provide a concise instruction in worldInstruction.
- If they request environment image updates (keywords like "environment", "scene", "generate image", etc.), fill environmentInstruction. If they specify which image (e.g., "second image", "image #2"), extract the index (0-based, so "second"=1) into environmentEditIndex.
- **ADD NEW NPC**: If they request to ADD/CREATE a new NPC (e.g., "add an NPC", "create a male character"), fill newNpcInstruction with the description. Do NOT put new NPCs in npcInstructions.
- **DELETE NPC**: If they request to DELETE/REMOVE an NPC (e.g., "delete John", "remove the third NPC"), fill deleteNpcName with the exact NPC name from the list. Use references like "third" to find the actual name.
- **ADD NEW SCENE**: If they request to ADD a new scene/location (e.g., "add a wine cellar", "add a hospital"), fill sceneAddInstruction with the description.
- **DELETE SCENE**: If they request to DELETE a scene (e.g., "delete the bank", "remove the second scene"), fill sceneDeleteName with the exact scene name. Use references like "second" to find the actual name from scenes list.
- **EDIT EXISTING NPC**: If they mention changes to EXISTING NPCs (using names from the NPC list), list each target NPC in npcInstructions. Use ONLY the canonical names from the provided NPC list. NEVER fabricate NPC names that don't exist.
- When they request bulk updates (e.g. rename the town everywhere), include all affected NPCs so their descriptions and images stay consistent.
- If the input is a CONVERSATIONAL QUERY or QUESTION (e.g., "how many NPCs are there", "describe the world"), provide a helpful answer in conversationalResponse.
- If the instruction is UNCLEAR or AMBIGUOUS, set all action fields to null/false/[], and provide clarificationQuestion + suggestions.
- Always respond in JSON with double quotes and no trailing comments.`;

const extractJson = (text) => {
  if (!text) throw new Error('Router returned empty response');
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('Failed to parse JSON from Router response');
};

export async function planStoryEdit({ input, world, npcs, recentHistory = [] }) {
  if (!input || !world) {
    return {
      regenerate: true,
      worldInstruction: null,
      environmentInstruction: null,
      environmentEditIndex: null,
      newNpcInstruction: null,
      deleteNpcName: null,
      sceneAddInstruction: null,
      sceneDeleteName: null,
      npcInstructions: [],
      clarificationQuestion: null,
      suggestions: null,
      conversationalResponse: null
    };
  }

  const context = {
    world,
    npcs: npcs.map((npc) => ({
      name: npc.name,
      role: npc.role,
      personality: npc.personality,
      shortTermGoal: npc.shortTermGoal,
      longTermGoal: npc.longTermGoal,
      hiddenInfo: npc.hiddenInfo
    })),
    recentHistory: recentHistory.map(m => ({
      role: m.role === 'user' ? 'creator' : 'agent',
      text: m.text
    }))
  };

  const userPrompt = `Current context:\n${JSON.stringify(context, null, 2)}\n\nCreator input: ${input}\n\nPlease output JSON plan.`;

  const { content, reasoning } = await callLLM({
    temperature: 0.4,
    reasoning: { max_tokens: 1500, exclude: false },  // Keep reasoning for debugging
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]
  });

  const plan = extractJson(content);
  return {
    regenerate: Boolean(plan.regenerate),
    worldInstruction: plan.worldInstruction ?? null,
    environmentInstruction: plan.environmentInstruction ?? null,
    environmentEditIndex: typeof plan.environmentEditIndex === 'number' ? plan.environmentEditIndex : null,
    newNpcInstruction: plan.newNpcInstruction ?? null,
    deleteNpcName: plan.deleteNpcName ?? null,
    sceneAddInstruction: plan.sceneAddInstruction ?? null,
    sceneDeleteName: plan.sceneDeleteName ?? null,
    npcInstructions: Array.isArray(plan.npcInstructions) ? plan.npcInstructions : [],
    clarificationQuestion: plan.clarificationQuestion ?? null,
    suggestions: Array.isArray(plan.suggestions) ? plan.suggestions : null,
    conversationalResponse: plan.conversationalResponse ?? null,
    reasoning: reasoning || null
  };
}
