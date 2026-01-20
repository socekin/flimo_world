import React from 'react';

/**
 * StatusCard - 执行状态卡片
 * 
 * 用于显示多个 Skill 的执行进度概览
 */
export default function StatusCard({
    title = '执行状态',
    steps = [],
    currentStep = 0
}) {
    return (
        <div className="card bg-white border border-base-300 shadow-sm my-2">
            <div className="card-body p-3">
                <h3 className="font-semibold text-sm mb-2">{title}</h3>

                <ul className="steps steps-vertical text-xs">
                    {steps.map((step, idx) => (
                        <li
                            key={idx}
                            className={`step ${idx <= currentStep ? 'step-primary' : ''}`}
                            data-content={idx < currentStep ? '✓' : idx === currentStep ? '●' : '○'}
                        >
                            <div className="flex items-center gap-2">
                                <span>{step.name}</span>
                                {idx === currentStep && step.status === 'running' && (
                                    <span className="loading loading-spinner loading-xs text-primary"></span>
                                )}
                                {step.duration && idx < currentStep && (
                                    <span className="opacity-50">({step.duration}ms)</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
