import { useEffect, useMemo, useRef, useState } from 'react';
import { chatWithNpc, getNpcDetails, thinkNpc, closeUserChat, getChatDetails, openNpcChat } from '../../api/npcService';

/**
 * GameNpcChatPanel - NPC 对话面板（独立版本）
 * 复制自 NpcChatPanel.jsx，移除对 avatarMap 的依赖
 */

const PLAYER_AVATAR = '/img/play/Player Avatar.png';

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function formatNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function GameNpcChatPanel({
    npc,
    sessionId,
    onClose,
    onAfterThink,
    onChatStart
}) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [chatError, setChatError] = useState(null);
    const hasClosedChatRef = useRef(false);
    const hasTriggeredThinkRef = useRef(false);
    const hasOpenedChatRef = useRef(false);
    const historyLoadIdRef = useRef(0);
    const listRef = useRef(null);

    const npcApiId = npc?.name?.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_') || '';
    const npcAvatar = npc?.image || '';

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // 切换 NPC 或打开时重置状态
    useEffect(() => {
        setMessages([]);
        setChatError(null);
        setIsThinking(false);
        hasClosedChatRef.current = false;
        hasTriggeredThinkRef.current = false;
        hasOpenedChatRef.current = false;
        onChatStart?.(npc?.id);
    }, [npc?.id]);

    // 加载历史记录
    useEffect(() => {
        if (!sessionId || !npc) return;

        const loadId = historyLoadIdRef.current + 1;
        historyLoadIdRef.current = loadId;

        setChatError(null);
        setIsThinking(true);

        getNpcDetails(sessionId, npcApiId)
            .then(async (res) => {
                if (historyLoadIdRef.current !== loadId) return;

                const userHistory = Array.isArray(res?.user_chat_history) ? res.user_chat_history : [];
                const activeChat = Array.isArray(res?.active_chat) ? res.active_chat : [];

                // 加载历史对话详情
                const details = await Promise.all(
                    userHistory.map(async (item) => {
                        try {
                            const detail = await getChatDetails(sessionId, npcApiId, item.chat_id);
                            return { item, detail };
                        } catch (err) {
                            console.warn('load chat detail failed', err);
                            return { item, detail: null };
                        }
                    })
                );

                // 合并消息
                const merged = [];
                details.forEach(({ detail }) => {
                    if (detail?.messages) {
                        detail.messages.forEach((m, idx) => {
                            merged.push({
                                id: `hist-${detail.chat_id || ''}-${idx}`,
                                role: m.role === 'user' ? 'player' : 'npc',
                                text: m.content || '',
                                time: new Date()
                            });
                        });
                    }
                });

                const activeMessages = activeChat.map((m, idx) => ({
                    id: `active-${npc.id}-${idx}`,
                    role: m.role === 'user' ? 'player' : 'npc',
                    text: m.content || '',
                    time: new Date()
                }));

                setMessages([...merged, ...activeMessages]);

                // 首次开场白
                const shouldOpen = merged.length === 0 && activeMessages.length === 0;
                if (shouldOpen && !hasOpenedChatRef.current) {
                    hasOpenedChatRef.current = true;
                    try {
                        const openRes = await openNpcChat(sessionId, npcApiId, {
                            current_time: formatNow()
                        });
                        if (historyLoadIdRef.current !== loadId) return;
                        if (openRes?.opened && openRes?.npc_reply) {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    id: `open-${Date.now()}`,
                                    role: 'npc',
                                    text: openRes.npc_reply || '',
                                    time: new Date()
                                }
                            ]);
                        }
                    } catch (err) {
                        if (historyLoadIdRef.current !== loadId) return;
                        setChatError(err?.message || '开场白加载失败');
                    }
                }
            })
            .catch((err) => {
                if (historyLoadIdRef.current !== loadId) return;
                setChatError(err?.message || '加载历史记录失败');
            })
            .finally(() => {
                if (historyLoadIdRef.current !== loadId) return;
                setIsThinking(false);
            });
    }, [npc?.id, sessionId]);

    // 关闭处理
    const handleClose = async () => {
        if (sessionId && !hasClosedChatRef.current) {
            hasClosedChatRef.current = true;
            try {
                await closeUserChat(sessionId, npcApiId, { current_time: formatNow() });
            } catch (err) {
                console.warn('Close chat failed', err);
            }
        }

        if (sessionId && !hasTriggeredThinkRef.current) {
            hasTriggeredThinkRef.current = true;
            try {
                const res = await thinkNpc(sessionId, npcApiId, { current_time: formatNow() });
                onAfterThink?.(npc?.id, res?.behavior?.target_location, res?.behavior);
            } catch (err) {
                console.warn('NPC think failed on chat close', err);
                onAfterThink?.(npc?.id, null, null);
            }
        }

        onClose?.();
    };

    // 滚动到底
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    // 分组按日期
    const groups = useMemo(() => {
        const map = new Map();
        messages.forEach(msg => {
            const key = formatDate(msg.time);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(msg);
        });
        return Array.from(map.entries());
    }, [messages]);

    // 发送消息
    const send = async () => {
        const text = input.trim();
        if (!text || isThinking) return;
        if (!sessionId) {
            setChatError('会话未初始化，请稍候或刷新后重试。');
            return;
        }
        if (text.length > 1000) return;

        const now = new Date();
        const myMsg = { id: `p-${now.getTime()}`, role: 'player', text, time: now };
        setMessages(prev => [...prev, myMsg]);
        setInput('');

        setIsThinking(true);
        setChatError(null);
        try {
            const response = await chatWithNpc(sessionId, {
                npc_id: npcApiId,
                user_message: text,
                current_time: formatNow()
            });
            const replyText = response?.npc_reply || '';
            const reply = { id: `n-${Date.now()}`, role: 'npc', text: replyText, time: new Date() };
            setMessages(prev => [...prev, reply]);
        } catch (err) {
            setChatError(err?.message || '消息发送失败');
        } finally {
            setIsThinking(false);
        }
    };

    if (!npc) return null;

    return (
        <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[1200px] bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in grid grid-cols-12"
                style={{
                    maxHeight: 'calc(100vh - var(--topbar-h, 36px) - 48px)',
                    height: 'calc(100vh - var(--topbar-h, 36px) - 48px)'
                }}
            >
                {/* 关闭按钮 */}
                <button
                    onClick={handleClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 左侧：NPC 头像 */}
                <div className="col-span-4 flex flex-col min-h-0">
                    <div className="p-10 flex flex-col items-center h-full sticky top-0">
                        <div className="w-full aspect-[3/5] flex items-end justify-center">
                            <img src={npc.image} alt={npc.name} className="max-h-full object-contain" />
                        </div>
                        <h2 className="mt-4 text-3xl font-extrabold text-white drop-shadow text-center">{npc.name}</h2>
                    </div>
                </div>

                {/* 右侧：对话区 */}
                <div className="col-span-8 border-l border-white/10 flex flex-col overflow-hidden min-h-0">
                    <div className="px-8 pt-10 pb-4 flex-shrink-0">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            💬 Chat
                        </h3>
                        {chatError && (
                            <p className="text-rose-200 text-sm mt-2 bg-rose-500/10 rounded-lg px-3 py-2 border border-rose-500/20">
                                {chatError}
                            </p>
                        )}
                    </div>

                    {/* 消息列表 */}
                    <div ref={listRef} className="flex-1 overflow-y-auto px-8 space-y-5 min-h-0">
                        {groups.map(([day, msgs]) => (
                            <div key={day}>
                                <div className="flex items-center gap-4 my-2">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <div className="text-white/70 text-xs tracking-widest">{day}</div>
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>

                                <div className="space-y-3">
                                    {msgs.map((m) => (
                                        <div key={m.id} className={`flex items-start gap-3 ${m.role === 'player' ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20">
                                                <img
                                                    src={m.role === 'player' ? PLAYER_AVATAR : npcAvatar}
                                                    alt={m.role}
                                                    className="w-full h-full object-cover object-top"
                                                />
                                            </div>
                                            <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${m.role === 'player' ? 'bg-primary text-white' : 'bg-white/10 text-white'}`}>
                                                <p className="whitespace-pre-wrap leading-relaxed text-sm">{m.text}</p>
                                                <div className="text-[10px] text-white/60 mt-1 text-right">{formatTime(m.time)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20">
                                    <img src={npcAvatar} alt="npc" className="w-full h-full object-cover object-top" />
                                </div>
                                <div className="bg-white/10 text-white rounded-2xl px-4 py-2">
                                    <span className="inline-flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" />
                                        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '120ms' }} />
                                        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '240ms' }} />
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 输入区 */}
                    <div className="p-6 border-t border-white/10 flex items-center flex-shrink-0">
                        <div className="relative w-full">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                rows={1}
                                placeholder="Type your message, Enter to send..."
                                className="w-full resize-none rounded-xl bg-white/10 text-white placeholder-white/40 px-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/60"
                                maxLength={1000}
                            />
                            <button
                                onClick={send}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors"
                                aria-label="Send"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12l14-7-3 7 3 7-14-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameNpcChatPanel;
