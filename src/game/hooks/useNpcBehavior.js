import { useState, useRef, useCallback, useEffect } from 'react';
import { createSession, thinkNpc, moveStart, moveArrive } from '../../api/npcService';
import { navigateBetweenLocations, navigateFromCoord } from '../../api/navService';

/**
 * useNpcBehavior - NPC 行为循环 Hook
 * 参考 Play.jsx 实现，管理 session 创建、NPC think 调用、导航移动
 */
export function useNpcBehavior({
    gameData,
    npcs,
    navWorldId,
    locations,
    positions,
    setPositions,
    onEvent,  // 事件回调 (event) => void
    enabled = true
}) {
    const [sessionId, setSessionId] = useState(null);
    const [isSessionReady, setIsSessionReady] = useState(false);

    // Refs
    const sessionIdRef = useRef(null);
    const thinkTimersRef = useRef(new Map());
    const navTimersRef = useRef(new Map());
    const thinkInFlightRef = useRef(new Set());
    const npcLocationsRef = useRef(new Map()); // npcId -> locationName
    const npcStateRef = useRef(new Map()); // npcId -> state ('idle', 'moving')
    const positionsRef = useRef(positions);
    const latestBehaviorRef = useRef(new Map()); // npcId -> behavior

    // 地图尺寸
    const MAP_WIDTH = 1376;
    const MAP_HEIGHT = 768;

    // 同步 positions 到 ref
    useEffect(() => {
        positionsRef.current = positions;
    }, [positions]);

    // 构建 NPC ID -> API ID 映射
    const npcApiIdMap = useRef(new Map());
    useEffect(() => {
        const map = new Map();
        npcs.forEach(npc => {
            const apiId = npc.name.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_');
            map.set(npc.id, apiId);
        });
        npcApiIdMap.current = map;
    }, [npcs]);

    // 构建地点名称 → 中心坐标映射
    const locationCenterMap = useRef(new Map());
    useEffect(() => {
        const map = new Map();
        locations.forEach(loc => {
            if (loc.name && loc.center) {
                map.set(loc.name, loc.center);
            }
        });
        locationCenterMap.current = map;
    }, [locations]);

    // 检查地点是否有效
    const isValidLocation = useCallback((loc) => {
        return loc && locationCenterMap.current.has(loc);
    }, []);

    // 获取地点中心百分比坐标
    const pctFromLocationName = useCallback((locationName) => {
        const center = locationCenterMap.current.get(locationName);
        if (!center) return { xPct: 50, yPct: 50 };
        return {
            xPct: (center.x / MAP_WIDTH) * 100,
            yPct: (center.y / MAP_HEIGHT) * 100
        };
    }, []);

    // 设置 NPC 状态
    const setNpcState = useCallback((npcId, state) => {
        const map = new Map(npcStateRef.current);
        map.set(npcId, state);
        npcStateRef.current = map;
    }, []);

    // 获取 NPC 状态
    const getNpcState = useCallback((npcId) => {
        return npcStateRef.current.get(npcId) || 'idle';
    }, []);

    // 格式化时间
    const formatNow = useCallback(() => {
        const now = new Date();
        return `Day 1, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }, []);

    // 清理 think 定时器
    const clearThinkTimer = useCallback((npcId) => {
        const t = thinkTimersRef.current.get(npcId);
        if (t) {
            clearTimeout(t);
            thinkTimersRef.current.delete(npcId);
        }
        thinkInFlightRef.current.delete(npcId);
    }, []);

    // 更新 NPC 位置到地点
    const updateNpcPositionToLocation = useCallback((npcId, locationName) => {
        const pct = pctFromLocationName(locationName);
        setPositions(prev => prev.map(p =>
            p.npcId === npcId ? { ...p, xPct: pct.xPct, yPct: pct.yPct } : p
        ));
        npcLocationsRef.current.set(npcId, locationName);
    }, [pctFromLocationName, setPositions]);

    // 更新事件
    const upsertEvent = useCallback((npcId, behavior) => {
        if (!behavior?.start_time) return;

        const npc = npcs.find(n => n.id === npcId);
        const event = {
            npcId,
            npcName: npc?.name || `npc_${npcId}`,
            action: behavior.action || '',
            targetLocation: behavior.target_location || '',
            startTime: behavior.start_time
        };

        latestBehaviorRef.current.set(npcId, behavior);

        if (onEvent) {
            onEvent(event);
        }
    }, [npcs, onEvent]);

    // 开始导航
    const startNavigation = useCallback((npcId, fromLoc, toLoc) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId || !fromLoc || !toLoc) return;

        setNpcState(npcId, 'moving');
        const npcApiId = npcApiIdMap.current.get(npcId);

        // 通知后端开始移动
        moveStart(sessionId, npcApiId, {
            current_time: formatNow(),
            from_location: fromLoc,
            to_location: toLoc
        }).catch(err => console.warn('[Nav] move/start failed:', err));

        console.log(`[Nav] ${npcApiId}: ${fromLoc} -> ${toLoc}`);

        // 获取当前位置坐标
        const pos = positionsRef.current?.find(p => p.npcId === npcId);
        const fromCoord = pos ? {
            x: Math.round((pos.xPct / 100) * MAP_WIDTH),
            y: Math.round((pos.yPct / 100) * MAP_HEIGHT)
        } : null;

        // 调用导航 API（传递 navWorldId）
        const navPromise = fromCoord
            ? navigateFromCoord({ worldId: navWorldId, fromX: fromCoord.x, fromY: fromCoord.y, to: toLoc })
            : navigateBetweenLocations({ worldId: navWorldId, from: fromLoc, to: toLoc });

        navPromise.then(res => {
            const path = Array.isArray(res?.path) ? res.path : [];

            if (path.length < 2) {
                // 直接到达
                updateNpcPositionToLocation(npcId, toLoc);
                setNpcState(npcId, 'idle');
                moveArrive(sessionId, npcApiId, {
                    current_time: formatNow(),
                    location: toLoc
                }).catch(err => console.warn('[Nav] move/arrive failed:', err));
                scheduleThink(npcId);
                return;
            }

            // 动画移动
            let idx = 0;
            const timer = setInterval(() => {
                idx += 1;
                if (idx >= path.length) {
                    clearInterval(timer);
                    navTimersRef.current.delete(npcId);
                    updateNpcPositionToLocation(npcId, toLoc);
                    setNpcState(npcId, 'idle');
                    moveArrive(sessionId, npcApiId, {
                        current_time: formatNow(),
                        location: toLoc
                    }).catch(err => console.warn('[Nav] move/arrive failed:', err));
                    console.log(`[Nav] ${npcApiId} arrived at ${toLoc}`);
                    scheduleThink(npcId);
                    return;
                }

                const pt = path[idx];
                const xPct = (pt.x / MAP_WIDTH) * 100;
                const yPct = (pt.y / MAP_HEIGHT) * 100;
                setPositions(prev => prev.map(p =>
                    p.npcId === npcId ? { ...p, xPct, yPct } : p
                ));
            }, 40);

            navTimersRef.current.set(npcId, timer);
        }).catch(err => {
            console.warn('[Nav] 导航失败:', err);
            setNpcState(npcId, 'idle');
            scheduleThink(npcId);
        });
    }, [navWorldId, formatNow, setNpcState, updateNpcPositionToLocation, setPositions]);

    // 安排 think
    const scheduleThink = useCallback((npcId, delay = 8000) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId || !enabled) return;

        clearThinkTimer(npcId);

        if (getNpcState(npcId) === 'moving') return;
        if (thinkInFlightRef.current.has(npcId)) return;

        thinkInFlightRef.current.add(npcId);

        const timer = setTimeout(async () => {
            thinkInFlightRef.current.delete(npcId);

            const npcApiId = npcApiIdMap.current.get(npcId);
            if (!npcApiId) return;

            const currentLoc = npcLocationsRef.current.get(npcId) || '';

            try {
                console.log(`[Think] ${npcApiId} thinking at ${currentLoc}...`);
                const res = await thinkNpc(sessionId, npcApiId, {
                    current_time: formatNow()
                });

                // 更新事件
                if (res?.behavior) {
                    upsertEvent(npcId, res.behavior);
                }

                // 处理目标位置
                const targetLoc = res?.behavior?.target_location;
                const latestLoc = npcLocationsRef.current.get(npcId) || currentLoc;

                if (targetLoc && isValidLocation(targetLoc) && targetLoc !== latestLoc) {
                    console.log(`[Think] ${npcApiId} will move from ${latestLoc} to ${targetLoc}`);
                    startNavigation(npcId, latestLoc, targetLoc);
                } else {
                    // 继续安排下一次 think
                    scheduleThink(npcId, 15000 + Math.random() * 10000);
                }
            } catch (err) {
                console.warn('[Think] 失败:', err);
                scheduleThink(npcId, 20000);
            }
        }, delay);

        thinkTimersRef.current.set(npcId, timer);
    }, [enabled, clearThinkTimer, getNpcState, formatNow, upsertEvent, isValidLocation, startNavigation]);

    // 应用初始状态
    const applyInitialStates = useCallback((initialStates = {}) => {
        npcs.forEach(npc => {
            const apiId = npcApiIdMap.current.get(npc.id);
            const state = initialStates[apiId];
            const currentLoc = state?.current_location ||
                positions.find(p => p.npcId === npc.id)?.location || '';
            const targetLoc = state?.behavior?.target_location;

            // 更新位置
            if (currentLoc) {
                npcLocationsRef.current.set(npc.id, currentLoc);
            }

            // 更新事件
            if (state?.behavior) {
                upsertEvent(npc.id, state.behavior);
            }

            // 决定是否导航
            if (currentLoc && targetLoc && isValidLocation(targetLoc) && currentLoc !== targetLoc) {
                console.log(`[Init] ${apiId}: moving from ${currentLoc} to ${targetLoc}`);
                setNpcState(npc.id, 'moving');
                startNavigation(npc.id, currentLoc, targetLoc);
            } else {
                setNpcState(npc.id, 'idle');
                // 延迟启动 think，错开时间
                const delay = 3000 + Math.random() * 5000;
                scheduleThink(npc.id, delay);
            }
        });
    }, [npcs, positions, isValidLocation, setNpcState, upsertEvent, startNavigation, scheduleThink]);

    // 创建 session
    const initSession = useCallback(async () => {
        if (!gameData || !enabled || sessionIdRef.current) return;

        try {
            const currentTime = formatNow();
            const locationNames = locations.map(loc => loc.name).filter(Boolean);

            // 构建 NPC 数据
            const npcPayload = npcs.map(npc => ({
                id: npcApiIdMap.current.get(npc.id),
                name: npc.name,
                current_location: positions.find(p => p.npcId === npc.id)?.location || locationNames[0] || '',
                profile: {
                    role: npc.role || '',
                    trait: npc.description?.slice(0, 100) || '',
                    goal: npc.goal || ''
                }
            }));

            console.log('[Session] 创建中...', { currentTime, locations: locationNames, npcs: npcPayload });

            const res = await createSession({
                current_time: currentTime,
                world_setting: gameData.worldPlayer?.world || gameData.title || '',
                locations: locationNames,
                npcs: npcPayload
            });

            if (res?.session_id) {
                sessionIdRef.current = res.session_id;
                setSessionId(res.session_id);
                setIsSessionReady(true);
                console.log('[Session] 创建成功:', res.session_id);

                // 应用初始状态
                if (res.initial_states) {
                    console.log('[Session] 应用初始状态:', res.initial_states);
                    applyInitialStates(res.initial_states);
                } else {
                    // 没有初始状态，直接启动所有 NPC 的 think
                    npcs.forEach((npc, idx) => {
                        npcLocationsRef.current.set(npc.id, positions.find(p => p.npcId === npc.id)?.location || '');
                        setNpcState(npc.id, 'idle');
                        scheduleThink(npc.id, 2000 + idx * 2000);
                    });
                }
            }
        } catch (err) {
            console.error('[Session] 创建失败:', err);
        }
    }, [gameData, enabled, locations, npcs, positions, formatNow, applyInitialStates, setNpcState, scheduleThink]);

    // 清理
    useEffect(() => {
        return () => {
            thinkTimersRef.current.forEach(t => clearTimeout(t));
            navTimersRef.current.forEach(t => clearInterval(t));
            thinkTimersRef.current.clear();
            navTimersRef.current.clear();
            thinkInFlightRef.current.clear();
        };
    }, []);

    return {
        sessionId,
        isSessionReady,
        initSession,
        scheduleThink,
        startNavigation,
        getNpcState,
        setNpcState
    };
}
