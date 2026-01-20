import { runSkill } from '../skills/registry';
import { executeWithRetry } from '../skills/executor';

/**
 * Story Orchestrator - 统一管理所有 Story 创作相关的 Skill 执行
 * 
 * 职责：
 * 1. 管理创作流程状态 (world, npcs, images, worldmap)
 * 2. 协调多个 Skill 的执行顺序
 * 3. 支持并行执行以提升性能
 * 4. 提供进度回调和错误处理
 * 5. 记录执行历史
 */
export class StoryOrchestrator {
    constructor() {
        this.state = {
            world: null,
            npcs: [],
            environmentImages: [],
            npcImageMap: {},
            layout: null,
            worldmap: null,
            // 解谜类故事：玩家版数据
            worldPlayer: null,
            npcsPlayer: [],
            // WorldNav 导航服务
            locationMarkers: [],   // 地点标注 [{id, name, x1, y1, x2, y2}]
            navWorldId: null       // 同步到 Nav API 后的 World ID
        };
        this.history = [];
        this.listeners = [];
    }

    /**
     * 创建完整的故事（世界观 → NPC → 图片）
     * @param {string} prompt - 用户输入的创作提示
     * @param {object} callbacks - 回调函数 { onProgress, onError }
     * @returns {Promise<object>} 完整的故事状态
     */
    async createStory(prompt, callbacks = {}) {
        try {
            // Step 1: 生成世界观
            callbacks.onProgress?.({
                step: 'world',
                status: 'running',
                skillId: 'story-world-builder'
            });

            const world = await this.runSkill('story-world-builder', { prompt });
            this.state.world = world;
            this.notifyListeners({ type: 'state-update', step: 'world' });

            callbacks.onProgress?.({
                step: 'world',
                status: 'success',
                skillId: 'story-world-builder',
                data: world
            });

            // Step 2: 生成 NPC
            callbacks.onProgress?.({
                step: 'npc',
                status: 'running',
                skillId: 'story-npc-designer'
            });

            const npcResult = await this.runSkill('story-npc-designer', {
                prompt,
                world
            });
            this.state.npcs = npcResult.npcs;
            this.notifyListeners({ type: 'state-update', step: 'npc' });

            callbacks.onProgress?.({
                step: 'npc',
                status: 'success',
                skillId: 'story-npc-designer',
                data: npcResult
            });

            // Step 3: 并行生成环境图和 NPC 图
            callbacks.onProgress?.({
                step: 'images',
                status: 'running',
                skillId: 'parallel-image-generation'
            });

            const [envImages, npcImages] = await Promise.all([
                this.runSkill('environment-image', {
                    world: world.world,
                    situation: world.situation,
                    truth: world.truth,
                    scenes: world.scenes
                }),
                this.runSkill('npc-image', {
                    npcs: this.state.npcs
                })
            ]);

            // 防御性检查：确保结果存在
            this.state.environmentImages = envImages?.images || [];
            this.state.npcImageMap = this.buildNpcImageMap(npcImages?.results || []);
            this.notifyListeners({ type: 'state-update', step: 'images' });

            // 日志输出用于调试
            console.log('[StoryOrchestrator] 环境图生成结果:', this.state.environmentImages.length, '张');
            console.log('[StoryOrchestrator] NPC图生成结果:', Object.keys(this.state.npcImageMap).length, '位');

            callbacks.onProgress?.({
                step: 'images',
                status: 'success',
                skillId: 'parallel-image-generation',
                data: {
                    environmentImages: this.state.environmentImages,
                    npcImageMap: this.state.npcImageMap
                }
            });

            return this.state;

        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 创建解谜类故事（双版本：创作者版 + 玩家版）
     * @param {string} prompt - 用户输入的创作提示
     * @param {object} callbacks - 回调函数 { onProgress, onError }
     * @returns {Promise<object>} 完整的故事状态
     */
    async createMysteryStory(prompt, callbacks = {}) {
        try {
            // Step 1: 生成双版本世界观
            callbacks.onProgress?.({
                step: 'world',
                status: 'running',
                skillId: 'mystery-world'
            });

            const worldResult = await this.runSkill('mystery-world', { prompt });
            this.state.world = worldResult.system;
            this.state.worldPlayer = worldResult.player;
            this.notifyListeners({ type: 'state-update', step: 'world' });

            callbacks.onProgress?.({
                step: 'world',
                status: 'success',
                skillId: 'mystery-world',
                data: worldResult
            });

            // Step 2: 生成完整版 NPC（含 breaking_point, persona）
            callbacks.onProgress?.({
                step: 'npc',
                status: 'running',
                skillId: 'mystery-npc'
            });

            const npcResult = await this.runSkill('mystery-npc', {
                worldSystem: worldResult.system,
                count: 5
            });
            this.state.npcs = npcResult.npcs;
            this.notifyListeners({ type: 'state-update', step: 'npc' });

            callbacks.onProgress?.({
                step: 'npc',
                status: 'success',
                skillId: 'mystery-npc',
                data: npcResult
            });

            // Step 3: 生成玩家版 NPC（从完整版转换）
            callbacks.onProgress?.({
                step: 'npc-player',
                status: 'running',
                skillId: 'mystery-player-view'
            });

            const playerViewResult = await this.runSkill('mystery-player-view', {
                npcs: this.state.npcs,
                worldPlayer: worldResult.player
            });
            this.state.npcsPlayer = playerViewResult.playerNpcs;
            this.notifyListeners({ type: 'state-update', step: 'npc-player' });

            callbacks.onProgress?.({
                step: 'npc-player',
                status: 'success',
                skillId: 'mystery-player-view',
                data: playerViewResult
            });

            // Step 3.5: 生成玩家版故事摘要
            callbacks.onProgress?.({
                step: 'story-summary',
                status: 'running',
                skillId: 'story-summary'
            });

            const summaryResult = await this.runSkill('story-summary', {
                world: worldResult.system.world,
                situation: worldResult.system.situation,
                truth: worldResult.system.truth
            });

            // 将摘要存入 worldPlayer
            this.state.worldPlayer = {
                ...this.state.worldPlayer,
                summary: summaryResult.summary
            };
            this.notifyListeners({ type: 'state-update', step: 'story-summary' });

            callbacks.onProgress?.({
                step: 'story-summary',
                status: 'success',
                skillId: 'story-summary',
                data: summaryResult
            });

            // Step 4: 并行生成图片
            callbacks.onProgress?.({
                step: 'images',
                status: 'running',
                skillId: 'parallel-image-generation'
            });

            const [envImages, npcImages] = await Promise.all([
                this.runSkill('environment-image', {
                    world: worldResult.system.world,
                    situation: worldResult.system.situation,
                    truth: worldResult.system.truth,
                    scenes: worldResult.system.scenes
                }),
                this.runSkill('npc-image', {
                    npcs: this.state.npcs
                })
            ]);

            this.state.environmentImages = envImages?.images || [];
            this.state.npcImageMap = this.buildNpcImageMap(npcImages?.results || []);
            this.notifyListeners({ type: 'state-update', step: 'images' });

            console.log('[StoryOrchestrator] 解谜故事创建完成');
            console.log('[StoryOrchestrator] 创作者版 NPC:', this.state.npcs.length, '位');
            console.log('[StoryOrchestrator] 玩家版 NPC:', this.state.npcsPlayer.length, '位');

            callbacks.onProgress?.({
                step: 'images',
                status: 'success',
                skillId: 'parallel-image-generation',
                data: {
                    environmentImages: this.state.environmentImages,
                    npcImageMap: this.state.npcImageMap
                }
            });

            return this.state;

        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 生成 WorldMap（布局图 → 最终地图）
     * @param {string} instruction - 用户指令（可选）
     * @param {object} callbacks - 回调函数
     */
    async generateWorldmap(instruction = '', callbacks = {}) {
        try {
            const { world, environmentImages } = this.state;

            if (!world) {
                throw new Error('必须先生成故事世界');
            }

            // Step 1: 生成布局图
            callbacks.onProgress?.({
                step: 'layout',
                status: 'running',
                skillId: 'worldmap-layout'
            });

            const layoutResult = await this.runSkill('worldmap-layout', {
                world: world.world,
                scenes: world.scenes,
                environmentImages,
                instruction
            });

            // 存储 layout 并立即通知 React
            this.state.layout = layoutResult;
            this.notifyListeners({ type: 'state-update', step: 'layout' });
            console.log('[StoryOrchestrator] Layout 生成完成:', layoutResult?.layoutUrl ? '有URL' : '无URL');

            callbacks.onProgress?.({
                step: 'layout',
                status: 'success',
                skillId: 'worldmap-layout',
                data: layoutResult
            });

            // Step 2: 生成最终地图
            callbacks.onProgress?.({
                step: 'final-map',
                status: 'running',
                skillId: 'worldmap-image'
            });

            // layoutResult 来自 worldmap-layout，返回字段是 layoutImage
            const layoutImageUrl = layoutResult.layoutImage || layoutResult.layoutUrl;

            const mapResult = await this.runSkill('worldmap-image', {
                world: world.world,
                scenes: world.scenes,
                layoutImage: layoutImageUrl,
                instruction
            });

            // 提取 map 对象并展平结构（skill 返回 { map: { url, ... } }）
            this.state.worldmap = {
                ...(mapResult.map || mapResult),
                layoutUrl: layoutImageUrl
            };
            this.notifyListeners({ type: 'state-update', step: 'worldmap' });
            console.log('[StoryOrchestrator] 世界地图生成完成:', this.state.worldmap?.url ? '有URL' : '无URL');

            callbacks.onProgress?.({
                step: 'final-map',
                status: 'success',
                skillId: 'worldmap-image',
                data: this.state.worldmap
            });

            return this.state.worldmap;

        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 重新生成世界地图
     * @param {string} scope - 'all' = layout + map, 'mapOnly' = 仅 map
     * @param {object} callbacks - 回调函数
     */
    async regenerateWorldmap(scope = 'mapOnly', callbacks = {}) {
        try {
            if (scope === 'all') {
                // 重新生成 layout + map
                console.log('[StoryOrchestrator] 重新生成地图和布局');
                return await this.generateWorldmap('', callbacks);
            } else {
                // 仅重新生成 map（基于现有 layout）
                console.log('[StoryOrchestrator] 仅重新生成地图（保留布局）');
                return await this.generateWorldmapFromLayout('', callbacks);
            }
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 根据当前 scenes 同步更新世界地图
     * 用于场景增删后的地图同步
     */
    async syncWorldmapWithScenes(callbacks = {}) {
        try {
            console.log('[StoryOrchestrator] 同步场景到地图');

            // 场景结构变化，需要重新生成 layout + map
            return await this.generateWorldmap('', callbacks);
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 执行单个 Skill（带重试和超时）
     * @param {string} skillId - Skill 标识符
     * @param {object} args - Skill 参数
     * @returns {Promise<any>} Skill 执行结果
     */
    async runSkill(skillId, args) {
        const startTime = Date.now();

        // 使用带重试的执行器（如果存在）
        let result;
        if (typeof executeWithRetry === 'function') {
            result = await executeWithRetry(skillId, args, {
                maxRetries: 2,
                timeout: 60000,
                onProgress: (progress) => {
                    this.notifyListeners({
                        type: 'skill-progress',
                        skillId,
                        progress
                    });
                }
            });
        } else {
            // Fallback: 直接调用
            result = await runSkill(skillId, args);
        }

        const executionTime = Date.now() - startTime;

        // 记录历史
        this.history.push({
            skillId,
            args,
            result,
            executionTime,
            timestamp: Date.now()
        });

        return result;
    }

    /**
     * 构建 NPC 图片映射表
     * @param {Array} results - NPC 图片生成结果
     * @returns {object} { npcName: [images...] }
     */
    buildNpcImageMap(results) {
        const map = {};
        if (Array.isArray(results)) {
            results.forEach(item => {
                if (item?.name) {
                    map[item.name] = item.images || [];
                }
            });
        }
        return map;
    }

    /**
     * 订阅事件（用于 UI 更新）
     * @param {Function} listener - 事件监听器
     * @returns {Function} 取消订阅函数
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * 通知所有监听器
     * @param {object} event - 事件对象
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * 获取当前状态快照
     * @returns {object} 状态副本
     */
    getState() {
        return { ...this.state };
    }

    /**
     * 获取执行历史
     * @returns {Array} 历史记录
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * 恢复状态（用于从预览页面返回时）
     * @param {object} savedState - 保存的状态数据
     */
    restoreState(savedState) {
        if (!savedState) return;

        // 恢复各项状态
        if (savedState.world) this.state.world = savedState.world;
        if (savedState.worldPlayer) this.state.worldPlayer = savedState.worldPlayer;
        if (savedState.npcs) this.state.npcs = savedState.npcs;
        if (savedState.npcsPlayer) this.state.npcsPlayer = savedState.npcsPlayer;
        if (savedState.environmentImages) this.state.environmentImages = savedState.environmentImages;
        if (savedState.npcImageMap) this.state.npcImageMap = savedState.npcImageMap;
        if (savedState.layout) this.state.layout = savedState.layout;
        if (savedState.worldmap) this.state.worldmap = savedState.worldmap;

        this.notifyListeners({ type: 'state-restored' });
        console.log('[StoryOrchestrator] 状态已恢复');
    }

    /**
     * 编辑世界观设定
     */
    async editWorld(instruction, callbacks = {}) {
        try {
            callbacks.onProgress?.({
                step: 'world-edit',
                status: 'running',
                skillId: 'story-world-edit'
            });

            const result = await this.runSkill('story-world-edit', {
                currentWorld: this.state.world,
                instruction
            });

            // 合并更新
            this.state.world = {
                ...this.state.world,
                world: result.world,
                situation: result.situation,
                truth: result.truth,
                scenes: result.scenes?.length ? result.scenes : this.state.world.scenes
            };
            this.notifyListeners({ type: 'state-update', step: 'world-edit' });

            callbacks.onProgress?.({
                step: 'world-edit',
                status: 'success',
                skillId: 'story-world-edit',
                data: this.state.world
            });

            return this.state.world;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 删除 NPC
     * 注意：至少保留 1 个 NPC
     */
    async deleteNpc(npcName, callbacks = {}) {
        try {
            // 检查是否至少保留 1 个
            if (this.state.npcs.length <= 1) {
                throw new Error('至少需要保留 1 个 NPC，无法删除');
            }

            const targetIndex = this.state.npcs.findIndex(n => n.name === npcName);
            if (targetIndex === -1) {
                throw new Error(`未找到 NPC: ${npcName}`);
            }

            callbacks.onProgress?.({
                step: 'npc-delete',
                status: 'running',
                skillId: 'npc-delete',
                npcName
            });

            // 从 NPC 列表中删除
            this.state.npcs = this.state.npcs.filter(n => n.name !== npcName);

            // 同步删除 NPC 图片
            if (this.state.npcImageMap[npcName]) {
                delete this.state.npcImageMap[npcName];
            }

            this.notifyListeners({ type: 'state-update', step: 'npc-delete' });

            callbacks.onProgress?.({
                step: 'npc-delete',
                status: 'success',
                skillId: 'npc-delete',
                data: { deleted: npcName }
            });

            console.log(`[StoryOrchestrator] 已删除 NPC: ${npcName}`);
            return { deleted: npcName };
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 添加新场景
     * 创建新场景并生成环境图
     */
    async addScene(instruction, callbacks = {}) {
        try {
            callbacks.onProgress?.({
                step: 'scene-add',
                status: 'running',
                skillId: 'story-scene-add'
            });

            const existingSceneNames = (this.state.world?.scenes || []).map(s => s.name);

            const result = await this.runSkill('story-scene-add', {
                world: this.state.world,
                instruction,
                existingSceneNames
            });

            const newScene = result.scene;

            // 将新场景添加到 world.scenes
            this.state.world = {
                ...this.state.world,
                scenes: [...(this.state.world?.scenes || []), newScene]
            };
            this.notifyListeners({ type: 'state-update', step: 'scene-add' });

            callbacks.onProgress?.({
                step: 'scene-add',
                status: 'success',
                skillId: 'story-scene-add',
                data: newScene
            });

            // 为新场景生成环境图
            callbacks.onProgress?.({
                step: 'env-image-gen',
                status: 'running',
                skillId: 'environment-image'
            });

            const imageResult = await this.runSkill('environment-image', {
                world: this.state.world?.world,
                situation: this.state.world?.situation,
                truth: this.state.world?.truth,
                scenes: [newScene]
            });

            // 将新环境图添加到列表
            if (imageResult?.images?.length > 0) {
                this.state.environmentImages = [
                    ...this.state.environmentImages,
                    ...imageResult.images
                ];
                this.notifyListeners({ type: 'state-update', step: 'env-image-gen' });
            }

            callbacks.onProgress?.({
                step: 'env-image-gen',
                status: 'success',
                skillId: 'environment-image',
                data: imageResult
            });

            console.log(`[StoryOrchestrator] 已添加场景: ${newScene.name}`);
            return newScene;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 删除场景
     * 注意：至少保留 1 个场景
     */
    async deleteScene(sceneName, callbacks = {}) {
        try {
            const scenes = this.state.world?.scenes || [];

            // 检查是否至少保留 1 个
            if (scenes.length <= 1) {
                throw new Error('至少需要保留 1 个场景，无法删除');
            }

            const targetIndex = scenes.findIndex(s => s.name === sceneName);
            if (targetIndex === -1) {
                throw new Error(`未找到场景: ${sceneName}`);
            }

            callbacks.onProgress?.({
                step: 'scene-delete',
                status: 'running',
                skillId: 'scene-delete',
                sceneName
            });

            // 从 scenes 列表中删除
            this.state.world = {
                ...this.state.world,
                scenes: scenes.filter(s => s.name !== sceneName)
            };

            // 同步删除对应的环境图（按索引对应）
            if (this.state.environmentImages.length > targetIndex) {
                this.state.environmentImages = this.state.environmentImages.filter(
                    (_, idx) => idx !== targetIndex
                );
            }

            this.notifyListeners({ type: 'state-update', step: 'scene-delete' });

            callbacks.onProgress?.({
                step: 'scene-delete',
                status: 'success',
                skillId: 'scene-delete',
                data: { deleted: sceneName }
            });

            console.log(`[StoryOrchestrator] 已删除场景: ${sceneName}`);
            return { deleted: sceneName };
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 添加新 NPC
     * 创建新角色并生成形象图
     */
    async addNpc(instruction, callbacks = {}) {
        try {
            callbacks.onProgress?.({
                step: 'npc-add',
                status: 'running',
                skillId: 'story-npc-add'
            });

            // 获取已存在的 NPC 名字列表（避免重名）
            const existingNpcNames = this.state.npcs.map(npc => npc.name);

            const result = await this.runSkill('story-npc-add', {
                world: this.state.world,
                instruction,
                existingNpcNames
            });

            const newNpc = result.npc;

            // 将新 NPC 添加到列表
            this.state.npcs = [...this.state.npcs, newNpc];
            this.notifyListeners({ type: 'state-update', step: 'npc-add' });

            callbacks.onProgress?.({
                step: 'npc-add',
                status: 'success',
                skillId: 'story-npc-add',
                data: newNpc
            });

            // 为新 NPC 生成形象图
            callbacks.onProgress?.({
                step: 'npc-image-gen',
                status: 'running',
                skillId: 'npc-image',
                npcName: newNpc.name
            });

            const imageResult = await this.runSkill('npc-image', {
                npcs: [newNpc]
            });

            // 更新 NPC 图片映射
            const npcImageEntry = imageResult?.results?.find(r => r.name === newNpc.name);
            if (npcImageEntry) {
                this.state.npcImageMap = {
                    ...this.state.npcImageMap,
                    [newNpc.name]: npcImageEntry.images || []
                };
                this.notifyListeners({ type: 'state-update', step: 'npc-image-gen', npcName: newNpc.name });
            }

            callbacks.onProgress?.({
                step: 'npc-image-gen',
                status: 'success',
                skillId: 'npc-image',
                data: npcImageEntry
            });

            return newNpc;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 编辑 NPC 文字信息
     */
    async editNpc(npcName, instruction, callbacks = {}) {
        try {
            const targetNpc = this.state.npcs.find(n => n.name === npcName);
            if (!targetNpc) {
                throw new Error(`未找到 NPC: ${npcName}`);
            }

            callbacks.onProgress?.({
                step: 'npc-edit',
                status: 'running',
                skillId: 'story-npc-edit',
                npcName
            });

            const result = await this.runSkill('story-npc-edit', {
                targetNpc,
                instruction
            });

            const updatedNpc = { ...targetNpc, ...result.npc };
            const newName = updatedNpc.name;
            const nameChanged = newName !== npcName;

            // 更新 NPC 列表
            this.state.npcs = this.state.npcs.map(npc =>
                npc.name === npcName ? updatedNpc : npc
            );

            // 如果名字变了，更新 npcImageMap 的 key
            if (nameChanged && this.state.npcImageMap[npcName]) {
                const images = this.state.npcImageMap[npcName];
                delete this.state.npcImageMap[npcName];
                this.state.npcImageMap[newName] = images;
                console.log(`[StoryOrchestrator] NPC 名字变更: "${npcName}" → "${newName}"，已更新图片映射`);
            }

            this.notifyListeners({ type: 'state-update', step: 'npc-edit', npcName: newName });

            callbacks.onProgress?.({
                step: 'npc-edit',
                status: 'success',
                skillId: 'story-npc-edit',
                data: updatedNpc
            });

            return updatedNpc;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 编辑 NPC 图片
     * 智能降级：如果没有现有图片，则调用 npc-image 进行初次生成
     */
    async editNpcImage(npcName, instruction, callbacks = {}) {
        try {
            const npc = this.state.npcs.find(n => n.name === npcName);
            if (!npc) {
                throw new Error(`未找到 NPC: ${npcName}`);
            }

            const currentImages = this.state.npcImageMap[npcName] || [];
            const hasExistingImages = currentImages.length > 0;

            // 智能选择 skill：有现有图片用 edit，没有则用初次生成
            const skillId = hasExistingImages ? 'npc-image-edit' : 'npc-image';
            const skillLabel = hasExistingImages ? 'NPC Portrait Edit' : 'NPC Portrait Generator';

            callbacks.onProgress?.({
                step: hasExistingImages ? 'npc-image-edit' : 'npc-image-gen',
                status: 'running',
                skillId,
                npcName
            });

            let result;
            if (hasExistingImages) {
                // 编辑现有图片
                result = await this.runSkill('npc-image-edit', {
                    npc,
                    instruction,
                    currentImages
                });
            } else {
                // 没有现有图片，调用初次生成（只生成这一个 NPC）
                console.log(`[StoryOrchestrator] NPC "${npcName}" 没有现有图片，降级到初次生成`);
                const genResult = await this.runSkill('npc-image', {
                    npcs: [npc]
                });
                // npc-image 返回 { results: [{ name, images }] }
                const npcResult = genResult?.results?.find(r => r.name === npcName);
                result = { images: npcResult?.images || [] };
            }

            // 更新 NPC 图片映射
            this.state.npcImageMap = {
                ...this.state.npcImageMap,
                [npcName]: result.images || []
            };
            this.notifyListeners({ type: 'state-update', step: 'npc-image-edit', npcName });

            callbacks.onProgress?.({
                step: hasExistingImages ? 'npc-image-edit' : 'npc-image-gen',
                status: 'success',
                skillId,
                data: result
            });

            return result;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 编辑环境图片
     * 智能降级：如果没有现有图片，则调用 environment-image 进行初次生成
     */
    async editEnvironmentImage(targetIndex, instruction, callbacks = {}) {
        try {
            const currentImages = this.state.environmentImages || [];
            const hasExistingImages = currentImages.length > 0;

            // 智能选择 skill
            const skillId = hasExistingImages ? 'environment-image-edit' : 'environment-image';

            callbacks.onProgress?.({
                step: hasExistingImages ? 'env-image-edit' : 'env-image-gen',
                status: 'running',
                skillId,
                targetIndex
            });

            let result;
            if (hasExistingImages) {
                // 编辑现有图片
                result = await this.runSkill('environment-image-edit', {
                    world: this.state.world?.world,
                    situation: this.state.world?.situation,
                    truth: this.state.world?.truth,
                    scenes: this.state.world?.scenes,
                    instruction,
                    currentImages,
                    targetImageIndex: targetIndex
                });
            } else {
                // 没有现有图片，调用初次生成
                console.log('[StoryOrchestrator] 没有现有环境图片，降级到初次生成');
                result = await this.runSkill('environment-image', {
                    world: this.state.world?.world,
                    situation: this.state.world?.situation,
                    truth: this.state.world?.truth,
                    scenes: this.state.world?.scenes
                });
            }

            this.state.environmentImages = result.images || [];
            this.notifyListeners({ type: 'state-update', step: 'env-image-edit' });

            callbacks.onProgress?.({
                step: hasExistingImages ? 'env-image-edit' : 'env-image-gen',
                status: 'success',
                skillId,
                data: result
            });

            return result;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 编辑地图布局
     */
    async editLayout(instruction, callbacks = {}) {
        try {
            callbacks.onProgress?.({
                step: 'layout-edit',
                status: 'running',
                skillId: 'worldmap-layout-edit'
            });

            const result = await this.runSkill('worldmap-layout-edit', {
                world: this.state.world?.world,
                scenes: this.state.world?.scenes,
                currentLayout: this.state.layout,
                environmentImages: this.state.environmentImages,
                instruction
            });

            this.state.layout = result;
            this.notifyListeners({ type: 'state-update', step: 'layout-edit' });

            callbacks.onProgress?.({
                step: 'layout-edit',
                status: 'success',
                skillId: 'worldmap-layout-edit',
                data: result
            });

            // 布局变更后，重新生成最终地图
            return await this.generateWorldmapFromLayout(instruction, callbacks);
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 编辑世界地图风格（不改变布局）
     */
    async editWorldmapImage(instruction, callbacks = {}) {
        try {
            callbacks.onProgress?.({
                step: 'worldmap-edit',
                status: 'running',
                skillId: 'worldmap-image-edit'
            });

            const layoutImageUrl = this.state.layout?.layoutImage || this.state.layout?.layoutUrl;

            const result = await this.runSkill('worldmap-image-edit', {
                world: this.state.world?.world,
                scenes: this.state.world?.scenes,
                layoutImage: layoutImageUrl,
                currentWorldmap: this.state.worldmap,
                instruction
            });

            this.state.worldmap = {
                ...(result.map || result),
                layoutUrl: layoutImageUrl
            };
            this.notifyListeners({ type: 'state-update', step: 'worldmap-edit' });

            callbacks.onProgress?.({
                step: 'worldmap-edit',
                status: 'success',
                skillId: 'worldmap-image-edit',
                data: this.state.worldmap
            });

            return this.state.worldmap;
        } catch (error) {
            callbacks.onError?.(error);
            throw error;
        }
    }

    /**
     * 从已有布局生成世界地图（内部方法）
     */
    async generateWorldmapFromLayout(instruction, callbacks = {}) {
        const layoutImageUrl = this.state.layout?.layoutImage || this.state.layout?.layoutUrl;

        callbacks.onProgress?.({
            step: 'worldmap-gen',
            status: 'running',
            skillId: 'worldmap-image'
        });

        const mapResult = await this.runSkill('worldmap-image', {
            world: this.state.world?.world,
            scenes: this.state.world?.scenes,
            layoutImage: layoutImageUrl,
            instruction
        });

        this.state.worldmap = {
            ...(mapResult.map || mapResult),
            layoutUrl: layoutImageUrl
        };
        this.notifyListeners({ type: 'state-update', step: 'worldmap' });

        callbacks.onProgress?.({
            step: 'worldmap-gen',
            status: 'success',
            skillId: 'worldmap-image',
            data: this.state.worldmap
        });

        return this.state.worldmap;
    }

    /**
     * 重置状态
     */
    reset() {
        this.state = {
            world: null,
            npcs: [],
            environmentImages: [],
            npcImageMap: {},
            layout: null,
            worldmap: null
        };
        this.history = [];
        this.notifyListeners({ type: 'reset' });
    }
}
