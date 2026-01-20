import React from 'react';

/**
 * SkillErrorCard - Skill 执行错误展示卡片
 * 
 * 友好地展示错误信息，提供重试选项
 */
export default function SkillErrorCard({
    skillId,
    skillName,
    error,
    retryCount = 0,
    maxRetries = 3,
    onRetry,
    onDismiss
}) {
    const isRetryable = retryCount < maxRetries;

    // 解析常见错误类型
    const getErrorInfo = (error) => {
        const errorMessage = error?.message || String(error);

        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            return {
                type: 'timeout',
                icon: '⏱️',
                title: '请求超时',
                suggestion: '服务器响应时间过长，请稍后重试'
            };
        }

        if (errorMessage.includes('network') || errorMessage.includes('Network')) {
            return {
                type: 'network',
                icon: '🌐',
                title: '网络错误',
                suggestion: '请检查网络连接后重试'
            };
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            return {
                type: 'rateLimited',
                icon: '🚫',
                title: 'API 限流',
                suggestion: '请求过于频繁，请稍后再试'
            };
        }

        if (errorMessage.includes('not found')) {
            return {
                type: 'notFound',
                icon: '🔍',
                title: '资源未找到',
                suggestion: '请检查请求参数是否正确'
            };
        }

        return {
            type: 'unknown',
            icon: '❌',
            title: '执行失败',
            suggestion: errorMessage
        };
    };

    const errorInfo = getErrorInfo(error);

    return (
        <div className="card bg-error/10 border border-error/30 shadow-sm my-2">
            <div className="card-body p-4">
                {/* 头部 */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{errorInfo.icon}</span>
                        <div>
                            <h3 className="font-semibold text-error">{errorInfo.title}</h3>
                            <p className="text-xs opacity-60">{skillName || skillId}</p>
                        </div>
                    </div>

                    {onDismiss && (
                        <button
                            className="btn btn-ghost btn-xs btn-circle"
                            onClick={onDismiss}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* 错误信息 */}
                <p className="text-sm mt-2 text-error/80">
                    {errorInfo.suggestion}
                </p>

                {/* 重试信息 */}
                {retryCount > 0 && (
                    <p className="text-xs opacity-50 mt-1">
                        已重试 {retryCount} 次 / 最多 {maxRetries} 次
                    </p>
                )}

                {/* 操作按钮 */}
                <div className="card-actions justify-end mt-3">
                    {isRetryable && onRetry && (
                        <button
                            className="btn btn-error btn-sm"
                            onClick={onRetry}
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            重试
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
