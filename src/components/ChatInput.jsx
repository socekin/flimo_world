import React, { useState, useRef, useEffect } from 'react';

/**
 * ChatInput - 对话输入框组件（DaisyUI 风格）
 * 
 * 功能：
 * - 支持多行文本输入
 * - 支持 Enter 发送（Shift+Enter 换行）
 * - 显示发送按钮
 * - 禁用态（loading 时）
 * - 支持外部设置输入内容（externalInput）
 */
export default function ChatInput({
    onSend,
    placeholder = '输入您的创作想法...',
    disabled = false,
    externalInput = ''
}) {
    const [input, setInput] = useState('');
    const textareaRef = useRef(null);

    // 当 externalInput 变化时同步到 input
    useEffect(() => {
        if (externalInput) {
            setInput(externalInput);
            // 聚焦到末尾
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.selectionStart = textareaRef.current.value.length;
                }
            }, 0);
        }
    }, [externalInput]);

    // 自动调整 textarea 高度
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const handleSend = () => {
        if (!input.trim() || disabled) return;

        onSend(input.trim());
        setInput('');

        // 重置高度
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        // Enter 发送，Shift+Enter 换行
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex gap-2 p-1.5 bg-base-100 border border-base-200 shadow-lg shadow-base-200/50 rounded-2xl items-end transition-shadow focus-within:shadow-xl focus-within:border-primary/20">
            <textarea
                ref={textareaRef}
                className="textarea textarea-ghost flex-1 resize-none min-h-[44px] max-h-[150px] focus:bg-transparent px-3 py-2.5 text-sm leading-relaxed placeholder:text-base-content/30 focus:outline-none"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
            />
            <button
                className={`btn btn-circle btn-sm mb-1 mr-1 transition-all duration-200 ${disabled || !input.trim() ? 'btn-ghost text-base-content/20 bg-base-200/50' : 'btn-primary shadow-md shadow-primary/30 hover:scale-105'}`}
                onClick={handleSend}
                disabled={disabled || !input.trim()}
            >
                {disabled ? (
                    <span className="loading loading-spinner loading-xs"></span>
                ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 12h16m0 0l-6-6m6 6l-6 6" />
                    </svg>
                )}
            </button>
        </div>
    );
}
