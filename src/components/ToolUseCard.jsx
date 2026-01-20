import React, { useState } from 'react';

/**
 * ToolUseCard - Skill execution details card
 * 
 * Displays detailed information about Skill execution:
 * - Skill name and status
 * - Input parameters (collapsible)
 * - Output result preview
 * - Execution time
 * - Reasoning (collapsible)
 */
export default function ToolUseCard({
    skillId,
    skillName,
    status = 'running', // 'running' | 'success' | 'error'
    input,
    output,
    reasoning,
    duration,
    error
}) {
    const [showDetails, setShowDetails] = useState(false);

    const statusConfig = {
        running: { label: 'Running', color: 'text-primary', bgColor: 'bg-primary/10', icon: 'loading' },
        success: { label: 'Success', color: 'text-success', bgColor: 'bg-success/10', icon: 'check' },
        error: { label: 'Failed', color: 'text-error', bgColor: 'bg-error/10', icon: 'error' }
    };

    const config = statusConfig[status] || statusConfig.running;

    return (
        <div className={`card bg-white border border-base-300 shadow-sm my-2 ${config.bgColor}`}>
            <div className="card-body p-3">
                {/* 头部：Skill 名称 + 状态 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`badge badge-sm ${status === 'running' ? 'badge-primary' : status === 'success' ? 'badge-success' : 'badge-error'}`}>
                            {status === 'running' && <span className="loading loading-spinner loading-xs mr-1"></span>}
                            {status === 'success' && (
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            {status === 'error' && (
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            {config.label}
                        </div>
                        <span className="font-mono text-sm font-medium">{skillName || skillId}</span>
                    </div>

                    {/* Right side: Time + Expand arrow */}
                    <div className="flex items-center gap-4">
                        {duration && (
                            <span className="text-xs opacity-50 font-mono tracking-wide">
                                {(duration / 1000).toFixed(3)}s
                            </span>
                        )}

                        {(input || output || reasoning) && (
                            <button
                                className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-base-200 transition-colors opacity-50 hover:opacity-100"
                                onClick={() => setShowDetails(!showDetails)}
                            >
                                <svg className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="alert alert-error mt-2 py-2 px-3 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {/* Details content */}
                {showDetails && (
                    <div className="mt-3 space-y-2 border-t border-base-200/50 pt-2 animate-fade-in">
                        {/* Reasoning */}
                        {reasoning && (
                            <div className="bg-base-200/50 rounded-lg p-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Reasoning</div>
                                <div className="text-xs whitespace-pre-wrap opacity-80 leading-relaxed font-mono">{reasoning}</div>
                            </div>
                        )}

                        {/* Input */}
                        {input && (
                            <div className="bg-base-200/50 rounded-lg p-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Input</div>
                                <pre className="text-xs overflow-x-auto bg-base-300/50 rounded p-2 font-mono scrollbar-thin">
                                    {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Output */}
                        {output && (
                            <div className="bg-base-200/50 rounded-lg p-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Output</div>
                                <pre className="text-xs overflow-x-auto bg-base-300/50 rounded p-2 max-h-60 overflow-y-auto font-mono scrollbar-thin">
                                    {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
