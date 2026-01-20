import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Preview() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const mouseTimerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSkip] = useState(true);
    const [showUI, setShowUI] = useState(true); // UI显示状态

    useEffect(() => {
        // 1秒后隐藏UI
        const hideTimer = setTimeout(() => {
            setShowUI(false);
        }, 1000);

        return () => {
            clearTimeout(hideTimer);
        };
    }, []);

    const handleMouseMove = () => {
        // 显示UI
        setShowUI(true);

        // 清除之前的定时器
        if (mouseTimerRef.current) {
            clearTimeout(mouseTimerRef.current);
        }

        // 3秒后自动隐藏UI
        mouseTimerRef.current = setTimeout(() => {
            setShowUI(false);
        }, 3000);
    };

    const handleBack = () => {
        // 停止视频播放
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        navigate('/story');
    };

    const handleSkip = () => {
        navigate('/play');
    };

    const handleVideoEnd = () => {
        // 播放完毕自动跳转到 Play 模式
        navigate('/play');
    };

    const handleLoadedMetadata = () => {
        setIsLoading(false);
    };

    return (
        <div
            className="relative w-full h-screen bg-black overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* 加载状态 */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                        <p className="text-white text-sm">加载中...</p>
                    </div>
                </div>
            )}

            {/* 视频播放器 */}
            <video
                ref={videoRef}
                src="https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/CG.mp4"
                poster="https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/CG-poster.png"
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                onEnded={handleVideoEnd}
                onLoadedMetadata={handleLoadedMetadata}
                preload="metadata"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                style={{ pointerEvents: 'none' }} // 禁用视频交互
            />

            {/* 顶部UI - 返回按钮和标题 */}
            <div
                className={`absolute top-0 left-0 right-0 p-6 flex items-center gap-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-300 backdrop-blur-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">The West Ridge Vault Mystery</h1>
            </div>

            {/* 跳过按钮 - 5秒后显示 */}
            {showSkip && (
                <div className="absolute bottom-8 right-8 z-10 animate-fade-in">
                    <button
                        onClick={handleSkip}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-300 backdrop-blur-sm"
                    >
                        Skip
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

export default Preview;
