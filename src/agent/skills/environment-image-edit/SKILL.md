---
name: environment-image-edit
description: 根据创作者的编辑指令重新生成环境概念图
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
      type: [string, "null"]
      description: 隐藏真相
    scenes:
      type: array
      description: 场景列表
      items:
        type: object
        properties:
          name: { type: string }
          description: { type: string }
    instruction:
      type: string
      description: 创作者的编辑指令
    currentImages:
      type: array
      description: 当前环境图片列表（可选）
      items:
        type: object
        properties:
          url: { type: string }
    targetImageIndex:
      type: [integer, "null"]
      description: 指定编辑的图片索引（0-based），如果为 null 则重新生成全部
  required: [instruction]
output_schema:
  type: object
  properties:
    images:
      type: array
      description: 生成的环境图片列表
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

# Environment Image Edit Skill

根据创作者指令编辑或重新生成环境概念图。

## Instructions
1. 输入包含 `instruction`（必填）以及可选的 `currentImages` 和 `targetImageIndex`。
2. 如果指定 `targetImageIndex`，仅重新生成该索引的图片；否则重新生成全部。
3. 输出结构与初次生成相同，包含 `images` 数组。
4. 用于 Story 阶段的增量更新或重新生成。
