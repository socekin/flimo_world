# 快速批量更新剩余 Edit Skills 的 Schema
# 为所有 *-edit/ SKILL.md 添加基础 schema 定义

## 通用 Edit Skill Schema 模板

所有编辑类 Skill 遵循相同模式：

### Input Schema
```yaml
input_schema:
  type: object
  properties:
    currentData: { type: [object, array] }
    instruction: { type: string }
  required: [currentData, instruction]
```

### Output Schema
根据具体 Skill 类型返回修改后的数据结构
