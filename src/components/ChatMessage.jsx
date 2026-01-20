import React from 'react';
import ToolUseCard from './ToolUseCard';
import SkillErrorCard from './SkillErrorCard';

/**
 * ChatMessage - 对话消息组件（支持 ToolUseCard 和错误卡片）
 */
export default function ChatMessage({ message, onRetry }) {
    const { role, text, skillId, skillName, status, input, output, reasoning, duration, error, timestamp, retryCount } = message;

    // Tool Use 消息 - 使用 ToolUseCard
    if (role === 'tool_use') {
        // 如果有错误，显示错误卡片
        if (status === 'error' && error) {
            return (
                <SkillErrorCard
                    skillId={skillId}
                    skillName={skillName}
                    error={error}
                    retryCount={retryCount || 0}
                    onRetry={onRetry ? () => onRetry(message) : null}
                />
            );
        }

        return (
            <ToolUseCard
                skillId={skillId}
                skillName={skillName}
                status={status}
                input={input}
                output={output}
                reasoning={reasoning}
                duration={duration}
                error={error}
            />
        );
    }

    // 简单状态消息
    if (role === 'status') {
        return (
            <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 rounded-full border border-base-200 shadow-sm">
                    {status === 'running' && <span className="loading loading-spinner loading-xs text-primary"></span>}
                    {status === 'success' && (
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {status === 'error' && (
                        <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    <span className="text-xs font-medium text-base-content/70">
                        {status === 'running' && 'Processing...'}
                        {status === 'success' && 'Completed'}
                        {status === 'error' && 'Failed'}
                    </span>
                </div>
            </div>
        );
    }

    // 错误消息
    if (role === 'error') {
        return (
            <div className="alert alert-error my-2 shadow-sm">
                <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <h3 className="font-bold">出现错误</h3>
                    <div className="text-sm">{text}</div>
                </div>
                {onRetry && (
                    <button className="btn btn-sm" onClick={() => onRetry(message)}>重试</button>
                )}
            </div>
        );
    }

    // 用户/AI对话
    const isUser = role === 'user';
    const chatClass = isUser ? 'chat-end' : 'chat-start';
    // 气泡样式优化：User用主色背景（深色模式下）或淡紫（浅色模式），AI用纯白卡片
    const bubbleClass = isUser
        ? 'bg-primary text-primary-content shadow-md shadow-primary/20 rounded-2xl'
        : 'bg-white text-base-content shadow border border-base-300 rounded-2xl';

    return (
        <div className={`chat ${chatClass} group`}>
            <div className="chat-image avatar placeholder">
                <div className={`w-8 h-8 rounded-full grid place-items-center transition-all ${isUser
                    ? 'bg-base-300 text-base-content/60'
                    : 'bg-gradient-to-tr from-primary/10 to-secondary/10 text-primary ring-1 ring-primary/20'
                    }`}>
                    {isUser ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                    )}
                </div>
            </div>

            <div className={`px-5 py-3.5 ${bubbleClass} text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap`}>
                {text}
            </div>

            <div className="chat-footer opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-base-content/40 mt-1 mx-1">
                {timestamp && formatTime(timestamp)}
            </div>
        </div>
    );
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
