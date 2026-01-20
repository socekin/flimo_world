import { createContext, useContext, useState, useEffect } from 'react';
import { getGame } from '../lib/gameStorageClient';

const NAV_API_BASE = import.meta.env.VITE_NAV_API_BASE || 'https://nav.url88.xyz';

/**
 * 游戏运行时上下文
 * 提供从 API 加载的游戏数据和导航数据
 */
const GameContext = createContext(null);

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

/**
 * 游戏数据提供者
 */
export function GameProvider({ gameId, children }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 游戏数据（来自 Game Storage）
    const [gameData, setGameData] = useState(null);

    // 导航数据（来自 Nav API）
    const [navData, setNavData] = useState({
        worldInfo: null,
        locations: [],
        mapUrl: null,
        worldpathUrl: null
    });

    // 加载游戏数据
    useEffect(() => {
        if (!gameId) return;

        let cancelled = false;

        async function loadData() {
            setLoading(true);
            setError(null);

            try {
                // 1. 加载游戏数据
                const game = await getGame(gameId);
                if (cancelled) return;
                setGameData(game);

                // 2. 如果有 navWorldId，加载导航数据
                if (game.navWorldId) {
                    const navWorldId = game.navWorldId;

                    // 并行加载 world info 和 locations
                    const [worldRes, locationsRes] = await Promise.all([
                        fetch(`${NAV_API_BASE}/api/worlds/${navWorldId}`),
                        fetch(`${NAV_API_BASE}/api/worlds/${navWorldId}/locations`)
                    ]);

                    if (cancelled) return;

                    const worldInfo = worldRes.ok ? await worldRes.json() : null;
                    const locationsData = locationsRes.ok ? await locationsRes.json() : { locations: [] };

                    setNavData({
                        worldInfo,
                        locations: locationsData.locations || [],
                        mapUrl: `${NAV_API_BASE}/assets/worlds/${navWorldId}/map.jpg`,
                        worldpathUrl: `${NAV_API_BASE}/assets/worlds/${navWorldId}/worldpath.jpg`
                    });
                }

                setLoading(false);
            } catch (err) {
                if (cancelled) return;
                console.error('[GameContext] 加载失败:', err);
                setError(err.message || '加载游戏数据失败');
                setLoading(false);
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, [gameId]);

    // 构建地点名称 → 坐标映射
    const locationCenterMap = new Map();
    navData.locations.forEach(loc => {
        if (loc.name && loc.center) {
            locationCenterMap.set(loc.name, loc.center);
        }
    });

    // 获取地点中心坐标
    const getLocationCenter = (locationName) => {
        return locationCenterMap.get(locationName) || null;
    };

    // 获取所有地点名称
    const locationNames = navData.locations.map(loc => loc.name);

    // 随机选择一个地点
    const getRandomLocation = () => {
        if (locationNames.length === 0) return null;
        const idx = Math.floor(Math.random() * locationNames.length);
        return locationNames[idx];
    };

    const value = {
        // 状态
        loading,
        error,
        gameId,

        // 游戏数据
        gameData,
        title: gameData?.title || '未命名故事',
        npcs: gameData?.npcs || [],
        npcsPlayer: gameData?.npcsPlayer || [],
        npcImageMap: gameData?.npcImageMap || {},
        world: gameData?.world || {},
        worldPlayer: gameData?.worldPlayer || {},
        gameTips: gameData?.gameTips || [],
        navWorldId: gameData?.navWorldId || null,

        // 真凶（MVP 阶段随机）
        trueCulpritName: gameData?.trueCulpritName || (gameData?.npcs?.[0]?.name || null),

        // 导航数据
        navData,
        mapUrl: navData.mapUrl,
        worldpathUrl: navData.worldpathUrl,
        locations: navData.locations,
        locationNames,

        // 工具函数
        getLocationCenter,
        getRandomLocation
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export default GameContext;
