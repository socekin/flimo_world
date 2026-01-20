---
name: story-summary
description: 将故事背景合成叙事风格的玩家版摘要
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
      description: 隐藏真相（不暴露给玩家）
  required: [world, situation]
output_schema:
  type: object
  properties:
    summary:
      type: string
      description: 1-2段叙事风格的故事摘要
  required: [summary]
---

# Story Summary Generator

## Instructions
1. 阅读故事的世界背景、当前情势和隐藏真相。
2. 生成 1-2 段叙事风格的故事摘要，用于玩家阅读。
3. 不可暴露隐藏真相的关键信息，但可以暗示有"秘密"存在。
4. 风格：引人入胜，像小说开篇或电影旁白。
5. 每段 80-150 字，共 2 段。
6. 输出严格 JSON。
