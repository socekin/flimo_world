import { useState, useEffect } from 'react';

/**
 * GameIntroModal - 游戏开场提示弹窗
 * 显示 gameTips 内容，玩家确认后开始游戏
 */
function GameIntroModal({ title, gameTips = [], onStart }) {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (currentTipIndex < gameTips.length - 1) {
                    setCurrentTipIndex(prev => prev + 1);
                } else {
                    onStart?.();
                }
            }
            if (e.key === 'Escape') {
                onStart?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentTipIndex, gameTips.length, onStart]);

    const currentTip = gameTips[currentTipIndex];
    const isLastTip = currentTipIndex >= gameTips.length - 1;

    const handleNext = () => {
        if (isLastTip) {
            onStart?.();
        } else {
            setCurrentTipIndex(prev => prev + 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/90" />

            {/* 内容区 */}
            <div className="relative z-10 w-full max-w-2xl mx-4 animate-fade-in">
                {/* 标题 */}
                <h1 className="text-4xl font-bold text-white text-center mb-8 drop-shadow-lg">
                    {title}
                </h1>

                {/* 提示卡片 */}
                {currentTip && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 mb-6">
                        {/* 提示标题 */}
                        {currentTip.title && (
                            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-2xl">💡</span>
                                {currentTip.title}
                            </h2>
                        )}

                        {/* 提示内容 */}
                        <p className="text-white/90 text-lg leading-relaxed whitespace-pre-wrap">
                            {currentTip.content || currentTip}
                        </p>
                    </div>
                )}

                {/* 无提示时的默认内容 */}
                {(!gameTips || gameTips.length === 0) && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 mb-6 text-center">
                        <p className="text-white/90 text-lg">
                            欢迎进入游戏！探索世界，与 NPC 交流，发现真相。
                        </p>
                    </div>
                )}

                {/* 进度指示器 */}
                {gameTips.length > 1 && (
                    <div className="flex justify-center gap-2 mb-6">
                        {gameTips.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentTipIndex ? 'bg-primary w-6' : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* 按钮区 */}
                <div className="flex justify-center">
                    <button
                        onClick={handleNext}
                        className="px-8 py-3 rounded-full bg-primary hover:bg-primary/80 text-white font-semibold text-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                        {isLastTip || gameTips.length === 0 ? '🎮 Start Story' : 'Next →'}
                    </button>
                </div>

                {/* 跳过提示 */}
                {gameTips.length > 1 && !isLastTip && (
                    <button
                        onClick={onStart}
                        className="block mx-auto mt-4 text-white/50 hover:text-white/80 text-sm transition-colors"
                    >
                        Press ESC to Skip
                    </button>
                )}
            </div>
        </div>
    );
}

export default GameIntroModal;
