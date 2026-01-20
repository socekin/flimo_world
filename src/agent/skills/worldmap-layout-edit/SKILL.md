---
name: worldmap-layout-edit
description: 基于现有 layout 进行编辑（增删建筑、修改道路）
input_schema:
  type: object
  properties:
    currentLayout:
      type: object
      description: 当前布局图信息
      properties:
        layoutImage: { type: string }
        layoutUrl: { type: string }
        prompt: { type: string }
    instruction:
      type: string
      description: 用户编辑指令（如"增加一个学校"）
  required: [currentLayout, instruction]
output_schema:
  type: object
  properties:
    layoutImage:
      type: string
      description: 编辑后的布局图片 URL
    prompt:
      type: string
      description: 生成时使用的提示词
    callId:
      type: string
      description: API 调用 ID
    ratio:
      type: string
      description: 图片比例
    reasoning:
      type: string
      description: 编辑说明
  required: [layoutImage]
---

# WorldMap Layout Edit Skill

基于现有地图布局进行编辑。

## Instructions
1. 输入包含 `currentLayout`（当前布局图信息）和 `instruction`（编辑指令）。
2. 保持原有布局风格（蓝色矩形=地点，红色线条=道路）。
3. 仅修改用户明确要求的部分。
4. 输出编辑后的布局图片 URL 和相关信息。

## 编辑类型
- 增加/删除建筑或地点
- 修改道路路径或连接
- 移动地点位置

## 布局规则
- 蓝色实心矩形 (#0000FF)：标记地点/建筑
- 红色粗线条 (#FF0000)：标记道路
- 所有蓝色地点需与最近的红色道路相连
- 背景保持白色或浅灰色
- 比例 16:9
