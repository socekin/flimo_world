# 智能 NPC 后端服务 - API 使用指南 (V8)

本文档描述了 NPC 后端服务的 API 接口调用规范。

## 核心概念

1.  **游戏时间 (Game Time)**
    *   所有涉及状态变更的接口都需要前端传入 `current_time` (字符串, 推荐格式 "Day X, HH:mm")。

2.  **聊天历史 (Chat History)**
    *   **`active_chat`**: 当前活跃的用户对话记录 (Raw Messages)。
    *   **`user_chat_history`**: 用户对话总结归档 (V8: 包含 `chat_id` 用于查询详情)。
    *   **`npc_chat_history`**: NPC 互动对话总结归档 (自动生成)。

3.  **记忆 (Memories)**
    *   `memories` 列表存储 NPC 的关键记忆，以简短字符串形式记录。

---

## 1. 初始化世界会话 (Initialize)
**接口**: `POST /sessions`

**请求**: `{ "current_time": "...", "world_setting": "...", "locations": [...], "npcs": [...] }`

**响应**:
```json
{
  "session_id": "uuid",
  "initial_states": {
    "npc_id": {
      "current_location": "<前端传入的初始位置>",
      "behavior": {
        "target_location": "<可能与current_location相同或不同>",
        "action": "...",
        "status": "ONGOING",
        "start_time": "...",
        "end_time": null
      }
    }
  }
}
```
> 行为生成逻辑会结合 NPC 设定和 `current_location` 判断是否留在原地（`target_location` 可与 `current_location` 相同）。

---

## 2. 上报移动状态 (Move)
**接口**: 
1) `POST /sessions/{session_id}/npcs/{npc_id}/move/start`  
   将 `current_location` 标记为 `"moving"`（表示正在路上）。  
   **请求**: `{ "current_time": "..." }`（可选）
   **响应**: `{ "npc_id": "...", "current_location": "moving" }`

2) `POST /sessions/{session_id}/npcs/{npc_id}/move/arrive`  
   抵达后更新当前位置，并归档当前行为。  
   **请求**: `{ "location": "...", "current_time": "..." }`
   **响应**: `{ "npc_id": "...", "current_location": "..." }`

> 当 `current_location` 为 `"moving"` 时，Think/Chat 会将其视为“在路上”的上下文。

---

## 3. 主动思考 (Think)
**接口**: `POST /sessions/{session_id}/npcs/{npc_id}/think`
**请求**: `{ "current_time": "..." }`
**响应**: `{ "npc_id": "...", "behavior": {...} }`

---

## 4. 触发 NPC 互动 (Interact)
**接口**: `POST /sessions/{session_id}/interact`
**请求**: `{ "current_time": "...", "initiator_id": "...", "target_id": "..." }`
**响应**: `{ "should_interact": true, "topic": "...", "dialogue": [...], "behavior_updates": {...} }`

---

## 5. 用户对话 (Chat)
**接口**: `POST /sessions/{session_id}/chat`
**请求**: `{ "current_time": "...", "npc_id": "...", "user_message": "..." }`
**响应**: `{ "npc_reply": "...", "action_update": "...", "behavior_update": null }`

---

## 5.1 NPC 主动开场白 (Chat Open)
**接口**: `POST /sessions/{session_id}/npcs/{npc_id}/chat/open`

**描述**: 用于“进入与该 NPC 的聊天界面时”，让 NPC **仅在当前 `active_chat` 为空**时主动说一句开场白；如果 `active_chat` 非空，则不生成新话术（避免重复进入页面导致刷屏），前端应直接渲染已加载的历史消息。

**请求**: `{ "current_time": "..." }`

**响应**:
- 首次开场（`active_chat` 为空）：
  `{ "opened": true, "npc_reply": "...", "action_update": "...", "behavior_update": null }`
- 非首次开场（`active_chat` 非空）：
  `{ "opened": false, "npc_reply": null, "action_update": null, "behavior_update": null }`

---

## 6. 结束并归档用户对话 (Close Chat)
**接口**: `POST /sessions/{session_id}/npcs/{npc_id}/chat/close`
**请求**: `{ "current_time": "..." }`
**响应**: `{ "npc_id": "...", "chat_id": "uuid", "summary": "...", "status": "archived" }` (V8: 返回 `chat_id`)

---

## 7. 触发世界事件 (Event)
**接口**: `POST /sessions/{session_id}/events`
**请求**: `{ "event_description": "...", "target_location": "..." }`

