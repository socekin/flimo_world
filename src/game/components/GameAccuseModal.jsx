import { useState, useEffect } from 'react';

/**
 * GameAccuseModal - 指控嫌疑人选择弹窗
 * 玩家选择一个 NPC 作为凶手
 */
function GameAccuseModal({ npcs = [], onAccuse, onClose }) {
    const [selectedNpcId, setSelectedNpcId] = useState(null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (confirming) {
                    setConfirming(false);
                } else {
                    onClose?.();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [confirming, onClose]);

    const selectedNpc = npcs.find(n => n.id === selectedNpcId);

    const handleConfirm = () => {
        if (!selectedNpcId) return;
        if (confirming) {
            onAccuse?.(selectedNpcId);
        } else {
            setConfirming(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/80" onClick={onClose} />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl bg-black/90 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-8 animate-fade-in">
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 标题 */}
                <div className="text-center mb-8">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/60">Accusation</p>
                    <h2 className="text-3xl font-bold text-white mt-1">🔍 指认凶手</h2>
                    <p className="text-white/70 mt-2">选择你认为的真凶，一旦指认将进入结局</p>
                </div>

                {/* NPC 网格 */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
                    {npcs.map(npc => (
                        <button
                            key={npc.id}
                            onClick={() => setSelectedNpcId(npc.id)}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedNpcId === npc.id
                                    ? 'border-primary ring-2 ring-primary/50 scale-105'
                                    : 'border-white/10 hover:border-white/30'
                                }`}
                        >
                            <div className="aspect-[3/4] bg-white/5">
                                <img
                                    src={npc.image}
                                    alt={npc.name}
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate text-center">{npc.name}</p>
                            </div>
                            {selectedNpcId === npc.id && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* 确认区域 */}
                <div className="flex flex-col items-center gap-4">
                    {confirming && selectedNpc && (
                        <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl px-6 py-3 text-center">
                            <p className="text-rose-200 font-semibold">
                                确定要指认 <span className="text-white">{selectedNpc.name}</span> 为凶手吗？
                            </p>
                            <p className="text-rose-200/70 text-sm mt-1">此操作不可撤销，将进入游戏结局</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {confirming && (
                            <button
                                onClick={() => setConfirming(false)}
                                className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                            >
                                取消
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedNpcId}
                            className={`px-8 py-3 rounded-full font-semibold transition-all ${selectedNpcId
                                    ? confirming
                                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                        : 'bg-primary hover:bg-primary/80 text-white'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }`}
                        >
                            {confirming ? '⚠️ 确认指认' : '指认此人'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameAccuseModal;
