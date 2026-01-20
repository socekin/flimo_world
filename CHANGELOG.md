# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2025-11-18

#### Create · Story Step with Thinking UI

- **LLM 接入**: Story World Builder 与 NPC Designer 现在通过 OpenRouter → Gemini 2.5 Flash（reasoning 模式）顺序生成世界观与 NPC，返回结构化 JSON + 思考过程。
- **配置解耦**: 新增 `src/lib/llmClient.js` 及 `.env.local` 示例，使用 `VITE_OPENROUTER_*` 环境变量即可替换 API Key、模型或 reasoning token。
- **聊天管线 UI**: Create 左侧聊天窗展示 Codex 风格的步骤时间线：Thinking / Story World Builder / NPC Generating，用竖线串联、带动画、可展开/折叠的 reasoning 文本。
- **结果面板**: 右侧仅显示最终 world + NPC 卡片，隐藏中间占位内容，确保创作者看到的都是最终产出。
- **Story 卡片 UI**: 合并世界背景/情势/真相为单卡片、为各段与 NPC 属性添加矢量图标，提升可读性并贴合设计稿。
- **多轮编辑**: 输入框开放为多轮入口，新增 Story/NPC 编辑技能、意图识别与局部更新。创作者可以通过自然语言指定“重写整体”“修改城市”“调整某 NPC 目标”并得到对应的增量修改，Sample 卡片也支持一键触发示例创作。
- **Kling 图像管线**: 新增 `klingImageClient` 与环境/NPC 图像技能，使用 Kling API (AK/SK + JWT) 生成、编辑环境概念图与角色形象；Story Skill 现在输出 4 个关键场景供环境图引用，页面同步展示生成中的占位反馈。
- **多图像 Provider**: `src/lib/imageClient.js` 统一 Kling 与 Google Gemini 图像服务，并通过 `VITE_IMAGE_PROVIDER` + `VITE_GEMINI_*`/`VITE_KLING_*` 环境变量快速切换，技能层无需改动即可复用相同并发与占位逻辑。
- **Prompt-first 图像技能**: 环境/NPC 技能只负责产出 prompt 与结构化描述，尺寸、分辨率、并发等硬参数改由 provider 配置统一注入；NPC 立绘默认调整为 768×1024（3:4），保证 Gemini/Kling 结果一致。
- **Prompt 可视化**: Create Chat 中的 Environment Images / NPC Portraits（含编辑）节点折叠展示本轮所有图像的 prompt，方便快速复刻或微调占位提示。

### 2024-10-31

#### Create Page UX/UI Improvements

- **Fixed layout height issues**: Changed `/create` page to use full screen height with proper margins
  - Main container now uses `h-screen` instead of `min-h-screen` to prevent dynamic height changes
  - Left chat panel and right preview panel now maintain fixed heights equal to screen height minus margins
  - Content scrolls within fixed-height containers instead of expanding the page
  
- **Improved input field design**: Simplified the chat input in the left panel
  - Changed input from multi-line (2 rows) to single-line (1 row) for cleaner appearance
  - Updated alignment from `items-start` to `items-center` for perfect horizontal alignment with send button
  - Adjusted padding from `py-3` to `py-2.5` for better single-line proportions
  - Removed `min-h-[120px]` constraint for more compact design

- **Enhanced responsive behavior**
  - Desktop (lg+): Side-by-side layout with fixed widths and heights
  - Mobile: Stacked layout with each section taking available space
  - Both layouts now maintain consistent height regardless of content amount

**File Modified**: `src/pages/Create.jsx`

---

### 2025-10-25

- **Create 主页**: 重构输入框布局、发送按钮交互（Shift+Enter 提示、圆形箭头按钮）
- **Sample 卡片**: 缩小图片与角色预览尺寸，降低对比度强调"仅示例"属性
- **文本优化**: 调整标题行高与定位，避免渲染裁切；移除冗余副标题让焦点回到输入框

---

### 2025-10-24

