import { useEffect, useMemo, useRef, useState } from 'react';
import { chatWithNpc, getNpcDetails, thinkNpc, closeUserChat, getChatDetails, openNpcChat } from '../api/npcService';
import { avatarMap } from '../data/npcData';

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

function ChatPanel({ npc, npcApiId, sessionId, sessionStatus, currentGameTime, onClose, onAfterThink, onChatStart }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState(null);
  const hasClosedChatRef = useRef(false);
  const hasTriggeredThinkRef = useRef(false);
  const hasOpenedChatRef = useRef(false);
  const historyLoadIdRef = useRef(0);
  const closingToastRef = useRef(null);
  const closingToastTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const onChatStartRef = useRef(onChatStart);
  const onAfterThinkRef = useRef(onAfterThink);
  const listRef = useRef(null);

  const npcAvatar = avatarMap[npc.name] || npc.image;
  const formatNow = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    onChatStartRef.current = onChatStart;
  }, [onChatStart]);
  useEffect(() => {
    onAfterThinkRef.current = onAfterThink;
  }, [onAfterThink]);

  // Esc to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset state when switching NPC or reopening
  useEffect(() => {
    setMessages([]);
    setChatError(null);
    setIsThinking(false);
    hasClosedChatRef.current = false;
    hasTriggeredThinkRef.current = false;
    hasOpenedChatRef.current = false;
    onChatStartRef.current?.(npc.id);
  }, [npc.id]);

  const parseGameTimeToMinutes = (timeStr) => {
    if (!timeStr) return -Infinity;
    const match = /Day\s+(\d+),\s*(\d+):(\d+)\s*(AM|PM)/i.exec(timeStr);
    if (!match) return -Infinity;
    const day = Number(match[1]) || 0;
    let hour = Number(match[2]) || 0;
    const minute = Number(match[3]) || 0;
    const ampm = match[4].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return day * 24 * 60 + hour * 60 + minute;
  };

  const showClosingToast = (text = 'Leaving chat...') => {
    if (closingToastRef.current) return closingToastRef.current;
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.bottom = '32px';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '9999';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '999px';
    el.style.background = 'rgba(0,0,0,0.7)';
    el.style.color = '#fff';
    el.style.fontSize = '12px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.innerHTML = `<span class="dot" style="width:8px;height:8px;border-radius:50%;background:#a5b4fc;display:inline-block;animation:pulse 1s infinite;"></span>${text}`;

    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
    `;
    el.appendChild(style);
    document.body.appendChild(el);
    closingToastRef.current = el;
    return el;
  };

  const removeClosingToast = () => {
    const el = closingToastRef.current;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    closingToastRef.current = null;
    if (closingToastTimerRef.current) {
      clearTimeout(closingToastTimerRef.current);
      closingToastTimerRef.current = null;
    }
  };

  // Fetch history: call chat detail for each chat_id, merge as messages
  useEffect(() => {
    if (!sessionId || sessionStatus !== 'ready') return;
    const loadId = historyLoadIdRef.current + 1;
    historyLoadIdRef.current = loadId;

    const npcIdForApi = npcApiId || `npc_${npc.id}`;
    setChatError(null);
    setIsThinking(true);
    getNpcDetails(sessionId, npcIdForApi)
      .then(async (res) => {
        if (historyLoadIdRef.current !== loadId) return;
        const userHistory = Array.isArray(res?.user_chat_history) ? res.user_chat_history : [];
        const activeChat = Array.isArray(res?.active_chat) ? res.active_chat : [];
        const details = await Promise.all(
          userHistory.map(async (item) => {
            try {
              const detail = await getChatDetails(sessionId, npcIdForApi, item.chat_id);
              return { item, detail };
            } catch (err) {
              console.warn('load chat detail failed', err);
              return { item, detail: null };
            }
          })
        );
        // Sort by end time, ensure older chats come first
        details.sort((a, b) => {
          const va = parseGameTimeToMinutes(a.item.end_time || a.item.start_time);
          const vb = parseGameTimeToMinutes(b.item.end_time || b.item.start_time);
          return va - vb;
        });
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

        const shouldOpen = merged.length === 0 && activeMessages.length === 0;
        if (shouldOpen && !hasOpenedChatRef.current) {
          hasOpenedChatRef.current = true;
          try {
            const openRes = await openNpcChat(sessionId, npcIdForApi, {
              current_time: currentGameTime || formatNow()
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
            setChatError(err?.message || 'Failed to load greeting');
          }
        }
      })
      .catch((err) => {
        if (historyLoadIdRef.current !== loadId) return;
        setChatError(err?.message || 'Failed to load history');
      })
      .finally(() => {
        if (historyLoadIdRef.current !== loadId) return;
        setIsThinking(false);
      });
  }, [npc.id, npcApiId, sessionId, sessionStatus]);

  // Trigger summary and think on chat close (once only)
  const handleClose = async () => {
    const npcIdForApi = npcApiId || `npc_${npc.id}`;
    const timePayload = { current_time: currentGameTime || formatNow() };

    showClosingToast();
    // 安全兜底：若请求异常卡住，最多展示 10s
    closingToastTimerRef.current = setTimeout(removeClosingToast, 10000);

    // Execute asynchronously in background, don't block close
    (async () => {
      if (sessionId && sessionStatus === 'ready') {
        if (!hasClosedChatRef.current) {
          hasClosedChatRef.current = true;
          try {
            await closeUserChat(sessionId, npcIdForApi, timePayload);
          } catch (err) {
            console.warn('Close chat failed', err);
          }
        }

        if (!hasTriggeredThinkRef.current) {
          hasTriggeredThinkRef.current = true;
          try {
            const res = await thinkNpc(sessionId, npcIdForApi, timePayload);
            onAfterThinkRef.current?.(npc.id, res?.behavior?.target_location, res?.behavior);
          } catch (err) {
            console.warn('NPC think failed on chat close', err);
            onAfterThinkRef.current?.(npc.id, null, null);
          }
        }
      } else {
        onAfterThinkRef.current?.(npc.id, null, null);
      }
      removeClosingToast();
    })();

    onClose?.();
  };

  // Scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // 组件卸载不强制移除 toast，等待后台完成或兜底超时

  // 分组：按自然日
  const groups = useMemo(() => {
    const map = new Map();
    messages.forEach(msg => {
      const key = formatDate(msg.time);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(msg);
    });
    return Array.from(map.entries());
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    if (!sessionId) {
      setChatError('Session not initialized. Please wait or refresh.');
      return;
    }
    if (text.length > 1000) return; // Simple limit

    const now = new Date();
    const myMsg = { id: `p-${now.getTime()}`, role: 'player', text, time: now };
    setMessages(prev => [...prev, myMsg]);
    setInput('');

    setIsThinking(true);
    setChatError(null);
    try {
      const npcIdForApi = npcApiId || `npc_${npc.id}`;
      const response = await chatWithNpc(sessionId, {
        npc_id: npcIdForApi,
        user_message: text,
        current_time: currentGameTime || formatNow()
      });
      const replyText = response?.npc_reply || '';
      const reply = { id: `n-${Date.now()}`, role: 'npc', text: replyText, time: new Date() };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      setChatError(err?.message || 'Failed to send message');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[1200px] bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in grid grid-cols-12 h-full"
        style={{
          maxHeight: 'calc(100vh - var(--topbar-h, 36px) - 48px)',
          height: 'calc(100vh - var(--topbar-h, 36px) - 48px)'
        }}
      >
        {/* Close */}
        <button onClick={handleClose} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left: fixed */}
        <div className="col-span-4 flex flex-col min-h-0">
          <div className="p-10 flex flex-col items-center h-full sticky top-0">
            <div className="w-full aspect-[3/5] flex items-end justify-center">
              <img src={npc.image} alt={npc.name} className="max-h-full object-contain scale-100" />
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-white drop-shadow text-center">{npc.name}</h2>
          </div>
        </div>

        {/* Right: chat area */}
        <div className="col-span-8 border-l border-white/10 flex flex-col overflow-hidden min-h-0">
          <div className="px-8 pt-10 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">Chat History</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${sessionStatus === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : sessionStatus === 'error'
                      ? 'bg-rose-500/20 text-rose-100'
                      : 'bg-white/10 text-white/80'
                  }`}
              >
                {sessionStatus === 'ready' ? 'Session Ready' : sessionStatus === 'error' ? 'Session Error' : 'Session Init...'}
              </span>
            </div>
            {chatError && (
              <p className="text-rose-200 text-sm mt-2 bg-rose-500/10 rounded-lg px-3 py-2 border border-rose-500/20">
                {chatError}
              </p>
            )}
          </div>

          {/* History list */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-8 space-y-5 min-h-0">
            {groups.map(([day, msgs]) => (
              <div key={day}>
                {/* Date separator */}
                <div className="flex items-center gap-4 my-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="text-white/70 text-xs tracking-widest">{day}</div>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="space-y-3">
                  {msgs.map((m) => (
                    <div key={m.id} className={`flex items-start gap-3 ${m.role === 'player' ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar (remove extra padding, reference HUD style) */}
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20">
                        <img
                          src={m.role === 'player' ? PLAYER_AVATAR : npcAvatar}
                          alt={m.role}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      {/* Bubble */}
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

          {/* Input area */}
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
                placeholder="Type your message. Enter to send / Shift+Enter for new line"
                className="w-full resize-none rounded-xl bg-white/10 text-white placeholder-white/40 px-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/60 leading-[1.4] min-h-[48px]"
                maxLength={1000}
              />
              <button
                onClick={send}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors"
                aria-label="Send message"
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

export default ChatPanel;
