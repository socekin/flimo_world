---
name: story-scene-add
---

# story-scene-add

## 功能
根据世界观和用户指令生成单个新场景。

## 输入参数
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| world | object | ✅ | 当前世界观设定 |
| instruction | string | ✅ | 用户对新场景的描述 |
| existingSceneNames | string[] | ✅ | 已存在的场景名（避免重名） |

## 输出
```json
{
  "scene": {
    "name": "场景名",
    "description": "场景描述"
  }
}
```
