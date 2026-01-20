---
name: worldmap-layout
description: 生成包含地点和道路的地图布局示意图
input_schema:
  type: object
  properties:
    world: { type: string }
    scenes:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          description: { type: string }
    environmentImages:
      type: array
      items: { type: object }
    instruction: { type: string }
  required: [world, scenes]
output_schema:
  type: object
  properties:
    layoutUrl: { type: string }
    prompt: { type: string }
    reasoning: { type: string }
  required: [layoutUrl]
---

# WorldMap Layout Skill

生成包含地点和道路的地图布局示意图。

## 输入
- world: 世界设定
- situation: 故事背景
- truth: 真相
- scenes: 场景列表（至少4个）
- environmentImages: 环境图（可选）

## 输出
- layoutImage: 布局图片 URL
- prompt: 生成提示词
- reasoning: 生成说明

## 布局规则
- 蓝色矩形：标记地点
- 红色线条：标记道路
- 背景：白色或浅灰色
