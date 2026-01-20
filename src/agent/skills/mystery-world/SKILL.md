---
name: mystery-world
description: 生成解谜类故事的世界观（创作者版本 + 玩家版本）
---

# mystery-world

## 功能
根据用户描述生成解谜类故事的世界观，包含创作者版本（完整真相）和玩家版本（不剧透）。

## 输入参数
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| prompt | string | ✅ | 用户的故事描述 |
| instruction | string | ❌ | 额外指令 |

## 输出
```json
{
  "system": {
    "world": "完整世界背景",
    "situation": "真实情势",
    "truth": "隐藏真相",
    "scenes": [{ "name": "", "description": "" }]
  },
  "player": {
    "world": "玩家可见的世界背景",
    "situation": "玩家可见的情势（不剧透）",
    "scenes": [{ "name": "", "description": "" }]
  }
}
```
