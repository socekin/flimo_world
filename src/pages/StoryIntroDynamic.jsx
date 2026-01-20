import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NPCCard from '../components/NPCCard';
import NPCDetail from '../components/NPCDetail';
import { getGame } from '../lib/gameStorageClient';

const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='160' viewBox='0 0 120 160' fill='none'%3E%3Crect x='10' y='10' width='100' height='140' rx='12' stroke='%236B7280' stroke-width='2'/%3E%3Ccircle cx='60' cy='52' r='22' stroke='%236B7280' stroke-width='2'/%3E%3Cpath d='M30 132c8-20 24-30 30-30s22 10 30 30' stroke='%236B7280' stroke-width='2'/%3E%3C/svg%3E";

const formatCarryWith = (carryWith) => {
  if (Array.isArray(carryWith)) return carryWith.join('、');
  if (typeof carryWith === 'string') return carryWith;
  return '';
};

const toSocialNetwork = (network = {}, idToName, npcImageMap) => {
  if (!network || typeof network !== 'object') return [];
  return Object.entries(network).map(([key, relation]) => {
    const displayName = idToName.get(String(key)) || key;
    return {
      name: displayName,
      image: npcImageMap[displayName] || FALLBACK_AVATAR,
      relation
    };
  });
};

function StoryIntroDynamic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const scrollElement = document.scrollingElement || document.documentElement;
    scrollElement.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setError('无效的故事 ID');
      return;
    }
    let cancelled = false;

    async function loadGame() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getGame(id);
        if (cancelled) return;
        setGame(data);
      } catch (err) {
        if (cancelled) return;
        console.error('[StoryDynamic] 加载失败:', err);
        setError(err.message || '加载故事失败');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadGame();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const images = useMemo(() => {
    const envImages = Array.isArray(game?.environmentImages) ? game.environmentImages : [];
    const normalized = envImages
      .map((item) => (typeof item === 'string' ? item : item?.url || item?.image || item?.src))
      .filter(Boolean);
    if (normalized.length > 0) return normalized;
    if (game?.coverImage) return [game.coverImage];
    return [];
  }, [game]);

  const displayNpcs = useMemo(() => {
    const npcs = game?.npcsPlayer || [];
    const npcImageMap = game?.npcImageMap || {};
    const idToName = new Map(npcs.map((npc) => [String(npc.id), npc.name]));
    return npcs.map((npc, index) => {
      const name = npc.name || `NPC ${index + 1}`;
      return {
        id: npc.id ?? index + 1,
        name,
        image: npc.image || npcImageMap[name] || FALLBACK_AVATAR,
        description: npc.description || npc.role || '',
        age: npc.age ? String(npc.age) : '',
        gender: npc.gender || '',
        goal: npc.goal || '',
        carryWith: formatCarryWith(npc.carry_with ?? npc.carryWith),
        recentEvents: npc.recent_events || npc.recentEvents || '',
        shortTermPlan: npc.short_term_plan || npc.shortTermPlan || '',
        socialNetwork: toSocialNetwork(npc.social_network || npc.socialNetwork, idToName, npcImageMap)
      };
    });
  }, [game]);

  useEffect(() => {
    if (displayNpcs.length === 0) return;
    setSelectedNPC((prev) => {
      if (!prev) return displayNpcs[0];
      const stillExists = displayNpcs.some((npc) => npc.id === prev.id);
      return stillExists ? prev : displayNpcs[0];
    });
  }, [displayNpcs]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [displayNpcs.length]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const goToPrevious = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const title = game?.title || '未命名故事';
  const summary = game?.summary || '';
  const gameTips = Array.isArray(game?.gameTips) ? game.gameTips : [];

  const handleBack = () => {
    navigate('/#library');
  };

  const handlePlay = () => {
    navigate(`/game/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="btn btn-primary btn-sm"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden animate-fade-in">
      <div className="p-6">
        <button
          onClick={handleBack}
          className="btn btn-primary btn-sm gap-2 hover:gap-3 hover:scale-105 transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      <div className="px-6 py-8">
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border-0">
            {images.length > 0 ? (
              images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className={`absolute inset-0 transition-all duration-1000 flex items-center justify-center ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                  <img src={image} alt={`${title} ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-white/40">
                🎮
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-primary opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-primary opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {images.map((_, index) => (
                <button
                  key={`indicator-${index}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-500 ${index === currentIndex ? 'bg-primary w-12 shadow-lg shadow-primary/50' : 'bg-gray-600 w-2 hover:bg-gray-400 hover:w-6'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-12 max-w-5xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-pulse-slow">
            {title}
          </h2>
        </div>

        <div className="bg-white/[0.08] backdrop-blur-sm rounded-3xl p-10 shadow-xl space-y-6">
          {summary ? (
            <p className="text-gray-200 leading-relaxed text-lg text-justify indent-8 whitespace-pre-line">
              {summary}
            </p>
          ) : (
            <p className="text-gray-400 text-lg text-center">暂无故事简介</p>
          )}
        </div>
      </div>

      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/50"></div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
            Villagers - {displayNpcs.length}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/50"></div>
        </div>

        {displayNpcs.length > 0 ? (
          <>
            <div className="mb-10 relative">
              {showLeftArrow && (
                <button
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {showRightArrow && (
                <button
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <div
                ref={scrollContainerRef}
                className="px-6 overflow-x-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent"
              >
                <div className="flex gap-6 py-6 min-w-max justify-center">
                  {displayNpcs.map((npc, index) => (
                    <div
                      key={npc.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                      className="animate-fade-in"
                    >
                      <NPCCard
                        npc={npc}
                        isSelected={selectedNPC?.id === npc.id}
                        onClick={() => setSelectedNPC(npc)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selectedNPC && <NPCDetail npc={selectedNPC} />}
          </>
        ) : (
          <div className="text-center py-10 text-gray-400">暂无 NPC 信息</div>
        )}
      </div>

      <div className="px-6 py-20 max-w-4xl mx-auto text-center">
        {gameTips.length > 0 && (
          <div className="mb-12 space-y-4">
            {gameTips.map((tip, idx) => (
              <p key={idx} className="text-gray-300 text-xl font-medium leading-relaxed tracking-wide italic">
                "{tip}"
              </p>
            ))}
          </div>
        )}

        <h3 className="text-4xl font-bold mb-10 bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent">
          Your Choices, Your World
        </h3>

        <button
          onClick={handlePlay}
          className="relative overflow-hidden px-24 py-5 text-2xl font-bold text-white rounded-xl hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-primary"></div>
          <span className="relative z-10">Play</span>
        </button>
      </div>
    </div>
  );
}

export default StoryIntroDynamic;
