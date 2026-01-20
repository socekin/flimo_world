import React from 'react';

/**
 * ErrorBoundary - React 错误边界组件
 * 
 * 捕获子组件的渲染错误，防止整个应用崩溃
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // 可以在这里发送错误到日志服务
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // 自定义 fallback UI
            if (this.props.fallback) {
                return this.props.fallback({
                    error: this.state.error,
                    retry: this.handleRetry
                });
            }

            // 默认错误 UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-base-200 rounded-lg">
                    <div className="text-error text-4xl mb-4">⚠️</div>
                    <h2 className="text-lg font-semibold text-error mb-2">出现了一些问题</h2>
                    <p className="text-sm text-center opacity-70 mb-4 max-w-md">
                        {this.state.error?.message || '组件渲染时发生错误'}
                    </p>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={this.handleRetry}
                    >
                        重试
                    </button>

                    {/* 开发模式下显示详细错误 */}
                    {import.meta.env.DEV && this.state.errorInfo && (
                        <details className="mt-4 w-full max-w-lg">
                            <summary className="cursor-pointer text-sm opacity-50">查看详细信息</summary>
                            <pre className="mt-2 p-3 bg-base-300 rounded text-xs overflow-auto max-h-40">
                                {this.state.error?.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