---

## 8. 查询 NPC 详情 (Get NPC)
**接口**: `GET /sessions/{session_id}/npcs/{npc_id}`

**响应示例 (V8)**:
```json
{
  "id": "npc_eli",
  "name": "Eli Watkins",
  "profile": { ... },
  "current_location": "主街",  // 在路上时可能为 "moving"
  "behavior": { ... },

  "active_chat": [ {"role": "user", "content": "..."}, {"role": "npc", "content": "..."} ],

  "user_chat_history": [
    {
      "chat_id": "uuid-string",
      "summary": "早上玩家询问了金库的事情。",
      "topic": "金库传闻",
      "start_time": "Day 1, 08:00 AM",
      "end_time": "Day 1, 08:05 AM"
    }
  ],

  "npc_chat_history": [
    { "summary": "与警长讨论了治安问题。", "topic": "治安问题", "other_npc": "Marcus Doyle", "start_time": "..." }
  ],

  "behavior_history": [ ... ],
  "memories": [ "与玩家讨论了金库传闻。", "与 Marcus Doyle 讨论了治安问题。" ]
}
```
> **Note**: 完整对话消息需通过 `GET /chat/{chat_id}` 接口获取，本接口仅返回摘要信息。

---

## 9. [NEW] 获取用户对话详情 (Get Chat Details)
**接口**: `GET /sessions/{session_id}/npcs/{npc_id}/chat/{chat_id}`
**描述**: 根据 `chat_id` 获取该对话会话的**完整原始消息记录**。

**响应示例**:
```json
{
  "chat_id": "uuid-string",
  "topic": "金库传闻",
  "start_time": "Day 1, 08:00 AM",
  "end_time": "Day 1, 08:05 AM",
  "messages": [
    {"role": "user", "content": "你听说金库的事了吗？"},
    {"role": "npc", "content": "嘘！别在这里说！"},
    {"role": "user", "content": "到底是怎么回事？"},
    {"role": "npc", "content": "我只知道那天晚上..."}
  ]
}
```

---

## 示例：双 NPC 场景完整调用
故事背景：西岭镇刚发生爆炸案，巡查官来到镇上。NPC 包含警长 Marcus Doyle 和酒馆老板 Maeve Alcott。

**1) 初始化**
请求：
```json
POST /sessions
{
  "current_time": "Day 1, 08:00 AM",
  "world_setting": "西岭镇遭遇爆炸案调查",
  "locations": ["警局", "酒馆", "教堂", "马厩", "市政大厅"],
  "npcs": [
    {
      "id": "npc_marcus",
      "name": "Marcus Doyle",
      "current_location": "警局",
      "profile": { "role": "警长", "trait": "强势", "goal": "主导调查" }
    },
    {
      "id": "npc_maeve",
      "name": "Maeve Alcott",
      "current_location": "酒馆",
      "profile": { "role": "酒馆老板", "trait": "谨慎", "goal": "保护店铺和情报来源" }
    }
  ]
}
```
响应：
```json
{
  "session_id": "sess-123",
  "initial_states": {
    "npc_marcus": {
      "current_location": "警局",
      "behavior": {
        "target_location": "警局",
        "action": "整理爆炸案卷宗，召集警员分头摸排线索。",
        "status": "ONGOING",
        "start_time": "Day 1, 08:00 AM",
        "end_time": null
      }
    },
    "npc_maeve": {
      "current_location": "酒馆",
      "behavior": {
        "target_location": "酒馆",
        "action": "擦拭吧台，留意巡查官行踪，提醒常客少聊爆炸案细节。",
        "status": "ONGOING",
        "start_time": "Day 1, 08:00 AM",
        "end_time": null
      }
    }
  }
}
```

**2) 上报移动（Marcus 从警局出发）**
```json
POST /sessions/sess-123/npcs/npc_marcus/move/start
{ "current_time": "Day 1, 08:15 AM" }
```
响应：`{ "npc_id": "npc_marcus", "current_location": "moving" }`

**3) 抵达地点（Marcus 到教堂）**
```json
POST /sessions/sess-123/npcs/npc_marcus/move/arrive
{ "location": "教堂", "current_time": "Day 1, 08:25 AM" }
```
响应：`{ "npc_id": "npc_marcus", "current_location": "教堂" }`

