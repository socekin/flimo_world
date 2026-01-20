/**
 * Remove Background API Client
 * 调用抠图服务移除图片背景
 */

const REMOVE_BG_API = 'https://rbg.url88.xyz/api/remove';

/**
 * 从 URL 下载图片并转换为 Blob
 * 支持普通 URL 和 base64 data URL
 * @param {string} imageUrl - 图片 URL
 * @returns {Promise<Blob>}
 */
async function urlToBlob(imageUrl) {
    // 处理 base64 data URL
    if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const base64 = parts[1];
        const byteString = atob(base64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }
        return new Blob([uint8Array], { type: mime });
    }

    // 普通 HTTP URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }
    return await response.blob();
}

/**
 * 移除图片背景
 * @param {string} imageUrl - 原始图片 URL
 * @returns {Promise<string>} - 处理后的 Blob URL
 */
export async function removeBackground(imageUrl) {
    try {
        // 1. 下载图片转为 Blob
        const imageBlob = await urlToBlob(imageUrl);

        // 2. 构建 FormData
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');

        // 3. 调用抠图 API
        const response = await fetch(REMOVE_BG_API, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Remove background API failed: ${response.status}`);
        }

        // 4. 返回 Blob URL
        const resultBlob = await response.blob();

        if (resultBlob.size === 0) {
            throw new Error('API 返回空响应');
        }

        return URL.createObjectURL(resultBlob);
    } catch (error) {
        console.error('[RemoveBackground] Error:', error);
        throw error;
    }
}

/**
 * 批量处理多个图片的背景移除
 * @param {Object} npcImageMap - { npcName: [{ url }] }
 * @param {Function} onProgress - 进度回调 (npcName, processedUrl)
 * @returns {Promise<Object>} - 处理后的 npcImageMap
 */
export async function removeBackgroundBatch(npcImageMap, onProgress) {
    const processedMap = {};

    const entries = Object.entries(npcImageMap);

    for (const [npcName, images] of entries) {
        if (!images || images.length === 0) {
            processedMap[npcName] = images;
            continue;
        }

        try {
            // 只处理第一张图片
            const originalUrl = images[0]?.url;
            if (!originalUrl) {
                processedMap[npcName] = images;
                continue;
            }

            const processedUrl = await removeBackground(originalUrl);

            // 更新为处理后的图片
            processedMap[npcName] = [{ url: processedUrl }];

            // 通知进度
            onProgress?.(npcName, processedUrl);

        } catch (error) {
            console.error(`[RemoveBackground] Failed for ${npcName}:`, error);
            // 失败时保留原图
            processedMap[npcName] = images;
            onProgress?.(npcName, images[0]?.url);
        }
    }

    return processedMap;
}
