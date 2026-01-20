---
name: worldmap-image-edit
description: 编辑并重生成 WorldMap 俯视图（支持布局更新或风格修改）
input_schema:
  type: object
  properties:
    currentWorldmap:
      type: object
      description: 当前世界地图信息
      properties:
        url: { type: string }
        layoutUrl: { type: string }
        description: { type: string }
    layoutImage:
      type: string
      description: 布局图片 URL（用于 layout 编辑路径）
    instruction:
      type: string
      description: 创作者的编辑指令
    editType:
      type: string
      enum: [layout, style]
      description: 编辑类型，layout=布局更新，style=风格修改
  required: [currentWorldmap, instruction]
output_schema:
  type: object
  properties:
    map:
      type: object
      description: 重新生成的地图信息
      properties:
        url: { type: string }
        prompt: { type: string }
        description: { type: string }
        ratio: { type: string }
        callId: { type: string }
        reasoning: { type: string }
  required: [map]
---

# WorldMap Image Edit Skill

编辑并重生成 WorldMap 俯视图。

## Instructions
1. 输入现有 worldmap、可选的 layoutImage 与用户编辑指令。
2. 根据 `editType` 选择编辑路径：
   - `layout`：基于新 layout 重新生成地图结构
   - `style`：保持布局不变，仅修改视觉风格
3. 保持 2.5D 正交俯视风格，比例 16:9。
4. 输出结构：`{ map: { url, description, prompt, ratio, callId, reasoning } }`

## 编辑类型说明
- **layout 编辑**：当建筑增删、道路改变时使用，需要传入新的 layoutImage
- **style 编辑**：当仅修改颜色、风格、时间等视觉效果时使用
