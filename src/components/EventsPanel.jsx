import { npcData, avatarMap } from '../data/npcData';
import { useMemo } from 'react';

// Floating events panel - default visible, toggleable
function EventsPanel({ events, isOpen, onToggle, onSelectNpcEvents }) {
  // Display format: MM-DD HH:mm:ss
  const formatGroupTime = (date) => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  // Normalize to 30s bucket (for grouping and sorting)
  const getBucket = (ts) => {
    const d = new Date(ts);
    const bucketMs = Math.floor(d.getTime() / 30000) * 30000;
    return bucketMs;
  };

  const getNpcImage = (npcId) => {
    const npc = npcData.find(n => n.id === npcId);
    if (!npc) return '';
    // Use Avatar (small portrait)
    return avatarMap[npc.name] || npc.image;
  };

  // Preprocess: group by 30s -> newest first
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
    // Sort: groups by time desc; within group by time desc
    const buckets = Array.from(map.keys()).sort((a, b) => b - a);
    return buckets.map((b) => ({
      bucket: b,
      date: new Date(b),
      items: map.get(b).sort((a, b2) => new Date(b2.startTime) - new Date(a.startTime))
    }));
  }, [events]);

  // Handle panel click event
  const handlePanelClick = () => {
    // Only open panel when it's closed
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
        top: `calc(var(--topbar-h, 64px) + 16px)`, // Top: topbar height + 16px gap
        bottom: '16px' // Bottom padding matches top gap
      }}
    >
      {/* Title */}
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Events
        </h2>
      </div>

      {/* Event list (grouped by minute) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        {grouped.map((group, gi) => (
          <div key={group.bucket} className="space-y-3">
            {/* Time group header - sticky */}
            <div className="sticky top-0 z-10 -mx-4 px-4 py-1.5 flex items-center gap-2 bg-black/10 backdrop-blur-md border-b border-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-xs font-semibold tracking-wide">{formatGroupTime(group.date)}</span>
            </div>

            {/* Event cards within this time slot */}
            {group.items.map((event, index) => (
              <div
                key={`${event.npcId}-${group.bucket}-${index}`}
                className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-300 cursor-pointer group border border-white/5 hover:border-primary/30"
                style={{ animationDelay: `${(gi * 5 + index) * 50}ms` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNpcEvents && onSelectNpcEvents(event.npcId);
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20 group-hover:ring-primary/50 transition-all">
                    <img
                      src={getNpcImage(event.npcId)}
                      alt={event.npcName}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm mb-0.5">{event.npcName}</h3>
                    <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">
                      {event.action || '(No action description)'}
                    </p>
                    {event.targetLocation && (
                      <p className="text-gray-400 text-[11px] leading-snug truncate">
                        Location: {event.targetLocation}
                      </p>
                    )}
                  </div>

                  {/* Arrow icon */}
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

export default EventsPanel;
