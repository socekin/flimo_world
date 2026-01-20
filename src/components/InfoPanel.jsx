import { useEffect } from 'react';
import { iconMap } from '../data/npcData';

function InfoPanel({ npc, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!npc) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[1200px] bg-black/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in grid grid-cols-12 h-full"
        style={{
          maxHeight: 'calc(100vh - var(--topbar-h, 36px) - 48px)',
          height: 'calc(100vh - var(--topbar-h, 36px) - 48px)'
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="col-span-4 h-full">
          <div className="p-10 flex flex-col items-center h-full sticky top-0">
            <div className="w-full aspect-[3/5] flex items-end justify-center">
              <img src={npc.image} alt={npc.name} className="max-h-full object-contain" />
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-white drop-shadow text-center">{npc.name}</h2>
          </div>
        </div>

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
            {[
              { key: 'description', label: 'Description', value: npc.description },
              { key: 'age', label: 'Age', value: npc.age },
              { key: 'gender', label: 'Gender', value: npc.gender },
              { key: 'goal', label: 'Goal', value: npc.goal },
              { key: 'recentEvents', label: 'Recent events', value: npc.recentEvents },
              { key: 'shortTermPlan', label: 'Short-term plan', value: npc.shortTermPlan },
              { key: 'carryWith', label: 'Carry with', value: npc.carryWith },
            ].map((row) => (
              <div key={row.key} className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <img src={iconMap[row.key]} alt={row.label} className="w-5 h-5 object-contain opacity-80" />
                </div>
                <div>
                  <p className="text-white/60 text-[11px] uppercase tracking-wider">{row.label}</p>
                  <p className="text-white leading-relaxed">{row.value}</p>
                </div>
              </div>
            ))}

            {npc.socialNetwork && npc.socialNetwork.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <img src={iconMap.socialNetwork} alt="Social network" className="w-5 h-5 opacity-80" />
                  <p className="text-white/60 text-[11px] uppercase tracking-wider">Social network</p>
                </div>
                <div className="flex items-center gap-6">
                  {npc.socialNetwork.map((s, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <img src={s.image} alt={s.name} className="w-20 h-28 object-contain" />
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

export default InfoPanel;
