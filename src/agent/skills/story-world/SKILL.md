---
name: story-world-builder
description: 生成故事世界背景、当前情势、隐藏真相与 4 个关键场景；当创作者提供灵感或主题需要建立基础设定时调用。
allowed-tools: []
input_schema:
  type: object
  properties:
    prompt:
      type: string
      description: 创作者提供的故事灵感、时间地点、主题约束
  required: [prompt]
output_schema:
  type: object
  properties:
    world:
      type: string
      description: 世界背景设定（地点/时代/权力结构）
    situation:
      type: string
      description: 当前紧张局势或事件引子
    truth:
      type: [string, "null"]
      description: 隐藏真相（如果有阴谋或隐藏动机）
    scenes:
      type: array
      description: 4个关键场景
      items:
        type: object
        properties:
          name: { type: string }
          description: { type: string }
    reasoning:
      type: string
      description: LLM 思考过程
  required: [world, situation, scenes]
---

# Story World Builder

## Instructions
1. 阅读用户提供的故事灵感、时间地点、主题约束。
2. 产出以下结构：
   - **world**：地点/时代/权力结构等背景描述。
   - **situation**：当下的紧张局势或事件引子。
   - **truth**（可选）：只有当用户输入暗示阴谋或隐藏动机时才输出，其他情况下填 `null`。
   - **scenes**：4 个关键场景数组，每个元素包含 `{ name, description }`，用于环境图生成。
3. 输出严格 JSON，不要包裹额外文本；以中文回答，单段不超过 150 字。
4. 结果将被传递给 NPC Designer Skill 和 Environment Image Skill，确保 `world`、`situation`、`truth` 与 `scenes` 语义完整。

## Examples
- 用户提及“边境小镇、金库危机、巡查官”→ 衍生西部风格小镇背景，NPC 包含镇长、警长、酒馆老板等。
- 用户提供新的地区或主题时，先在世界背景中建立场景，再映射 NPC。