**4) Think（Marcus）**
```json
POST /sessions/sess-123/npcs/npc_marcus/think
{ "current_time": "Day 1, 08:26 AM" }
```
响应：
```json
{
  "npc_id": "npc_marcus",
  "behavior": {
    "target_location": "马厩",
    "action": "询问马夫是否有人深夜借马离开，记录可疑行迹。",
    "status": "ONGOING",
    "start_time": "Day 1, 08:26 AM",
    "end_time": null
  }
}
```

**5) Chat（与 Maeve 对话，触发行为更新）**
```json
POST /sessions/sess-123/chat
{
  "current_time": "Day 1, 08:30 AM",
  "npc_id": "npc_maeve",
  "user_message": "昨晚爆炸前有陌生人来过吗？"
}
```
响应：
```json
{
  "npc_reply": "有个陌生人点了杯酒就走，我没看清脸，但他鞋子沾了煤灰。",
  "action_update": "低声提醒常客别提巡查官。",
  "behavior_update": {
    "target_location": "教堂",
    "action": "把线索告诉牧师，请他留意可疑信徒。",
    "status": "ONGOING",
    "start_time": "Day 1, 08:30 AM",
    "end_time": null
  }
}
```

**6) Close Chat（归档 Maeve 对话）**
```json
POST /sessions/sess-123/npcs/npc_maeve/chat/close
{ "current_time": "Day 1, 08:32 AM" }
```
响应：
```json
{
  "npc_id": "npc_maeve",
  "chat_id": "chat-001",
  "summary": "玩家询问陌生人，Maeve 描述鞋上有煤灰的可疑客人，并决定通知牧师。",
  "status": "archived"
}
```

**7) Get NPC（查看 Maeve 状态）**
```json
GET /sessions/sess-123/npcs/npc_maeve
```
响应要点：
```json
{
  "id": "npc_maeve",
  "current_location": "酒馆",
  "behavior": {
    "target_location": "教堂",
    "action": "把线索告诉牧师，请他留意可疑信徒。",
    "status": "ONGOING",
    "start_time": "Day 1, 08:30 AM",
    "end_time": null
  },
  "user_chat_history": [
    {
      "chat_id": "chat-001",
      "summary": "玩家询问陌生人，Maeve 描述鞋上有煤灰的可疑客人，并决定通知牧师。",
      "topic": "爆炸案可疑客人",
      "start_time": "Day 1, 08:30 AM",
      "end_time": "Day 1, 08:32 AM"
    }
  ],
  "active_chat": [],
  "npc_chat_history": [],
  "behavior_history": [ ... ],
  "memories": [ ... ]
}
```

**8) Get Chat Details**
```json
GET /sessions/sess-123/npcs/npc_maeve/chat/chat-001
```
响应要点：
```json
{
  "chat_id": "chat-001",
  "topic": "爆炸案可疑客人",
  "start_time": "Day 1, 08:30 AM",
  "end_time": "Day 1, 08:32 AM",
  "messages": [
    { "role": "user", "content": "昨晚爆炸前有陌生人来过吗？" },
    { "role": "npc", "content": "有个陌生人点了杯酒就走，我没看清脸，但他鞋子沾了煤灰。" }
  ]
}
```

**9) Event（注入世界事件）**
```json
POST /sessions/sess-123/events
{
  "event_description": "马厩发现被撬的痕迹",
  "target_location": "马厩"
}
```
响应：`{ "status": "ok", "message": "Event recorded", "affected_npcs": ["npc_marcus"] }`

**10) Interact（NPC 互动检查）**
```json
POST /sessions/sess-123/interact
{
  "current_time": "Day 1, 08:40 AM",
  "initiator_id": "npc_marcus",
  "target_id": "npc_maeve",
  "context": "在教堂门口相遇"
}
```
响应示例：
```json
{
  "should_interact": true,
  "topic": "爆炸案线索交换",
  "dialogue": [
    { "speaker": "Marcus Doyle", "text": "你提到的煤灰客人是什么情况？" },
    { "speaker": "Maeve Alcott", "text": "他匆匆离开，鞋子像刚踩过煤堆，我已经提醒牧师留意了。" }
  ],
  "behavior_updates": {
    "npc_marcus": {
      "target_location": "马厩",
      "action": "带队回马厩封锁可疑脚印。",
      "status": "ONGOING",
      "start_time": "Day 1, 08:40 AM",
      "end_time": null
    }
  }
}
```
