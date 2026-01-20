import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGames } from '../lib/gameStorageClient';

/**
 * Game Library - Games collection page
 * Display all published games
 */
export default function GameLibrary() {
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

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
            console.error('[GameLibrary] Failed to load:', err);
            setError(err.message || 'Failed to load games');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGameClick = (game) => {
        // Navigate to story intro page
        navigate(`/story/${game.id}`);
    };

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
        <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-base-100/80 backdrop-blur border-b border-base-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="btn btn-ghost btn-sm gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                            Back
                        </button>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Game Library
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate('/create')}
                        className="btn btn-primary btn-sm gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Create New Game
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <p className="mt-4 text-base-content/60">Loading...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="text-6xl mb-4">😕</div>
                        <p className="text-error mb-4">{error}</p>
                        <button onClick={loadGames} className="btn btn-primary btn-sm">
                            Retry
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && games.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="text-6xl mb-4">🎮</div>
                        <h2 className="text-xl font-bold mb-2">No games published yet</h2>
                        <p className="text-base-content/60 mb-6">Start creating your first story world!</p>
                        <button
                            onClick={() => navigate('/create')}
                            className="btn btn-primary"
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
                                className="group cursor-pointer bg-base-100 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-base-200"
                            >
                                {/* Cover Image */}
                                <div className="aspect-video bg-base-200 relative overflow-hidden">
                                    {game.coverImage ? (
                                        <img
                                            src={game.coverImage}
                                            alt={game.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='m9 9 6 6m0-6-6 6'/%3E%3C/svg%3E";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">
                                            🎮
                                        </div>
                                    )}
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                        <span className="text-white font-semibold">View Story</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-bold text-lg truncate mb-1 group-hover:text-primary transition-colors">
                                        {game.title}
                                    </h3>
                                    <p className="text-sm text-base-content/60 line-clamp-2 mb-3 h-10">
                                        {game.summary || 'No description'}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-base-content/40">
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
        </div>
    );
}