- **Create 模式**: 登录页新增 "Create" 入口与 `/create` 路由，提供创作模式占位页面
- **创作主页**: 引入标题渐变、输入框发送按钮、Sample 示例，后续迭代中优化布局与 UX
- **Info 面板**: 重构左右布局，左侧全身照固定显示，右侧信息支持独立滚动并移除多余分割线
- **Chat 面板**: 修复聊天区滚动与输入框定位问题，确保聊天历史在固定区域滚动且输入框常驻底部
  - 新增 `public/_redirects` 以支持 Cloudflare Pages SPA 路由回退

---

### 2025-10-23

- **导航性能**: Worker 解析道路贴图改为一次性读取像素，大幅缩短 `/play?sim=1` 首次加载时间
- **寻路体验**: 主线程导航状态机缓存连通域并按真实帧间隔推进，NPC 匀速行走不再闪现
- **调试模式**: `?sim=1` 仅激活 Foss、Armistice、Hector，其他 NPC 保持静止
- **Story 页面**: Play 按钮直接跳转至 `/play?sim=1`，便于快速查看导航效果
- **字体**: 新增自托管 Web 字体 `BespokeSerif`（index.css 声明 + index.html preload），作为全局首选字体并提供中文与 Emoji 回退链
- **Play**: 引入前端 Web Worker 导航服务（解析 `/img/play/roads.png` 为网格并 A* 寻路）
  - 新增 `src/workers/navWorker.js`、`src/nav/WorkerNavService.js`、`src/nav/Navigator.js`、`src/components/DebugNavOverlay.jsx`
  - `?sim=1` 开关：随机游走（连续移动）
  - `?cover=1` 开关：Foss 覆盖走查（从起点行开始，上下交替扩展，Z 字形 + stride=4 采样，速度 400px/s）
  - 覆盖模式显示"采样网格 + roads.png 原图"叠加，便于核对道路解析是否正确
- **调试与稳定性**:
  - 网格采样：240×135，5×5 子采样（≥20% 命中）；阈值 A>40,R>180,G<80,B<80
  - 起点吸附半径增至 32；Worker 初始化与覆盖启动采用"双保"避免竞态
  - 控制台打印网格统计与关键步骤日志（grid ready / snap）

---

### 2025-10-22

- **新增 Play 页面**:
  - 顶部透明导航栏（实时钟表、PlayTime 显示为 `Xmin Ys`、Events 开关）
  - 右侧 Events 悬浮面板（默认打开，可切换，分组按分钟聚合，时间标题吸顶）
  - 地图与 NPC 圆形头像标记（48px，object-cover，选中高亮）
  - 底部紧凑 HUD（选中 NPC 显示头像与三个操作：事件、对话、信息）
  - Info 面板（居中悬浮、70%宽、Esc/遮罩/右上角关闭，信息与 Story 页面一致）
  - NPC Event 面板（居中悬浮、70%宽，事件时间线、参与者头像、视频预览及整面板播放）
  - Foss 地图位置多次上移，当前 `yPct=56`
  - HUD 第一个"事件"按钮图标与事件面板统一
  
- **资源与数据**:
  - 区分 Story 用全身照与 Play 用小头像 `avatarMap`
  - 新增 `npcPositions.js`（地图坐标）与示例 `npcEvents.js`（角色事件）
  - Foss 两条事件接入视频与封面 `/public/video/*.mp4|*.png`
  
- **交互与修复**:
  - Events 面板上下边距与导航对齐、支持点击面板开启
  - Time 分组使用 `MM-DD HH:mm`，滚动吸顶
  - Info/Event 打开时隐藏 HUD，自动收起右侧 Events
  - 播放视图整面板覆盖、原生 controls、关闭返回列表
  - Play 页面默认选中 Foss
  
- **面板视觉**:
  - Chat/Info/Events 三个面板的 NPC 全身照统一为 100% 比例
  
- **Chat 面板**:
  - 左侧头像与名称居中
  - 右侧对话更紧凑（更小字体、更小内边距、减少条目间距）
  - 头像样式与 HUD 保持一致（圆形裁剪、object-cover）
  
- **Story 页面**: 更新故事介绍文案
