---
name: story-world-edit
description: 根据用户指令修改世界观设定
input_schema:
  type: object
  properties:
    currentWorld: { type: object }
    instruction: { type: string }
  required: [currentWorld, instruction]
output_schema:
  type: object
  properties:
    world: { type: string }
    situation: { type: string }
    truth: { type: [string, "null"] }
    scenes: { type: array }
    reasoning: { type: string }
  required: [world, situation]
---

# Story World Edit Skill

## Instructions
1. 输入包含当前 world JSON（字段：`world`, `situation`, `truth`）与创作者的编辑指令。
2. 判断指令影响范围，仅修改相关字段；未提及的字段必须沿用原值。
3. 输出严格 JSON：
   ```json
   {
     "world": "…",
     "situation": "…",
     "truth": "… 或 null"
   }
   ```
4. 所有内容使用中文；单字段不超过 180 个汉字。
