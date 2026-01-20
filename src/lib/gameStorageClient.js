/**
 * Game Storage Service 客户端
 * 用于与 VPS 上的游戏存储服务通信
 */

const STORAGE_API_URL = import.meta.env.VITE_GAME_STORAGE_API || 'http://localhost:8001';

/**
 * 将 base64 data URL 转换为 Blob
 */
function dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * 将 URL 转换为 Blob（支持 data URL 和 http URL）
 */
async function urlToBlob(url) {
    if (url.startsWith('data:')) {
        return dataUrlToBlob(url);
    }
    const response = await fetch(url);
    return response.blob();
}

/**
 * 发布游戏
 * @param {Object} gameData - 游戏数据（环境图片会被提取出来单独上传）
 * @param {Object} images - 图片数据
 * @param {string} images.coverUrl - 封面图 URL
 * @param {Object} images.npcImageMap - NPC 图片 { npcName: url }
 * @param {Array} images.environmentImages - 环境图片 URL 数组（会作为文件上传）
 * @returns {Promise<{success: boolean, id: string}>}
 */
export async function publishGame(gameData, images = {}) {
    const formData = new FormData();

    // 从 gameData 中移除环境图片的 base64 数据（后端会根据上传的文件重建）
    const cleanGameData = { ...gameData };
    delete cleanGameData.environmentImages;  // 移除，让后端根据上传文件重建

    // 添加 JSON 数据（现在不包含大的 base64 数据了）
    formData.append('data', JSON.stringify(cleanGameData));

    // 添加封面图
    if (images.coverUrl) {
        try {
            const coverBlob = await urlToBlob(images.coverUrl);
            formData.append('cover', coverBlob, 'cover.png');
        } catch (e) {
            console.warn('[GameStorage] 封面图转换失败:', e);
        }
    }

    // 添加 NPC 图片
    if (images.npcImageMap) {
        for (const [npcName, url] of Object.entries(images.npcImageMap)) {
            if (!url) continue;
            try {
                const blob = await urlToBlob(url);
                formData.append('npc_images', blob, `${npcName}.png`);
            } catch (e) {
                console.warn(`[GameStorage] NPC 图片转换失败: ${npcName}`, e);
            }
        }
    }

    // 添加环境图片（按索引命名以保持顺序）
    if (images.environmentImages && images.environmentImages.length > 0) {
        for (let i = 0; i < images.environmentImages.length; i++) {
            const url = images.environmentImages[i];
            if (!url) continue;
            try {
                const blob = await urlToBlob(url);
                formData.append('env_images', blob, `${i}.png`);
            } catch (e) {
                console.warn(`[GameStorage] 环境图片转换失败: ${i}`, e);
            }
        }
    }

    const response = await fetch(`${STORAGE_API_URL}/api/games`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`发布失败: ${error}`);
    }

    return response.json();
}

/**
 * 获取游戏列表
 * @returns {Promise<Array<{id, title, summary, coverImage, npcCount, createdAt}>>}
 */
export async function listGames() {
    const response = await fetch(`${STORAGE_API_URL}/api/games`);
    if (!response.ok) {
        throw new Error('获取游戏列表失败');
    }
    const data = await response.json();

    // 处理图片 URL：如果是相对路径，加上 API 前缀
    return (data.games || []).map(game => ({
        ...game,
        coverImage: game.coverImage?.startsWith('/static')
            ? `${STORAGE_API_URL}${game.coverImage}`
            : game.coverImage
    }));
}

/**
 * 获取单个游戏详情
 * @param {string} gameId
 * @returns {Promise<Object>}
 */
export async function getGame(gameId) {
    const response = await fetch(`${STORAGE_API_URL}/api/games/${gameId}`);
    if (!response.ok) {
        throw new Error('获取游戏详情失败');
    }
    const data = await response.json();

    // 处理图片 URL
    if (data.coverImage?.startsWith('/static')) {
        data.coverImage = `${STORAGE_API_URL}${data.coverImage}`;
    }
    if (data.npcImageMap) {
        for (const [key, url] of Object.entries(data.npcImageMap)) {
            if (url?.startsWith('/static')) {
                data.npcImageMap[key] = `${STORAGE_API_URL}${url}`;
            }
        }
    }
    if (Array.isArray(data.environmentImages)) {
        data.environmentImages = data.environmentImages
            .map((item) => {
                const url = typeof item === 'string' ? item : item?.url || item?.image || item?.src;
                if (!url) return null;
                return url.startsWith('/static') ? `${STORAGE_API_URL}${url}` : url;
            })
            .filter(Boolean);
    }

    return data;
}

/**
 * 检查存储服务是否可用
 * @returns {Promise<boolean>}
 */
export async function checkStorageHealth() {
    try {
        const response = await fetch(`${STORAGE_API_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}
