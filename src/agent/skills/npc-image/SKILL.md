---
name: npc-image
description: 根据 NPC 设定生成 2 张角色形象图（占位）。用于 Story 阶段的初次生成。
input_schema:
  type: object
  properties:
    npcs:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          role: { type: string }
          personality: { type: string }
  required: [npcs]
output_schema:
  type: object
  properties:
    results:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          images:
            type: array
            items:
              type: object
              properties:
                id: { type: string }
                prompt: { type: string }
                ratio: { type: string }
                url: { type: string }
  required: [results]
---

# NPC Image Skill

## Instructions
1. 输入 `npcs` 数组，每个对象含 `name`、`role`、`personality` 等字段。
2. 为每位 NPC 输出两张图片，结构如下：
   ```json
   {
     "results": [
       {
         "name": "NPC 名",
         "images": [
           { "id": "npc-name-1", "prompt": "...", "ratio": "1:2", "url": "..." }
         ]
       }
     ]
   }
   ```
3. prompt 使用英文，占位图片可引用 `public/img/npc` 内资源。
