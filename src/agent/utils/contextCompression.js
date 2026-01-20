/**
 * Context Compression Utilities
 * 
 * 用于压缩传递给 LLM 的上下文，减少 Token 消耗
 * 目标：减少 30-50% 的 Token 使用
 */

/**
 * 截断文本到指定长度，保留完整句子
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;

    // 尝试在句号、问号、感叹号处截断
    const truncated = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('。'),
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('！'),
        truncated.lastIndexOf('？')
    );

    if (lastSentenceEnd > maxLength * 0.6) {
        return truncated.substring(0, lastSentenceEnd + 1);
    }

    return truncated + '...';
}

/**
 * 压缩世界观上下文
 * 原始 world 对象可能很大，提取关键信息
 * @param {object} world - 完整的世界观对象
 * @returns {object} 压缩后的世界观摘要
 */
export function compressWorldContext(world) {
    if (!world) return null;

    return {
        worldSummary: truncate(world.world, 80),
        situation: truncate(world.situation, 60),
        hasTruth: !!world.truth,
        sceneCount: world.scenes?.length || 0,
        sceneNames: world.scenes?.slice(0, 4).map(s => s.name) || []
    };
}

/**
 * 压缩 NPC 上下文
 * 只保留名称和角色，去除详细描述
 * @param {Array} npcs - NPC 列表
 * @returns {Array} 压缩后的 NPC 摘要
 */
export function compressNpcContext(npcs) {
    if (!npcs || npcs.length === 0) return [];

    return npcs.map(npc => ({
        name: npc.name,
        role: npc.role,
        hasHiddenInfo: !!npc.hiddenInfo
    }));
}

/**
 * 压缩对话历史
 * 只保留最近 N 条消息的摘要
 * @param {Array} messages - 消息列表
 * @param {number} limit - 保留条数
 * @returns {Array} 压缩后的历史
 */
export function compressHistory(messages, limit = 5) {
    if (!messages || messages.length === 0) return [];

    const recent = messages.slice(-limit);

    return recent.map(msg => {
        if (msg.role === 'user') {
            return { role: 'user', text: truncate(msg.text, 50) };
        }
        if (msg.role === 'assistant') {
            return { role: 'assistant', text: truncate(msg.text, 80) };
        }
        if (msg.role === 'tool_use') {
            return { role: 'tool', skill: msg.skillId, status: msg.status };
        }
        return null;
    }).filter(Boolean);
}

/**
 * 压缩图片数据
 * 去除 base64 数据，只保留 URL 和元信息
 * @param {Array} images - 图片列表
 * @returns {Array} 压缩后的图片信息
 */
export function compressImages(images) {
    if (!images || images.length === 0) return [];

    return images.map(img => ({
        id: img.id,
        title: img.title,
        hasUrl: !!img.url
    }));
}

/**
 * 构建最小化的编辑上下文
 * 用于 edit 类 Skill，只包含需要编辑的部分
 * @param {object} params - 参数对象
 * @returns {object} 最小化上下文
 */
export function buildEditContext({ world, npcs, targetType, targetId }) {
    const context = {
        worldSummary: compressWorldContext(world),
        npcCount: npcs?.length || 0
    };

    // 如果是编辑特定 NPC，只包含该 NPC 的完整信息
    if (targetType === 'npc' && targetId) {
        const targetNpc = npcs?.find(n => n.name === targetId);
        if (targetNpc) {
            context.targetNpc = targetNpc;
        }
    }

    // 如果是编辑世界观，包含完整世界观但简化其他
    if (targetType === 'world') {
        context.world = world;
        context.npcSummary = compressNpcContext(npcs);
    }

    return context;
}

/**
 * 估算上下文的 Token 数量
 * 粗略估算：中文约 2 字符/token，英文约 4 字符/token
 * @param {object} context - 上下文对象
 * @returns {number} 估算的 Token 数
 */
export function estimateTokens(context) {
    const json = JSON.stringify(context);
    const chineseChars = (json.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = json.length - chineseChars;

    return Math.ceil(chineseChars / 2 + otherChars / 4);
}

/**
 * 比较压缩前后的 Token 节省
 * @param {object} original - 原始上下文
 * @param {object} compressed - 压缩后上下文
 * @returns {object} 对比结果
 */
export function compareCompression(original, compressed) {
    const originalTokens = estimateTokens(original);
    const compressedTokens = estimateTokens(compressed);
    const saved = originalTokens - compressedTokens;
    const savedPercent = ((saved / originalTokens) * 100).toFixed(1);

    return {
        originalTokens,
        compressedTokens,
        saved,
        savedPercent: `${savedPercent}%`
    };
}
