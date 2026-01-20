---
name: story-npc-designer
description: 基于已确认的世界观生成 NPC 设定（身份、性格、目标、隐藏信息、主线关联）。用于 Story 步骤的第二次调用。
input_schema:
  type: object
  properties:
    prompt:
      type: string
      description: 原始创作提示
    world:
      type: object
      description: 故事世界观对象
  required: [prompt, world]
output_schema:
  type: object
  properties:
    npcs:
      type: array
      description: NPC列表(4-6个)
      items:
        type: object
        properties:
          name: { type: string }
          role: { type: string }
          personality: { type: string }
          shortTermGoal: { type: string }
          longTermGoal: { type: string }
          hiddenInfo: { type: [string, "null"] }
          mainPlotLink: { type: string }
    reasoning:
      type: string
  required: [npcs]
---

# Story NPC Designer

## Instructions
1. 输入包括创作者原始提示与 Story World Builder 的输出（world/situation/truth）。
2. 输出 JSON：
   ```json
   {
     "npcs": [
       {
         "name": "...",
         "role": "...",
         "personality": "...",
         "shortTermGoal": "...",
         "longTermGoal": "...",
         "hiddenInfo": "...",
         "mainPlotLink": "..."
       }
     ]
   }
   ```
3. 生成 4-6 位 NPC，全部使用中文描述；当用户未暗示隐藏信息时，可将 `hiddenInfo` 设为 `null`。
4. `mainPlotLink` 需明确 NPC 与世界冲突/真相的关系，便于后续任务系统引用。
