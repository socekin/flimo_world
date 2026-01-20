---
name: mystery-player-view
description: 从创作者版本 NPC 生成用户可见版本（不剧透）
---

# mystery-player-view

## 功能
将完整的 NPC 数据转换为玩家可见版本，移除所有剧透内容。

## 输入参数
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| npcs | array | ✅ | 完整版 NPC 数组 |
| worldPlayer | object | ✅ | 玩家版世界观 |

## 输出
用户可见的 NPC 数组：
```json
{
  "id": "npc_id",
  "name": "角色名",
  "role": "表面角色",
  "description": "外观描述（不含动机）",
  "age": 35,
  "gender": "Male",
  "goal": "表面目标",
  "carry_with": ["可见物品"],
  "recent_events": "可观察的近期行为",
  "short_term_plan": "表面计划",
  "social_network": { "other_npc_id": "简单关系" }
}
```
