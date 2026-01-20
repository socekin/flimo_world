---
name: environment-image
description: 根据当前故事世界观生成 4 张环境概念图（含 prompt 和图片比例）。用于 Story 阶段的初次生成。
input_schema:
  type: object
  properties:
    world: { type: string }
    situation: { type: string }
    truth: { type: [string, "null"] }
    scenes:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          description: { type: string }
    instruction: { type: string }
  required: [world, situation, scenes]
output_schema:
  type: object
  properties:
    images:
      type: array
      items:
        type: object
        properties:
          id: { type: string }
          title: { type: string }
          prompt: { type: string }
          description: { type: string }
          ratio: { type: string }
          url: { type: string }
          callId: { type: string }
  required: [images]
---

# Environment Image Skill

## Instructions
1. 输入包含 `world`, `situation`, `truth` 等背景描述。
2. 结合场景信息输出 4 个环境概念：例如主街、酒馆、矿区、边境等，prompt 使用中文描述。
3. 返回结构：
   ```json
   {
     "images": [
       { "id": "env-1", "title": "...", "prompt": "...", "ratio": "16:9", "url": "..." }
     ]
   }
   ```
4. 当前实现可使用占位图片，后续可替换为真实文生图 API。
