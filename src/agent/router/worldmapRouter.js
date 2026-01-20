import { callLLM } from '../../lib/llmClient';

const SYSTEM_PROMPT = `You are the WorldMap Edit Analyzer. Your job is to determine how to handle a worldmap edit request.

Return STRICT JSON:
{
  "editType": "layout" | "style" | "regenerate" | "sync" | "clarification",
  "regenerateScope": "all" | "mapOnly" | null,
  "instruction": string,
  "clarificationQuestion": string or null,
  "suggestions": [string] or null
}

Classification Rules:

editType MUST be "regenerate" if the request involves:
- Regenerating the entire map (e.g., "重新生成地图", "重新画地图", "regenerate map")
- Starting fresh (e.g., "从头生成", "重新来过")
- regenerateScope should be:
  * "all" if they want to regenerate BOTH layout and map (e.g., "重新生成地图和布局", "从头生成", "重新规划")
  * "mapOnly" if they only want to regenerate the final map (e.g., "重新生成地图", "重新画地图")

editType MUST be "sync" if the request involves:
- Syncing map with scene changes (e.g., "更新地图", "同步场景", "根据场景更新地图")
- This will regenerate layout + map based on current scenes

editType MUST be "layout" if the request involves:
- Adding buildings or locations (e.g., "增加学校", "添加超市")
- Removing buildings or locations (e.g., "删除工厂", "移除医院")
- Moving or repositioning buildings
- Modifying road STRUCTURE/POSITION
- ANY structural/spatial changes to the map

editType MUST be "style" if the request ONLY involves:
- Visual style changes (e.g., "改成赛博朋克风格", "科幻风格")
- Time or weather changes (e.g., "改成夜景", "白天", "下雨")
- Color or lighting adjustments
- Purely visual/aesthetic changes with NO structural modifications

editType MUST be "clarification" if:
- The request is ambiguous
- Fill clarificationQuestion and suggestions

Always respond in JSON with double quotes and no trailing comments.`;

const extractJson = (text) => {
    if (!text) throw new Error('WorldMap Router 返回为空');
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return JSON.parse(trimmed);
    }
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
        return JSON.parse(match[0]);
    }
    throw new Error('无法从 WorldMap Router 响应中提取 JSON');
};

export async function planWorldmapEdit({ input }) {
    if (!input?.trim()) {
        return {
            editType: null,
            instruction: null,
            clarificationQuestion: '请描述您想对地图进行什么样的修改。',
            suggestions: ['增加/删除建筑', '修改视觉风格', '调整道路'],
            reasoning: null
        };
    }

    const userPrompt = `用户请求：${input}\n\n请分析这个请求并返回 JSON。`;

    const { content, reasoning } = await callLLM({
        temperature: 0.3,
        reasoning: { max_tokens: 1000, exclude: false },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ]
    });

    const plan = extractJson(content);

    return {
        editType: plan.editType || null,
        regenerateScope: plan.regenerateScope || null,
        instruction: plan.instruction || input,
        clarificationQuestion: plan.clarificationQuestion || null,
        suggestions: Array.isArray(plan.suggestions) ? plan.suggestions : null,
        reasoning: reasoning || null
    };
}
