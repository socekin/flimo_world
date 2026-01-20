/**
 * WorldNav API 客户端
 * 用于与 WorldNav 导航服务进行通信
 */

const NAV_API_URL = import.meta.env.VITE_NAV_API_BASE || 'http://localhost:8000';

/**
 * 将图片 URL 转换为 Blob
 * @param {string} url - 图片 URL
 * @returns {Promise<Blob>}
 */
async function urlToBlob(url) {
    const response = await fetch(url);
    return await response.blob();
}

/**
 * 同步地图到 WorldNav 导航服务
 * @param {object} params - 同步参数
 * @param {string} params.name - 世界名称
 * @param {string} params.mapUrl - 地图图片 URL
 * @param {string} params.worldpathUrl - 路径图片 URL（layout）
 * @param {Array} params.locations - 地点标注列表 [{name, x1, y1, x2, y2}]
 * @returns {Promise<{worldId: string, success: boolean}>}
 */
export async function syncToNavApi({ name, mapUrl, worldpathUrl, locations = [] }) {
    try {
        // 转换图片为 Blob
        const [mapBlob, worldpathBlob] = await Promise.all([
            urlToBlob(mapUrl),
            urlToBlob(worldpathUrl)
        ]);

        // 构建表单数据
        const formData = new FormData();
        formData.append('name', name);
        formData.append('map_file', mapBlob, 'map.jpg');
        formData.append('worldpath_file', worldpathBlob, 'worldpath.jpg');

        // 转换 locations 格式
        if (locations.length > 0) {
            const locationsJson = locations.map(loc => ({
                name: loc.name,
                top_left_x: Math.round(loc.x1),
                top_left_y: Math.round(loc.y1),
                bottom_right_x: Math.round(loc.x2),
                bottom_right_y: Math.round(loc.y2)
            }));
            formData.append('locations_json', JSON.stringify(locationsJson));
        }

        // 发送请求
        const response = await fetch(`${NAV_API_URL}/api/worlds`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Nav API 请求失败: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        return {
            success: true,
            worldId: result.id,
            worldName: result.name
        };
    } catch (error) {
        console.error('[NavApiClient] 同步失败:', error);
        throw error;
    }
}

/**
 * 获取导航演示页面 URL
 * @param {string} worldId - World ID
 * @returns {string}
 */
export function getNavDemoUrl(worldId) {
    return `${NAV_API_URL}/demo/?world=${worldId}`;
}

/**
 * 检查 Nav API 是否可用
 * @returns {Promise<boolean>}
 */
export async function checkNavApiHealth() {
    try {
        const response = await fetch(`${NAV_API_URL}/api/worlds`, {
            method: 'GET'
        });
        return response.ok;
    } catch {
        return false;
    }
}
