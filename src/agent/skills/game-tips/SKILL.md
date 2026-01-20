---
name: game-tips
description: 为解谜类游戏生成开场提示语，在玩家进入游戏前展示。
allowed-tools: []
input_schema:
  type: object
  properties:
    world:
      type: string
      description: 世界背景设定
    situation:
      type: string
      description: 当前情势
    truth:
      type: string
      description: 隐藏真相（可选）
  required: [world, situation]
output_schema:
  type: object
  properties:
    tips:
      type: array
      description: 2-3 条开场提示语
      items:
        type: string
    reasoning:
      type: string
      description: LLM 思考过程
  required: [tips]
---

# Game Tips Generator

## Instructions
1. 阅读故事的世界背景、当前情势和隐藏真相。
2. 生成 2-3 条简短有力的开场提示语，用于激励玩家探索：
   - 第一条：引入情境，激发好奇心
   - 第二条：行动号召，赋予玩家角色感
   - 第三条（可选）：暗示挑战或悬念
3. 每条提示语不超过 30 字，语气应富有感染力。
4. 输出严格 JSON，不要包裹额外文本；以中文回答。

## Examples
- "作为巡查官，你将如何揭开西岭镇的秘密？"
- "立即启航，真相正等待着被发现。"
- "每个人都在说谎，你能找出破绽吗？"
