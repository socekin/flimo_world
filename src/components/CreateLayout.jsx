import React from 'react';

/**
 * CreateLayout - 左右分栏布局（浅色主题）
 * 
 * 修复：确保右侧面板高度正确，输入框始终在底部
 */
export default function CreateLayout({ resultsPanel, chatPanel }) {
    return (
        <div className="flex h-full w-full">
            {/* 左侧结果面板 - 可滚动 */}
            <div className="flex-1 overflow-auto">{resultsPanel}</div>
            {/* 右侧聊天面板 - 固定宽度，高度撑满 */}
            <div className="w-[450px] h-full border-l border-base-200 flex flex-col bg-white/40 shadow-xl z-10">{chatPanel}</div>
        </div>
    );
}
