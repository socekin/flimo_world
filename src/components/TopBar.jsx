import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

// Transparent navbar - HMR optimized
function TopBar({
  playTimeMs,
  isEventsPanelOpen,
  onToggleEventsPanel,
  isSysLogOpen,
  onToggleSysLog,
  isBgmMuted,
  isBgmPlaying,
  onToggleBgm,
  onOpenAccuse,
  accuseGlow = false,
  accuseCountdownProgress = null
}) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const barRef = useRef(null);

  // Update current time (every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set a global CSS variable to store the topbar height for other floating panels
  useEffect(() => {
    const updateTopbarHeight = () => {
      const h = barRef.current ? barRef.current.offsetHeight : 0;
      document.documentElement.style.setProperty('--topbar-h', `${h}px`);
    };
    updateTopbarHeight();
    window.addEventListener('resize', updateTopbarHeight);
    return () => window.removeEventListener('resize', updateTopbarHeight);
  }, []);

  const handleExit = () => {
    navigate('/story');
  };

  // Format time
  const formatTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Format PlayTime
  const formatPlayTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}min ${seconds}s`;
  };

  return (
    <div ref={barRef} className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between h-9 px-3 bg-black/20 backdrop-blur-sm">
      {/* Left Exit button */}
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-all duration-300 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-bold">Exit</span>
      </button>

      {/* Center clock */}
      <div className="text-white text-sm font-mono tracking-wider">
        {formatTime(currentTime)}
      </div>

      {/* Right side: Events button + PlayTime */}
      <div className="flex items-center gap-3">
        {/* Identify culprit */}
        {onOpenAccuse && (
          <div className="relative">
            {accuseCountdownProgress !== null && accuseCountdownProgress >= 0 && (
              <div
                className="absolute inset-[-2px] rounded-md pointer-events-none transition-opacity duration-300 p-[1px]"
                style={{
                  background: `conic-gradient(#a855f7 ${accuseCountdownProgress * 100}%, rgba(255,255,255,0.08) ${accuseCountdownProgress * 100}%)`,
                  opacity: 0.95,
                  boxShadow: '0 0 8px rgba(168,85,247,0.35)'
                }}
                aria-hidden="true"
              >
                <div className="w-full h-full rounded-[6px] bg-black/70"></div>
              </div>
            )}
            <button
              onClick={onOpenAccuse}
              className={`relative flex items-center justify-center p-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-all duration-300 ${accuseGlow ? 'text-primary' : ''
                }`}
              title="Identify Culprit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 9a5 5 0 0110 0v3a5 5 0 01-10 0V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l-1 4m7-4l1 4M9 7h6" />
                <circle cx="10" cy="11" r="0.75" fill="currentColor" />
                <circle cx="14" cy="11" r="0.75" fill="currentColor" />
              </svg>
              {accuseGlow && (
                <>
                  <span className="absolute inset-0 rounded-md animate-ping bg-purple-500/10 pointer-events-none" aria-hidden="true" />
                  <span className="absolute inset-0 rounded-md animate-pulse bg-purple-500/5 pointer-events-none" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Events toggle button */}
        <button
          onClick={onToggleEventsPanel}
          className={`flex items-center justify-center p-1.5 rounded-md transition-all duration-300 ${isEventsPanelOpen
              ? 'bg-primary text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          title="Toggle Events Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        {/* PlayTime */}
        <div className="text-white text-sm font-bold flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-primary">{formatPlayTime(playTimeMs)}</span>
        </div>

        {/* BGM toggle */}
        {onToggleBgm && (
          <button
            onClick={onToggleBgm}
            className={`relative flex items-center justify-center p-1.5 rounded-md transition-all duration-300 ${!isBgmMuted ? 'bg-primary/20 text-white hover:bg-primary/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isBgmMuted ? 'Enable Music' : 'Mute'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${!isBgmMuted && isBgmPlaying ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l8-2v15m-8 0a3 3 0 01-6 0 3 3 0 016 0zm8 0a3 3 0 01-6 0 3 3 0 016 0z" />
              {isBgmMuted && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l14 14" />}
            </svg>
            {!isBgmMuted && (
              <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        {/* System log button */}
        {onToggleSysLog && (
          <button
            onClick={onToggleSysLog}
            className={`flex items-center justify-center p-1.5 rounded-md transition-all duration-300 ${isSysLogOpen ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title="System Log"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default TopBar;
