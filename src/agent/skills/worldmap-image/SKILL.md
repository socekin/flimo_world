---
name: worldmap-image
description: 根据故事设定生成 2.5D 俯视世界地图（单张图 + 描述）。
input_schema:
  type: object
  properties:
    world: { type: string }
    scenes:
      type: array
      items:
        type: object
    layoutImage: { type: string }
    instruction: { type: string }
  required: [world, scenes, layoutImage]
output_schema:
  type: object
  properties:
    url: { type: string }
    description: { type: string }
    prompt: { type: string }
    ratio: { type: string }
  required: [url]
---

# WorldMap Image Skill

## Instructions
1. 输入 world/situation/truth 与场景信息（environment images 名称/描述）。
2. 生成 1 张 2.5D 正交俯视地图，比例 1920x1080（约 16:9），风格参考示例 prompt。
3. 输出结构：
   ```json
   {
     "map": { "url": "...", "description": "...", "prompt": "...", "ratio": "1920x1080" }
   }
   ```
4. 需附带用户可阅读的地图描述（主要建筑/布置）。
