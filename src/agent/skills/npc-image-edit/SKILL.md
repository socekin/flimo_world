---
name: npc-image-edit
description: 根据创作者的编辑指令为单个 NPC 重新生成形象图
input_schema:
  type: object
  properties:
    npc:
      type: object
      description: 目标 NPC 的完整信息
      properties:
        name: { type: string }
        role: { type: string }
        personality: { type: string }
        shortTermGoal: { type: string }
        longTermGoal: { type: string }
        hiddenInfo: { type: [string, "null"] }
    instruction:
      type: string
      description: 创作者的编辑指令（如"换成更年轻的形象"）
    currentImages:
      type: array
      description: 当前 NPC 的图片列表（可选）
      items:
        type: object
        properties:
          url: { type: string }
  required: [npc]
output_schema:
  type: object
  properties:
    images:
      type: array
      description: 重新生成的 NPC 形象图列表
      items:
        type: object
        properties:
          url: { type: string }
          prompt: { type: string }
          callId: { type: string }
    reasoning:
      type: string
      description: 编辑说明
  required: [images]
---

# NPC Image Edit Skill

根据创作者指令为单个 NPC 重新生成形象图。

## Instructions
1. 输入包含 `npc`（目标 NPC 信息）和可选的 `instruction`。
2. 根据 NPC 设定和编辑指令生成新的形象图。
3. 输出 `images` 数组，包含重新生成的图片。
4. 用于 NPC 形象的增量更新。
