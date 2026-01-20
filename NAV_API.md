# Nav_API 文档

一个轻量级的地图导航 API 服务，支持 A* 寻路算法，可用于游戏开发、NPC 行动轨迹等场景。

## ✨ 功能特性

- 🗺️ **World 管理** - 上传地图和路径图片，创建导航世界
- 📍 **Location 标记** - 可视化标记地点，支持矩形区域选择
- 🚀 **路径计算** - A* 算法计算两地点间最优路径
- 🎮 **导航演示** - 内置演示页面，可视化验证路径计算

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 构建并启动服务
docker-compose up --build -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

服务启动后访问：
- **管理后台**: http://localhost:8000/admin/
- **导航演示**: http://localhost:8000/demo/
- **API 文档**: http://localhost:8000/docs

### 本地开发

```bash
# 1. 安装依赖
cd backend
pip install -r requirements.txt

# 2. 启动服务
cd ..
uvicorn backend.main:app --reload --port 8000
```

## 📖 API 文档

### World 管理

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/worlds` | 获取所有 Worlds |
| `POST` | `/api/worlds` | 创建 World（上传图片，可选批量创建 Location）|
| `GET` | `/api/worlds/{id}` | 获取单个 World |
| `DELETE` | `/api/worlds/{id}` | 删除 World |

### 静态图片访问

获取 World 的地图图片，用于 Play 模式显示。

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/assets/worlds/{world_id}/map.jpg` | 返回地图底图 |
| `GET` | `/assets/worlds/{world_id}/worldpath.jpg` | 返回路径图 |

**示例：**

```
# 获取地图底图
GET http://localhost:8000/assets/worlds/5fa7f948-ee3b-416a-90fa-25509ddf35e0/map.jpg

# 获取路径图
GET http://localhost:8000/assets/worlds/5fa7f948-ee3b-416a-90fa-25509ddf35e0/worldpath.jpg
```

> 💡 **提示**：`world_id` 可通过 `GET /api/worlds` 或创建 World 时的响应获取。

#### 创建 World 详情 (POST)

支持 `multipart/form-data` 格式上传：

- `name`: (String) 世界名称
- `map_file`: (File) 底图图片 (map.jpg)
- `worldpath_file`: (File) 路径定义图片 (worldpath.jpg)
- `locations_json`: (String, Optional) 初始地点列表的 JSON 字符串。格式示例：
  `[{"name": "Bank", "top_left_x": 100, "top_left_y": 100, "bottom_right_x": 150, "bottom_right_y": 150}]`

**cURL 示例：**

```bash
curl -X POST http://localhost:8000/api/worlds \
  -F "name=MyWorld" \
  -F "map_file=@map.jpeg" \
  -F "worldpath_file=@worldpath.jpeg" \
  -F 'locations_json=[{"name":"Bank","top_left_x":100,"top_left_y":100,"bottom_right_x":150,"bottom_right_y":150}]'
```

### Location 管理

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/worlds/{id}/locations` | 获取 World 的所有 Locations |
| `POST` | `/api/worlds/{id}/locations` | 添加 Location |
| `PUT` | `/api/worlds/{id}/locations/{loc_id}` | 更新 Location |
| `DELETE` | `/api/worlds/{id}/locations/{loc_id}` | 删除 Location |

### 导航 API

```http
POST /api/navigate
Content-Type: application/json

{
  "world_id": "uuid-xxx",
  "from_location": "银行",
  "to_location": "酒馆"
}
```

响应示例：

```json
{
  "success": true,
  "from_location": { "name": "银行", "center": {"x": 150, "y": 200} },
  "to_location": { "name": "酒馆", "center": {"x": 400, "y": 350} },
  "path": [{"x": 150, "y": 200}, {"x": 155, "y": 205}, ...],
  "path_length": 245,
  "distance": 285.5
}
```

#### 起点为任意坐标 → 终点为 Location

```http
POST /api/navigate/from-coord
Content-Type: application/json

{
  "world_id": "uuid-xxx",
  "from_x": 420,
  "from_y": 300,
  "to_location": "酒馆"
}
```

响应与上面类似，`from` 字段返回吸附后的起点坐标。

## 🎨 路径图片规则

路径图片 (`worldpath.jpg`) 用于定义可行走区域：

- **红色区域** (R>150, G<100, B<100) → 道路，可行走
- **蓝色区域** (B>150, R<100, G<100) → 建筑，可行走
- **其他颜色** → 障碍物，不可行走

## 📁 项目结构

```
worldnav/
├── backend/
│   ├── main.py          # FastAPI 入口
│   ├── models.py        # 数据模型
│   ├── database.py      # 数据库配置
│   ├── pathfinder.py    # A* 寻路算法
│   └── routes/          # API 路由
├── frontend/
│   ├── admin/           # 管理后台
│   └── demo/            # 导航演示
├── data/                # 数据存储（Docker volume）
├── Dockerfile
└── docker-compose.yml
```

## 🔧 技术栈

- **后端**: Python, FastAPI, SQLAlchemy, SQLite
- **前端**: Vanilla HTML/CSS/JavaScript
- **算法**: A* Pathfinding
- **部署**: Docker
