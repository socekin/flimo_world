import { useEffect } from 'react';

/**
 * GameEndingModal - 游戏结局弹窗
 * 显示结局文案和返回按钮
 */

// 结局文案配置
const ENDING_COPY = {
    truth: {
        title: '🎯 真凶落网',
        description: '你成功指认了真正的凶手！案件的真相终于大白于天下。'
    },
    wrong: {
        title: '❓ 真相未明',
        description: '你指认的对象并非真凶。真正的罪犯仍逍遥法外，案件成为悬案...'
    }
};

function GameEndingModal({
    accusedNpc,
    trueCulpritName,
    onClose,
    onBackToLibrary
}) {
    // 判断是否正确
    const isCorrect = accusedNpc?.name === trueCulpritName;
    const outcome = isCorrect ? 'truth' : 'wrong';
    const endingCopy = ENDING_COPY[outcome];

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/90" />

            <div className="relative z-10 w-full max-w-2xl mx-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-10 animate-fade-in text-center">
                {/* 结果标志 */}
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                    }`}>
                    <span className="text-5xl">{isCorrect ? '✓' : '?'}</span>
                </div>

                {/* 标题 */}
                <h2 className="text-4xl font-bold text-white mb-4">
                    {endingCopy.title}
                </h2>

                {/* 指认对象 */}
                {accusedNpc && (
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <img
                            src={accusedNpc.image}
                            alt={accusedNpc.name}
                            className="w-16 h-16 rounded-full object-cover object-top border-2 border-white/20"
                        />
                        <div className="text-left">
                            <p className="text-white/60 text-sm">你指认的对象</p>
                            <p className="text-white text-xl font-semibold">{accusedNpc.name}</p>
                        </div>
                    </div>
                )}

                {/* 描述 */}
                <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-md mx-auto">
                    {endingCopy.description}
                </p>

                {/* 真凶揭示 */}
                {!isCorrect && trueCulpritName && (
                    <p className="text-amber-200/80 text-sm mb-8">
                        真正的凶手是：<span className="text-white font-semibold">{trueCulpritName}</span>
                    </p>
                )}

                {/* 按钮 */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                    >
                        继续探索
                    </button>
                    <button
                        onClick={onBackToLibrary}
                        className="px-6 py-3 rounded-full bg-primary hover:bg-primary/80 text-white font-semibold transition-colors"
                    >
                        返回游戏库
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GameEndingModal;
