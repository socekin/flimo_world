import { useEffect } from 'react';

/**
 * GameInfoPanel - NPC 信息面板（独立版本）
 * 复制自 InfoPanel.jsx，移除对 iconMap 的依赖
 * 使用 SVG 图标替代图片图标
 */

// 字段图标映射
const fieldIcons = {
    role: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
    ),
    description: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
    ),
    age: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    gender: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    goal: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    recentEvents: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    shortTermPlan: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
    ),
    carryWith: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
        </svg>
    ),
    socialNetwork: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    )
};

function GameInfoPanel({ npc, allNpcs = [], onClose }) {
    // 构建 NPC ID/name -> image 映射
    const npcImageMap = {};
    allNpcs.forEach(n => {
        if (n.id) npcImageMap[n.id] = n.image;
        if (n.name) {
            npcImageMap[n.name] = n.image;
            npcImageMap[n.name.toLowerCase().replace(/\s+/g, '_')] = n.image;
            npcImageMap[n.name.toLowerCase().replace(/\.\s*/g, '').replace(/\s+/g, '_')] = n.image;
        }
    });
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!npc) return null;

    // 格式化显示值
    const formatValue = (value) => {
        if (Array.isArray(value)) {
            return value.join('、');
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value;
    };

    const infoFields = [
        { key: 'role', label: 'Role', value: formatValue(npc.role) },
        { key: 'description', label: 'Description', value: formatValue(npc.description) },
        { key: 'age', label: 'Age', value: formatValue(npc.age) },
        { key: 'gender', label: 'Gender', value: formatValue(npc.gender) },
        { key: 'goal', label: 'Goal', value: formatValue(npc.goal) },
        { key: 'recentEvents', label: 'Recent events', value: formatValue(npc.recentEvents) },
        { key: 'shortTermPlan', label: 'Short-term plan', value: formatValue(npc.shortTermPlan) },
        { key: 'carryWith', label: 'Carry with', value: formatValue(npc.carryWith) },
    ].filter(row => row.value);

    return (
        <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[1200px] bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in grid grid-cols-12"
                style={{
                    maxHeight: 'calc(100vh - var(--topbar-h, 36px) - 48px)',
                    height: 'calc(100vh - var(--topbar-h, 36px) - 48px)'
                }}
            >
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 左侧头像区 */}
                <div className="col-span-4 h-full">
                    <div className="p-10 flex flex-col items-center h-full sticky top-0">
                        <div className="w-full aspect-[3/5] flex items-end justify-center">
                            <img src={npc.image} alt={npc.name} className="max-h-full object-contain" />
                        </div>
                        <h2 className="mt-4 text-3xl font-extrabold text-white drop-shadow text-center">{npc.name}</h2>
                    </div>
                </div>

                {/* 右侧信息区 */}
                <div className="col-span-8 flex flex-col overflow-hidden h-full">
                    <div className="p-10 pb-6 flex-shrink-0">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Info
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-4 text-sm">
                        {infoFields.map((row) => (
                            <div key={row.key} className="flex items-start gap-3">
                                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-white/80">
                                    {fieldIcons[row.key] || fieldIcons.description}
                                </div>
                                <div>
                                    <p className="text-white/60 text-[11px] uppercase tracking-wider">{row.label}</p>
                                    <p className="text-white leading-relaxed">{row.value}</p>
                                </div>
                            </div>
                        ))}

                        {npc.socialNetwork && typeof npc.socialNetwork === 'object' && !Array.isArray(npc.socialNetwork) && (
                            <div className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="text-white/80">{fieldIcons.socialNetwork}</div>
                                    <p className="text-white/60 text-[11px] uppercase tracking-wider">Social network</p>
                                </div>
                                <div className="flex flex-wrap items-start gap-6">
                                    {Object.entries(npc.socialNetwork).map(([npcKey, relation]) => {
                                        const image = npcImageMap[npcKey] || npcImageMap[npcKey.toLowerCase()] || '';
                                        // 将 snake_case 转换为显示名称
                                        const displayName = npcKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        return (
                                            <div key={npcKey} className="flex flex-col items-center w-24">
                                                {image ? (
                                                    <img src={image} alt={displayName} className="w-20 h-28 object-contain" />
                                                ) : (
                                                    <div className="w-20 h-28 bg-white/10 rounded-lg flex items-center justify-center text-2xl">👤</div>
                                                )}
                                                <p className="text-white text-sm font-semibold mt-1 text-center">{displayName}</p>
                                                <p className="text-white/70 text-xs text-center">{relation}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {npc.socialNetwork && Array.isArray(npc.socialNetwork) && npc.socialNetwork.length > 0 && (
                            <div className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="text-white/80">{fieldIcons.socialNetwork}</div>
                                    <p className="text-white/60 text-[11px] uppercase tracking-wider">Social network</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    {npc.socialNetwork.map((s, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            {s.image && (
                                                <img src={s.image} alt={s.name} className="w-20 h-28 object-contain" />
                                            )}
                                            <p className="text-white text-sm font-semibold mt-1">{s.name}</p>
                                            <p className="text-white/70 text-xs text-center">{s.relation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameInfoPanel;
