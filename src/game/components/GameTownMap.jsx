import { useEffect, useState, useRef, forwardRef, useMemo } from 'react';
import GameAvatarMarker from './GameAvatarMarker';

/**
 * GameTownMap - 地图组件（独立版本）
 * 复制自 TownMap.jsx，改为 props 驱动
 * 
 * @param {string} mapUrl - 地图背景图 URL
 * @param {Array} npcs - NPC 数据列表 [{id, name, image}, ...]
 * @param {Array} positions - NPC 位置列表 [{npcId, xPct, yPct}, ...]
 * @param {number} selectedNpcId - 当前选中的 NPC ID
 * @param {function} onSelectNpc - 选中 NPC 回调
 * @param {function} onBlankClick - 点击空白处回调
 * @param {Map} interactingPairs - 正在互动的 NPC 对
 */

const MAP_RATIO = 1376 / 768; // 宽 / 高
const CLUSTER_RADIUS_PX = 18;
const TRIGGER_HALF_W = 24;
const TRIGGER_HALF_H = 36;
const COLLAPSE_DELAY_MS = 500;

const GameTownMap = forwardRef(function GameTownMap({
    mapUrl,
    npcs = [],
    positions = [],
    selectedNpcId,
    onSelectNpc,
    onBlankClick,
    interactingPairs = new Map()
}, ref) {
    const containerRef = useRef(null);
    const [mapBox, setMapBox] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
    const [hoverOffsets, setHoverOffsets] = useState(new Map());
    const rafRef = useRef(null);
    const lastMoveRef = useRef(null);
    const collapseTimerRef = useRef(null);

    // 构建 NPC ID → NPC 数据映射
    const npcMap = useMemo(() => {
        const map = new Map();
        npcs.forEach(npc => map.set(npc.id, npc));
        return map;
    }, [npcs]);

    const handleMapClick = () => {
        if (onBlankClick) onBlankClick();
        else onSelectNpc(null);
    };

    const clearCollapseTimer = () => {
        if (collapseTimerRef.current) {
            clearTimeout(collapseTimerRef.current);
            collapseTimerRef.current = null;
        }
    };

    const scheduleCollapse = () => {
        clearCollapseTimer();
        collapseTimerRef.current = setTimeout(() => {
            setHoverOffsets(new Map());
            collapseTimerRef.current = null;
        }, COLLAPSE_DELAY_MS);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const computeBox = () => {
            const rect = el.getBoundingClientRect();
            const { width: W, height: H } = rect;
            if (!W || !H) return;
            const containerRatio = W / H;
            let mapWidth = W;
            let mapHeight = H;
            let offsetX = 0;
            let offsetY = 0;
            if (containerRatio > MAP_RATIO) {
                mapHeight = H;
                mapWidth = H * MAP_RATIO;
                offsetX = (W - mapWidth) / 2;
                offsetY = 0;
            } else {
                mapWidth = W;
                mapHeight = W / MAP_RATIO;
                offsetY = Math.max(0, H - mapHeight);
                offsetX = 0;
            }
            setMapBox({ width: mapWidth, height: mapHeight, offsetX, offsetY });
        };

        computeBox();
        window.addEventListener('resize', computeBox);
        return () => window.removeEventListener('resize', computeBox);
    }, []);

    const getPixelPositions = () => {
        const hasBox = mapBox && mapBox.width > 0 && mapBox.height > 0;
        return positions.map((pos) => {
            const x = hasBox ? mapBox.offsetX + (mapBox.width * pos.xPct) / 100 : null;
            const y = hasBox ? mapBox.offsetY + (mapBox.height * pos.yPct) / 100 : null;
            return { npcId: pos.npcId, pos, x, y };
        });
    };

    const computeCluster = (clientX, clientY) => {
        const cont = containerRef.current;
        if (!cont) return;
        const rect = cont.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const pixelPositions = getPixelPositions().filter((p) => p.x != null && p.y != null);
        const inRange = pixelPositions.filter((p) => {
            const dx = Math.abs(p.x - px);
            const dy = Math.abs(p.y - py);
            const inRect = dx <= TRIGGER_HALF_W && dy <= TRIGGER_HALF_H;
            const inCircle = dx * dx + dy * dy <= CLUSTER_RADIUS_PX * CLUSTER_RADIUS_PX;
            return inRect || inCircle;
        });
        if (inRange.length <= 1) {
            if (hoverOffsets.size) {
                scheduleCollapse();
            }
            return;
        }
        clearCollapseTimer();
        const ids = inRange.map((p) => p.npcId).sort((a, b) => a - b);
        const offsets = new Map();
        const count = ids.length;
        const expandRadius = 20 + (count - 2) * 12;
        const step = (Math.PI * 2) / count;
        ids.forEach((id, idx) => {
            const angle = step * idx;
            offsets.set(id, {
                x: Math.round(Math.cos(angle) * expandRadius),
                y: Math.round(Math.sin(angle) * expandRadius)
            });
        });
        setHoverOffsets(offsets);
    };

    const handleMouseMove = (e) => {
        lastMoveRef.current = { x: e.clientX, y: e.clientY };
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (lastMoveRef.current) {
                computeCluster(lastMoveRef.current.x, lastMoveRef.current.y);
            }
        });
    };

    const handleMouseLeave = () => {
        scheduleCollapse();
    };

    const interactOffsets = useMemo(() => {
        if (!positions || positions.length === 0) return new Map();
        const hasBox = mapBox && mapBox.width > 0 && mapBox.height > 0;
        if (!hasBox) return new Map();
        const posMap = new Map();
        positions.forEach((p) => {
            const x = mapBox.offsetX + (mapBox.width * p.xPct) / 100;
            const y = mapBox.offsetY + (mapBox.height * p.yPct) / 100;
            posMap.set(p.npcId, { x, y });
        });
        const offsets = new Map();
        const INTERACT_OFFSET_PX = 40;
        interactingPairs.forEach((pair) => {
            const [a, b] = pair;
            const pa = posMap.get(a);
            const pb = posMap.get(b);
            if (!pa || !pb) return;
            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ox = INTERACT_OFFSET_PX;

            if (!dist || dist < 1) {
                offsets.set(a, { x: -ox, y: 0 });
                offsets.set(b, { x: ox, y: 0 });
                return;
            }

            const nx = dx / dist;
            const ny = dy / dist;
            offsets.set(a, { x: Math.round(-nx * ox), y: Math.round(-ny * ox) });
            offsets.set(b, { x: Math.round(nx * ox), y: Math.round(ny * ox) });
        });
        return offsets;
    }, [interactingPairs, positions, mapBox]);

    return (
        <div
            ref={ref}
            className="relative w-full h-full cursor-default bg-black"
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div
                ref={containerRef}
                className="absolute inset-0"
                style={{
                    backgroundImage: mapUrl ? `url(${mapUrl})` : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                {/* 渲染所有 NPC 标记 */}
                {positions.map((pos) => {
                    const npc = npcMap.get(pos.npcId);
                    if (!npc) return null;

                    const hoverOffset = hoverOffsets.get(npc.id) || { x: 0, y: 0 };
                    const interactOffset = interactOffsets.get(npc.id) || { x: 0, y: 0 };
                    const offset = {
                        x: (hoverOffset.x || 0) + (interactOffset.x || 0),
                        y: (hoverOffset.y || 0) + (interactOffset.y || 0)
                    };
                    const elevated = hoverOffsets.has(npc.id) || interactOffsets.has(npc.id);
                    const isInteracting = interactOffsets.has(npc.id);

                    return (
                        <GameAvatarMarker
                            key={npc.id}
                            npc={npc}
                            position={pos}
                            isSelected={selectedNpcId === npc.id}
                            onClick={onSelectNpc}
                            mapBox={mapBox}
                            offset={offset}
                            elevated={elevated}
                            isInteracting={isInteracting}
                        />
                    );
                })}
            </div>
        </div>
    );
});

export default GameTownMap;
