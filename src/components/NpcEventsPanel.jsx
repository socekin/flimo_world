import { useEffect, useMemo, useRef, useState } from 'react';
import { npcData, avatarMap } from '../data/npcData';
import { npcEvents } from '../data/npcEvents';
import { getNpcDetails } from '../api/npcService';

const parseTimeToMs = (timeStr) => {
  if (!timeStr) return -Infinity;
  // New format: YYYY-MM-DD HH:mm:ss
  const parsed = Date.parse(timeStr.replace(/-/g, '/')); // Compatibility handling
  if (!Number.isNaN(parsed)) return parsed;
  // Old format: Day 1, 08:00 AM
  const match = /Day\s+(\d+),\s*(\d+):(\d+)\s*(AM|PM)/i.exec(timeStr);
  if (!match) return -Infinity;
  const day = Number(match[1]) || 0;
  let hour = Number(match[2]) || 0;
  const minute = Number(match[3]) || 0;
  const ampm = match[4].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return (day * 24 * 60 + hour * 60 + minute) * 60 * 1000;
};

function NpcEventsPanel({ npc, sessionId, sessionStatus, onClose }) {
  const [playingEventId, setPlayingEventId] = useState(null);
  const [behaviorHistory, setBehaviorHistory] = useState([]);
  const [userChatHistory, setUserChatHistory] = useState([]);
  const [npcChatHistory, setNpcChatHistory] = useState([]);
  const [currentBehavior, setCurrentBehavior] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const videoRef = useRef(null);
  const listRef = useRef(null);
  const listScrollRef = useRef(0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (playingEventId) {
          if (videoRef.current) {
            try { videoRef.current.pause(); } catch { /* ignore pause errors */ }
          }
          setPlayingEventId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, playingEventId]);

  const sampleEvents = useMemo(() => {
    return npcEvents
      .filter(e => e.npcId === npc.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [npc]);

  // Fetch history data
  useEffect(() => {
    if (!sessionId || sessionStatus !== 'ready') return;
    let cancelled = false;
    setLoadingHistory(true);
    setHistoryError(null);
    const npcIdForApi = `npc_${npc.id}`;
    getNpcDetails(sessionId, npcIdForApi)
      .then((res) => {
        if (cancelled) return;
        setBehaviorHistory(res?.behavior_history || []);
        setUserChatHistory(res?.user_chat_history || []);
        setNpcChatHistory(res?.npc_chat_history || []);
        setCurrentBehavior(res?.behavior || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setHistoryError(err?.message || 'Failed to load history');
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [npc.id, sessionId, sessionStatus]);

  const behaviorEvents = useMemo(() => {
    return (behaviorHistory || [])
      .map((b, idx) => {
        const sortValue = parseTimeToMs(b.start_time) + idx * 0.0001;
        return {
          id: `bh-${idx}-${npc.id}`,
          start: b.start_time,
          end: b.end_time,
          location: b.target_location || 'Unknown location',
          action: b.action || '',
          status: b.status || '',
          sortValue
        };
      })
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [behaviorHistory, npc.id]);

  const userChatSummaries = useMemo(() => {
    return (userChatHistory || [])
      .map((c, idx) => {
        const sortValue = parseTimeToMs(c.end_time || c.start_time) + idx * 0.0001;
        return {
          id: c.chat_id || `uc-${idx}-${npc.id}`,
          summary: c.summary || '',
          topic: c.topic || '',
          start: c.start_time,
          end: c.end_time,
          sortValue
        };
      })
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [userChatHistory, npc.id]);

  const npcChatSummaries = useMemo(() => {
    return (npcChatHistory || [])
      .map((c, idx) => {
        const sortValue = parseTimeToMs(c.end_time || c.start_time) + idx * 0.0001;
        return {
          id: `nc-${idx}-${npc.id}`,
          summary: c.summary || '',
          topic: c.topic || '',
          otherNpc: c.other_npc || '',
          start: c.start_time,
          end: c.end_time,
          sortValue
        };
      })
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [npcChatHistory, npc.id]);

  const getNpcAvatar = (id) => {
    const n = npcData.find(x => x.id === id);
    return n ? (avatarMap[n.name] || n.image) : '';
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[1200px] bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in flex flex-col relative"
        style={{ maxHeight: 'calc(100vh - var(--topbar-h, 36px) - 48px)' }}
      >
        {/* Close */}
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Playback view */}
        {playingEventId ? (
          <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
            {(() => {
              const ev = sampleEvents.find(x => x.id === playingEventId);
              if (!ev) return null;
              return (
                <video
                  ref={videoRef}
                  src={ev.preview?.url || ''}
                  poster={ev.preview?.poster}
                  className="w-full h-full object-contain"
                  autoPlay
                  controls
                />
              );
            })()}
            <button
              onClick={() => {
                if (videoRef.current) { try { videoRef.current.pause(); } catch { /* ignore pause errors */ } }
                setPlayingEventId(null);
                if (listRef.current) listRef.current.scrollTop = listScrollRef.current || 0;
              }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-8 p-10">
          {/* Left side: full body + name */}
          <div className="col-span-4 flex flex-col items-center sticky top-0 self-start">
            <div className="w-full aspect-[3/5] flex items-end justify-center">
              <img src={npc.image} alt={npc.name} className="max-h-full object-contain scale-100" />
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-white drop-shadow">{npc.name}</h2>
          </div>

          {/* Right side */}
          <div className="col-span-8 max-h-[calc(100vh-140px)] pr-2">
            <div ref={listRef} className="overflow-y-auto h-full space-y-6">
              {loadingHistory ? (
                <div className="text-white/60 text-sm">Loading...</div>
              ) : historyError ? (
                <div className="text-rose-200 text-sm">{historyError}</div>
              ) : (
                <>
                  {/* Current behavior */}
                  {currentBehavior && (
                    <div className="rounded-2xl bg-primary/15 border border-primary/30 p-4">
                      <div className="flex items-center justify-between text-xs text-white/80">
                        <span>{currentBehavior.start_time || 'In progress'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[11px]">Doing</span>
                      </div>
                      <div className="text-white/70 text-xs mt-1">Location: {currentBehavior.target_location || 'Unknown'}</div>
                      <div className="text-white mt-2 text-sm leading-relaxed whitespace-pre-wrap">{currentBehavior.action || '(No content)'}</div>
                    </div>
                  )}

                  {(userChatSummaries.length === 0 &&
                    npcChatSummaries.length === 0 &&
                    behaviorEvents.length === 0) && (
                      <div className="text-white/60 text-sm">No event records yet</div>
                    )}
                  {[
                    ...userChatSummaries.map((c) => ({
                      type: 'userChat',
                      time: c.end || c.start,
                      label: 'Chat With Player',
                      summary: c.summary,
                      topic: c.topic,
                      id: c.id,
                      sortValue: c.sortValue
                    })),
                    ...npcChatSummaries.map((c) => ({
                      type: 'npcChat',
                      time: c.end || c.start,
                      label: `Chat With ${c.otherNpc || 'NPC'}`,
                      summary: c.summary,
                      topic: c.topic,
                      id: c.id,
                      sortValue: c.sortValue
                    })),
                    ...behaviorEvents.map((ev) => ({
                      type: 'behavior',
                      time: ev.start,
                      label: 'Action',
                      summary: ev.action,
                      topic: ev.location ? `Location: ${ev.location}` : '',
                      id: ev.id,
                      sortValue: ev.sortValue
                    }))
                  ]
                    .sort((a, b) => b.sortValue - a.sortValue)
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span>{item.time || 'No time'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px]">{item.label}</span>
                        </div>
                        {item.topic && <div className="text-white/70 text-xs mt-1">{item.topic}</div>}
                        <div className="text-white mt-2 text-sm leading-relaxed whitespace-pre-wrap">{item.summary || '(No summary)'}</div>
                      </div>
                    ))}
                </>
              )}

              {/* Sample video events */}
              {sampleEvents.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.894L15 14m0-4H9m6 0v4m0 0l-4.553 2.276A2 2 0 017 13.382V8.618A2 2 0 019.447 6.724L15 9" />
                    </svg>
                    Sample Events
                  </h3>

                  <div className="space-y-6">
                    {sampleEvents.map((ev) => (
                      <div key={ev.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <div className="text-white/70 text-xs mb-2">{new Date(ev.timestamp).toLocaleString()}</div>

                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex -space-x-2">
                            {[npc.id, ...(ev.participants || [])].map((pid, i) => (
                              <img key={i} src={getNpcAvatar(pid)} alt={pid} className="w-7 h-7 rounded-full ring-2 ring-black/40 object-cover object-top" />
                            ))}
                          </div>
                          <p className="text-white text-sm leading-relaxed flex-1">{ev.summary}</p>
                        </div>

                        <div className="relative w-full rounded-xl overflow-hidden bg-black/40">
                          {ev.preview?.url ? (
                            <video src={ev.preview.url} poster={ev.preview.poster} className="w-full h-auto" muted playsInline preload="metadata"></video>
                          ) : (
                            <div className="aspect-video">
                              {ev.preview?.poster && (
                                <img src={ev.preview.poster} alt="preview" className="w-full h-full object-cover opacity-80" />
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (listRef.current) listScrollRef.current = listRef.current.scrollTop || 0;
                              setPlayingEventId(ev.id);
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                            aria-label="Play"
                          >
                            <div className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-5.197-3.027A1 1 0 008 9.027v5.946a1 1 0 001.555.832l5.197-3.027a1 1 0 000-1.664z" />
                              </svg>
                            </div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NpcEventsPanel;
