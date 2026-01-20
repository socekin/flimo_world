import { avatarMap } from '../data/npcData';

// Compact bottom HUD - shows avatar and 3 action buttons (30% opacity)
function BottomHUD({ selectedNpc, onOpenInfo, isInfoOpen, onCloseInfo, onOpenEvents, onOpenChat }) {
  if (!selectedNpc) return null;

  // Use Avatar (small portrait)
  const avatarImage = avatarMap[selectedNpc.name] || selectedNpc.image;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="relative bg-black/30 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl px-4 py-2 h-14 flex items-center gap-3 animate-slide-up overflow-visible">
        {/* NPC avatar - full body display, allows overflow */}
        <div className="relative flex-shrink-0 w-16 h-full">
          <img
            src={avatarImage}
            alt={selectedNpc.name}
            className="absolute left-0 bottom-[-6px] h-22 w-auto object-contain drop-shadow-md pointer-events-none"
          />
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/20"></div>

        {/* Action buttons / Only show close when Info is open */}
        <div className="flex items-center gap-2">
          {isInfoOpen ? (
            <button
              onClick={onCloseInfo}
              className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110"
              title="Close Info"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <>
              {/* Event timeline button */}
              <button
                onClick={onOpenEvents}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                title="Event Timeline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 8h10M5 6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6z" />
                </svg>
              </button>

              {/* Chat button */}
              <button
                onClick={onOpenChat}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                title="Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* Info button */}
              <button
                onClick={onOpenInfo}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                title="Info"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BottomHUD;
