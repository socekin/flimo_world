import { useMemo } from 'react';

/**
 * GameEventsPanel - 事件面板（独立版本）
 * 复制自 EventsPanel.jsx，改为 props 驱动
 * 
 * @param {Array} events - 事件列表 [{npcId, npcName, action, targetLocation, startTime}, ...]
 * @param {Array} npcs - NPC 列表 [{id, name, image}, ...]
 * @param {boolean} isOpen - 是否展开
 * @param {function} onToggle - 切换回调
 * @param {function} onSelectNpcEvents - 选中 NPC 事件回调
 */
function GameEventsPanel({ events = [], npcs = [], isOpen, onToggle, onSelectNpcEvents }) {
    // 构建 NPC ID → 图片映射
    const npcImageMap = useMemo(() => {
        const map = new Map();
        npcs.forEach(npc => map.set(npc.id, npc.image));
        return map;
    }, [npcs]);

    // 格式化时间
    const formatGroupTime = (date) => {
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${mm}-${dd} ${hh}:${mi}:${ss}`;
    };

    // 归一到 30s 桶
    const getBucket = (ts) => {
        const d = new Date(ts);
        const bucketMs = Math.floor(d.getTime() / 30000) * 30000;
        return bucketMs;
    };

    const getNpcImage = (npcId) => {
        return npcImageMap.get(npcId) || '';
    };

    // 按 30s 分组
    const grouped = useMemo(() => {
        const map = new Map();
        const sorted = [...events].sort((a, b) => {
            const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
            const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
            return tb - ta;
        });
        sorted.forEach((e) => {
            const bucket = getBucket(e.startTime || Date.now());
            if (!map.has(bucket)) map.set(bucket, []);
            map.get(bucket).push(e);
        });
        const buckets = Array.from(map.keys()).sort((a, b) => b - a);
        return buckets.map((b) => ({
            bucket: b,
            date: new Date(b),
            items: map.get(b).sort((a, b2) => new Date(b2.startTime) - new Date(a.startTime))
        }));
    }, [events]);

    const handlePanelClick = () => {
        if (!isOpen) {
            onToggle();
        }
    };

    return (
        <div
            onClick={handlePanelClick}
            className={`fixed right-6 w-80 bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0 cursor-default' : 'translate-x-full cursor-pointer'
                }`}
            style={{
                top: `calc(var(--topbar-h, 64px) + 16px)`,
                bottom: '16px'
            }}
        >
            {/* 标题 */}
            <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Events
                </h2>
            </div>

            {/* 事件列表 */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
                {grouped.length === 0 && (
                    <div className="text-white/50 text-center py-8">暂无事件</div>
                )}
                {grouped.map((group, gi) => (
                    <div key={group.bucket} className="space-y-3">
                        <div className="sticky top-0 z-10 -mx-4 px-4 py-1.5 flex items-center gap-2 bg-black/10 backdrop-blur-md border-b border-white/5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-white text-xs font-semibold tracking-wide">{formatGroupTime(group.date)}</span>
                        </div>
                        {group.items.map((event, index) => (
                            <div
                                key={`${event.npcId}-${group.bucket}-${index}`}
                                className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-300 cursor-pointer group border border-white/5 hover:border-primary/30"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectNpcEvents && onSelectNpcEvents(event.npcId);
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20 group-hover:ring-primary/50 transition-all">
                                        <img
                                            src={getNpcImage(event.npcId)}
                                            alt={event.npcName}
                                            className="w-full h-full object-cover object-top"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-sm mb-0.5">{event.npcName}</h3>
                                        <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                                            {event.action || '（暂无行为描述）'}
                                        </p>
                                        {event.targetLocation && (
                                            <p className="text-gray-400 text-[11px] leading-snug truncate">
                                                位置：{event.targetLocation}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 text-gray-500 group-hover:text-primary transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default GameEventsPanel;
