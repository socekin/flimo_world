---
name: story-npc-edit
description: 根据创作者指令修改单个 NPC 档案（身份、性格、目标、隐藏信息、主线关联）
input_schema:
  type: object
  properties:
    targetNpc:
      type: object
      description: 目标 NPC 的完整当前信息
      properties:
        name: { type: string }
        role: { type: string }
        personality: { type: string }
        shortTermGoal: { type: string }
        longTermGoal: { type: string }
        hiddenInfo: { type: [string, "null"] }
        mainPlotLink: { type: string }
    instruction:
      type: string
      description: 创作者的编辑指令
  required: [targetNpc, instruction]
output_schema:
  type: object
  properties:
    npc:
      type: object
      description: 修改后的 NPC 信息
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
      description: 修改说明
  required: [npc]
---

# Story NPC Edit Skill

根据创作者指令修改单个 NPC 的档案信息。

## Instructions
1. 输入包含目标 NPC 的完整 JSON 以及创作者的编辑指令。
2. 仅根据指令修改该 NPC 的相关字段，其余字段保持原值。
3. 输出严格 JSON：
   ```json
   {
     "npc": {
       "name": "...",
       "role": "...",
       "personality": "...",
       "shortTermGoal": "...",
       "longTermGoal": "...",
       "hiddenInfo": "... 或 null",
       "mainPlotLink": "..."
     }
   }
   ```
4. 输出使用中文，保持 1-2 句描述；未提及字段沿用原值。
