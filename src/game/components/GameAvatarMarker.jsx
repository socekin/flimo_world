/**
 * GameAvatarMarker - NPC 头像标记组件（独立版本）
 * 复制自 AvatarMarker.jsx，用于 Dynamic Play
 */
function GameAvatarMarker({ npc, position, isSelected, onClick, mapBox, offset = { x: 0, y: 0 }, elevated = false, isInteracting = false }) {
    const hasBox = mapBox && mapBox.width > 0 && mapBox.height > 0;
    const left = hasBox
        ? mapBox.offsetX + (mapBox.width * position.xPct) / 100
        : `${position.xPct}%`;
    const top = hasBox
        ? mapBox.offsetY + (mapBox.height * position.yPct) / 100
        : `${position.yPct}%`;

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onClick(npc.id);
            }}
            className={`absolute cursor-pointer transition-all duration-300 group ${elevated ? 'z-20' : ''}`}
            style={{
                left,
                top,
                transform: `translate(-50%, -100%) translate(${offset.x || 0}px, ${offset.y || 0}px)`
            }}
        >
            {/* 头像容器 */}
            <div className={`relative transition-all duration-300 ${isSelected
                ? 'scale-110 shadow-2xl'
                : 'group-hover:scale-105 group-hover:shadow-xl'
                }`}>
                <img
                    src={npc.image}
                    alt={npc.name}
                    className="w-12 h-auto object-contain"
                />
                {/* 底部边框高亮效果 */}
                {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary animate-pulse"></div>
                )}
                {isInteracting && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                        <svg width="32" height="24" viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="28" height="16" rx="4" fill="#10b981" opacity="0.9" />
                            <polygon points="12,18 16,24 16,18" fill="#10b981" opacity="0.9" />
                            <circle cx="10" cy="10" r="1.5" fill="white">
                                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0s" />
                            </circle>
                            <circle cx="16" cy="10" r="1.5" fill="white">
                                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
                            </circle>
                            <circle cx="22" cy="10" r="1.5" fill="white">
                                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.8s" />
                            </circle>
                        </svg>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* 名字标签 */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md transition-all duration-300 bg-black/70 text-white text-sm opacity-0 group-hover:opacity-100">
                {npc.name}
            </div>
        </div>
    );
}

export default GameAvatarMarker;
