---
name: mystery-npc
description: 生成解谜类故事的 NPC（含 breaking_point, persona）
---

# mystery-npc

## 功能
根据世界观生成解谜类故事的 NPC，包含完整的推理机制字段（breaking_point, persona）。

## 输入参数
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| worldSystem | object | ✅ | 创作者版本的世界观 |
| count | number | ❌ | NPC 数量（默认 4-6） |

## 输出
NPC 数组，每个 NPC 包含：

```json
{
  "id": "snake_case_id",
  "name": "角色名",
  "current_location": "当前位置",
  "profile": {
    "role": "角色定位",
    "description": "完整描述（含隐藏动机）",
    "age": 35,
    "gender": "Male/Female",
    "goal": "真实目标",
    "breaking_point": {
      "trigger_concepts": ["触发概念1", "触发概念2"],
      "logic": "崩溃逻辑说明",
      "reaction": "崩溃时的反应",
      "confession_content": "供词内容"
    },
    "carry_with": ["随身物品"],
    "recent_events": "近期事件",
    "short_term_plan": "短期计划",
    "social_network": {
      "other_npc_id": "关系说明"
    },
    "persona": {
      "voice": {
        "register": "语气风格",
        "addressing_user": "称呼玩家",
        "quirks": ["口癖"],
        "sample_phrases": ["示例台词"]
      },
      "public_stance": "公开立场",
      "what_i_will_volunteer": ["主动透露的信息"],
      "what_i_wont_say": "绝不透露的内容",
      "common_lies": ["常用谎言"]
    }
  }
}
```
