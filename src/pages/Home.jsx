import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listGames } from '../lib/gameStorageClient';

/**
 * Home - Landing page
 * Dual-screen structure: Hero section + Library section
 */
export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const libraryRef = useRef(null);
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExploring, setIsExploring] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        loadGames();
    }, []);

    const loadGames = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const gameList = await listGames();
            setGames(gameList);
        } catch (err) {
            console.error('[Home] Failed to load games:', err);
            setError(err.message || 'Failed to load games');
        } finally {
            setIsLoading(false);
        }
    };

    const getScrollContainer = (node) => {
        let current = node?.parentElement;
        while (current && current !== document.body) {
            const { overflowY } = window.getComputedStyle(current);
            const canScroll =
                (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
                current.scrollHeight > current.clientHeight;
            if (canScroll) return current;
            current = current.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    };

    const scrollToPosition = (container, top) => {
        if (container === document.body || container === document.documentElement) {
            const scrollElement = document.scrollingElement || document.documentElement;
            const startTop = scrollElement.scrollTop;
            scrollElement.scrollTo({ top, behavior: 'smooth' });
            setTimeout(() => {
                const nowTop = scrollElement.scrollTop;
                if (nowTop !== startTop) return;
                scrollElement.scrollTop = top;
                document.body.scrollTop = top;
            }, 120);
            return;
        }
        const startTop = container.scrollTop;
        container.scrollTo({ top, behavior: 'smooth' });
        setTimeout(() => {
            const nowTop = container.scrollTop;
            if (nowTop !== startTop) return;
            container.scrollTop = top;
        }, 120);
    };

    const scrollToLibrary = () => {
        const target = libraryRef.current;
        const container = getScrollContainer(target);
        if (!target) {
            scrollToPosition(container, window.innerHeight);
            return;
        }
        if (container === document.body || container === document.documentElement) {
            const targetTop = target.getBoundingClientRect().top + window.scrollY;
            scrollToPosition(container, targetTop);
            return;
        }
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetTop = targetRect.top - containerRect.top + container.scrollTop;
        scrollToPosition(container, targetTop);
    };

    useEffect(() => {
        if (location.hash === '#library' || location.state?.scrollToLibrary) {
            requestAnimationFrame(scrollToLibrary);
        }
    }, [location.key]);

    const handleExplore = () => {
        setIsExploring(true);
        requestAnimationFrame(scrollToLibrary);
        setTimeout(() => setIsExploring(false), 800);
    };

    const handleCreate = () => {
        setIsCreating(true);
        setTimeout(() => {
            navigate('/create');
        }, 300);
    };

    const handlePlayDemo = () => {
        navigate('/story');
    };

    const handleGameClick = (game) => {
        navigate(`/story/${game.id}`);
    };

    const scrollToTop = () => {
        const container = getScrollContainer(libraryRef.current);
        scrollToPosition(container, 0);
    };

    useEffect(() => {
        const container = getScrollContainer(libraryRef.current);
        const isWindowScroll =
            container === document.body || container === document.documentElement;
        const getScrollTop = () =>
            isWindowScroll
                ? (document.scrollingElement || document.documentElement).scrollTop
                : container.scrollTop;
        const updateVisibility = () => {
            setShowScrollTop(getScrollTop() > 20);
        };
        updateVisibility();
        const scrollTarget = isWindowScroll ? window : container;
        scrollTarget.addEventListener('scroll', updateVisibility);
        window.addEventListener('resize', updateVisibility);
        return () => {
            scrollTarget.removeEventListener('scroll', updateVisibility);
            window.removeEventListener('resize', updateVisibility);
        };
    }, []);

    const formatDate = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '';
        }
    };

    return (
        <div className="bg-black min-h-screen">
            {/* ========== Hero 区域（第一屏）========== */}
            <section className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
                {/* 背景图片 */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/img/login/Login_bg.png)' }}
                ></div>
                {/* 暗色遮罩 */}
                <div className="absolute inset-0 bg-black/40"></div>

                {/* 内容 */}
                <div className="relative z-10 flex flex-col items-center gap-16 animate-fade-in">
                    {/* 标题 */}
                    <h1 className="text-7xl md:text-8xl font-bold tracking-wider drop-shadow-2xl bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent animate-pulse-slow">
                        Flimo World
                    </h1>

                    {/* 副标题 */}
                    <p className="text-white text-lg md:text-xl tracking-wide font-light">
                        Create your own story universe
                    </p>

                    {/* 按钮组 */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Explore 按钮 */}
                        <button
                            onClick={handleExplore}
                            disabled={isExploring || isCreating}
                            className="group relative overflow-hidden px-16 py-4 text-xl font-bold text-gray-900 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl disabled:opacity-50 cursor-pointer border border-yellow-300/50 hover:border-yellow-200"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                            <span className="relative z-10 flex items-center gap-3">
                                {isExploring ? 'Loading...' : 'Explore'}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-1 transition-transform">
                                    <path d="M12 5v14M5 12l7 7 7-7" />
                                </svg>
                            </span>
                        </button>

                        {/* Create 按钮 */}
                        <button
                            onClick={handleCreate}
                            disabled={isExploring || isCreating}
                            className="group relative overflow-hidden px-16 py-4 text-xl font-bold text-gray-900 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl disabled:opacity-50 cursor-pointer border border-orange-300/50 hover:border-orange-200"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                            <span className="relative z-10 flex items-center gap-3">
                                {isCreating ? 'Loading...' : 'Create'}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>

                {/* 向下滚动提示 */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                </div>
            </section>

            {/* ========== Library 区域（第二屏）========== */}
            <section id="library" ref={libraryRef} className="min-h-screen w-full bg-gradient-to-b from-black via-gray-950 to-black py-12">
                {/* 返回顶部按钮 */}
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur transition-all hover:scale-110"
                        title="Back to top"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6" />
                        </svg>
                    </button>
                )}

                <div className="max-w-7xl mx-auto px-6">
                    {/* ===== 预置 Demo Banner ===== */}
                    <div
                        onClick={handlePlayDemo}
                        className="group cursor-pointer relative overflow-hidden rounded-3xl mb-12 border border-white/10 hover:border-white/30 transition-all"
                    >
                        {/* 背景图 */}
                        <div
                            className="h-64 md:h-80 bg-cover bg-center relative"
                            style={{ backgroundImage: 'url(/img/play/bg.png)' }}
                        >
                            {/* 渐变遮罩 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                            {/* 内容 */}
                            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 text-purple-300 text-sm font-medium w-fit mb-4">
                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                                    Featured Demo
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                    The Sweetwater Explosion
                                </h2>
                                <p className="text-gray-300 text-lg max-w-md mb-6">
                                    Experience a preset mystery demo. Interact with 7 NPCs and uncover the truth behind the vault explosion.
                                </p>
                                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold w-fit transition-all group-hover:translate-x-2">
                                    Play Now
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ===== 用户创建的游戏列表 ===== */}
                    <div className="mb-8 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-primary">
                            World Library
                        </h2>
                        <button
                            onClick={() => navigate('/create')}
                            className="btn btn-primary btn-sm gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Create New World
                        </button>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <span className="loading loading-spinner loading-lg text-purple-400"></span>
                            <p className="mt-4 text-gray-400">Loading...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="text-6xl mb-4">😕</div>
                            <p className="text-red-400 mb-4">{error}</p>
                            <button onClick={loadGames} className="btn btn-primary btn-sm">
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && games.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="text-6xl mb-4">🎮</div>
                            <h3 className="text-xl font-bold text-white mb-2">No games created yet</h3>
                            <p className="text-gray-400 mb-6">Start creating your first story world!</p>
                            <button
                                onClick={() => navigate('/create')}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:scale-105 transition-transform"
                            >
                                Start Creating
                            </button>
                        </div>
                    )}

                    {/* Games Grid */}
                    {!isLoading && !error && games.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {games.map((game) => (
                                <div
                                    key={game.id}
                                    onClick={() => handleGameClick(game)}
                                    className="group cursor-pointer bg-gray-900/50 rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10"
                                >
                                    {/* Cover Image */}
                                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                                        {game.coverImage ? (
                                            <img
                                                src={game.coverImage}
                                                alt={game.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='m9 9 6 6m0-6-6 6'/%3E%3C/svg%3E";
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">
                                                🎮
                                            </div>
                                        )}
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                            <span className="text-white font-semibold">View Story</span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg text-white truncate mb-1 group-hover:text-purple-400 transition-colors">
                                            {game.title}
                                        </h3>
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-3 h-10">
                                            {game.summary || 'No description'}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                    <circle cx="9" cy="7" r="4" />
                                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>
                                                {game.npcCount || 0} NPCs
                                            </span>
                                            <span>{formatDate(game.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
