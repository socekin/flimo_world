import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

/**
 * ChatPanel - Right side dialogue panel (light theme)
 */
export default function ChatPanel({
  title = 'Flimo Agent',
  messages = [],
  onSendMessage,
  isLoading = false,
  externalInput = '',
  storyType = 'puzzle',
  onStoryTypeChange,
  hasStarted = false
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm relative">
      {/* Header - Minimalist */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center text-primary shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-sm text-base-content/90 tracking-wide">{title}</h2>
            <div className="flex items-center gap-1.5 opacity-60">
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-primary animate-pulse' : 'bg-emerald-400'}`}></div>
              <p className="text-[10px] font-medium uppercase tracking-wider">{isLoading ? 'Thinking' : 'Online'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 px-10">
            <div className="w-16 h-16 rounded-2xl bg-base-200/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium">Start your creation journey</p>
            <p className="text-xs mt-2">Describe the world you want to build</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0">
        {/* Story Type Selector - Only shown before starting */}
        {!hasStarted && onStoryTypeChange && (
          <div className="flex items-center gap-2 mb-2 justify-start">
            <div className="flex bg-base-200/50 p-0.5 rounded-lg border border-base-200/50">
              <button
                className={`flex items-center h-7 min-h-[1.75rem] gap-1.5 px-3 rounded-md text-[11px] font-semibold transition-all ${storyType === 'puzzle'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-base-content/50 hover:text-base-content/70'
                  }`}
                onClick={() => onStoryTypeChange('puzzle')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894-.527-.967 1.02Z" />
                </svg>
                <span className="pt-[1px]">Mystery</span>
              </button>
              <button
                className={`flex items-center h-7 min-h-[1.75rem] gap-1.5 px-3 rounded-md text-[11px] font-semibold transition-all ${storyType === 'simulation'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-base-content/50 hover:text-base-content/70'
                  }`}
                onClick={() => onStoryTypeChange('simulation')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
                </svg>
                <span className="pt-[1px]">Simulation</span>
              </button>
            </div>
          </div>
        )}
        <ChatInput onSend={onSendMessage} disabled={isLoading} placeholder="Type your instruction here..." externalInput={externalInput} />
      </div>
    </div>
  );
}
