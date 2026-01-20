import { useEffect, useMemo, useState } from 'react';
import { getNpcDetails } from '../../api/npcService';

/**
 * GameNpcEventsPanel - NPC 事件历史面板（独立版本）
 * 显示单个 NPC 的行为历史、对话历史
 */

const parseTimeToMs = (timeStr) => {
    if (!timeStr) return -Infinity;
    const parsed = Date.parse(String(timeStr).replace(/-/g, '/'));
    if (!Number.isNaN(parsed)) return parsed;
    const match = /Day\s+(\d+),\s*(\d+):(\d+)\s*(AM|PM)?/i.exec(String(timeStr));
    if (!match) return -Infinity;
    const day = Number(match[1]) || 0;
    let hour = Number(match[2]) || 0;
    const minute = Number(match[3]) || 0;
    const ampm = (match[4] || '').toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return (day * 24 * 60 + hour * 60 + minute) * 60 * 1000;
};

function GameNpcEventsPanel({ npc, sessionId, onClose, onOpenChat }) {
    const [behaviorHistory, setBehaviorHistory] = useState([]);
    const [userChatHistory, setUserChatHistory] = useState([]);
    const [npcChatHistory, setNpcChatHistory] = useState([]);
    const [currentBehavior, setCurrentBehavior] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // 获取 NPC 详情
    useEffect(() => {
        if (!sessionId || !npc) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        const npcApiId = npc.name.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_');

        getNpcDetails(sessionId, npcApiId)
            .then((res) => {
                if (cancelled) return;
                setBehaviorHistory(res?.behavior_history || []);
                setUserChatHistory(res?.user_chat_history || []);
                setNpcChatHistory(res?.npc_chat_history || []);
                setCurrentBehavior(res?.behavior || null);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.message || '加载历史记录失败');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [npc, sessionId]);

    // 合并所有事件
    const allEvents = useMemo(() => {
        const events = [];

        // 行为历史
        (behaviorHistory || []).forEach((b, idx) => {
            events.push({
                id: `bh-${idx}`,
                type: 'behavior',
                label: 'Action',
                time: b.start_time,
                summary: b.action || '',
                location: b.target_location,
                sortValue: parseTimeToMs(b.start_time) + idx * 0.0001
            });
        });

        // 用户对话历史
        (userChatHistory || []).forEach((c, idx) => {
            events.push({
                id: c.chat_id || `uc-${idx}`,
                type: 'userChat',
                label: 'Chat With Player',
                time: c.end_time || c.start_time,
                summary: c.summary || '',
                topic: c.topic,
                sortValue: parseTimeToMs(c.end_time || c.start_time) + idx * 0.0001
            });
        });

        // NPC 对话历史
        (npcChatHistory || []).forEach((c, idx) => {
            events.push({
                id: `nc-${idx}`,
                type: 'npcChat',
                label: `Chat With ${c.other_npc || 'NPC'}`,
                time: c.end_time || c.start_time,
                summary: c.summary || '',
                topic: c.topic,
                sortValue: parseTimeToMs(c.end_time || c.start_time) + idx * 0.0001
            });
        });

        return events.sort((a, b) => b.sortValue - a.sortValue);
    }, [behaviorHistory, userChatHistory, npcChatHistory]);

    if (!npc) return null;

    return (
        <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[1200px] bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in flex flex-col"
                style={{ maxHeight: 'calc(100vh - var(--topbar-h, 36px) - 48px)' }}
            >
                {/* 关闭按钮 */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="grid grid-cols-12 gap-8 p-10 h-full">
                    {/* 左侧：NPC 头像 */}
                    <div className="col-span-4 flex flex-col items-center">
                        <div className="w-full aspect-[3/5] flex items-end justify-center">
                            <img src={npc.image} alt={npc.name} className="max-h-full object-contain" />
                        </div>
                        <h2 className="mt-4 text-3xl font-extrabold text-white drop-shadow text-center">{npc.name}</h2>

                        {/* Chat 按钮 */}
                        {onOpenChat && (
                            <button
                                onClick={() => onOpenChat(npc)}
                                className="mt-4 px-6 py-2 rounded-full bg-primary hover:bg-primary/80 text-white font-semibold transition-colors"
                            >
                                💬 开始对话
                            </button>
                        )}
                    </div>

                    {/* 右侧：事件列表 */}
                    <div className="col-span-8 flex flex-col overflow-hidden">
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Events History
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {loading ? (
                                <div className="text-white/60 text-sm">加载中...</div>
                            ) : error ? (
                                <div className="text-rose-200 text-sm">{error}</div>
                            ) : (
                                <>
                                    {/* 当前行为 */}
                                    {currentBehavior && (
                                        <div className="rounded-2xl bg-primary/15 border border-primary/30 p-4">
                                            <div className="flex items-center justify-between text-xs text-white/80">
                                                <span>{currentBehavior.start_time || '进行中'}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[11px]">Doing</span>
                                            </div>
                                            <div className="text-white/70 text-xs mt-1">Location: {currentBehavior.target_location || 'Unknown'}</div>
                                            <div className="text-white mt-2 text-sm leading-relaxed">{currentBehavior.action || '（无内容）'}</div>
                                        </div>
                                    )}

                                    {allEvents.length === 0 && !currentBehavior && (
                                        <div className="text-white/60 text-sm">暂无事件记录</div>
                                    )}

                                    {allEvents.map((item) => (
                                        <div key={item.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                                            <div className="flex items-center justify-between text-xs text-white/70">
                                                <span>{item.time || '无时间'}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] ${item.type === 'userChat' ? 'bg-blue-500/30 text-blue-200' :
                                                    item.type === 'npcChat' ? 'bg-purple-500/30 text-purple-200' :
                                                        'bg-white/10 text-white/80'
                                                    }`}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            {item.topic && <div className="text-white/70 text-xs mt-1">{item.topic}</div>}
                                            {item.location && <div className="text-white/70 text-xs mt-1">Location: {item.location}</div>}
                                            <div className="text-white mt-2 text-sm leading-relaxed">{item.summary || '（无摘要）'}</div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameNpcEventsPanel;
