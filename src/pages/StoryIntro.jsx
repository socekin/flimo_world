import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Carousel from '../components/Carousel';
import NPCCard from '../components/NPCCard';
import NPCDetail from '../components/NPCDetail';
import { storyNpcData } from '../data/storyNpcData';
import { storyTitlePlayer, storyWorldSettingPlayer } from '../data/storyWorldPlayer';

function StoryIntro() {
  const navigate = useNavigate();
  const [selectedNPC, setSelectedNPC] = useState(storyNpcData[0]); // 默认选中第一个NPC
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // 检查滚动位置并更新箭头显示状态
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // 监听滚动事件
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
  }, []);

  useEffect(() => {
    const scrollElement = document.scrollingElement || document.documentElement;
    scrollElement.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // 向左滚动
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  // 向右滚动
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handlePlay = () => {
    navigate('/preview');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden animate-fade-in">
      {/* 返回按钮 */}
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

      {/* 轮播区域 */}
      <div className="px-6 py-8">
        <Carousel />
      </div>

      {/* 故事介绍区域 */}
      <div className="px-6 py-12 max-w-5xl mx-auto">
        <h2 className="text-5xl font-bold text-center mb-8 bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-pulse-slow">
          {storyTitlePlayer}
        </h2>
        <div className="bg-white/[0.08] backdrop-blur-sm rounded-3xl p-10 shadow-xl">
          <p className="text-gray-200 leading-relaxed text-lg text-justify indent-8 whitespace-pre-line">
            {storyWorldSettingPlayer}
          </p>
        </div>
      </div>

      {/* Villagers 区域 */}
      <div className="px-6 py-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/50"></div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">Villagers - {storyNpcData.length}</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/50"></div>
        </div>

        {/* NPC列表 - 横向滚动 */}
        <div className="mb-10 relative">
          {/* 左箭头 */}
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

          {/* 右箭头 */}
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

          {/* NPC滚动容器 */}
          <div
            ref={scrollContainerRef}
            className="px-6 overflow-x-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent"
          >
            <div className="flex gap-6 py-6 min-w-max justify-center">
              {storyNpcData.map((npc, index) => (
                <div
                  key={npc.id}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in"
                >
                  <NPCCard
                    npc={npc}
                    isSelected={selectedNPC.id === npc.id}
                    onClick={() => setSelectedNPC(npc)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NPC详情 */}
        <NPCDetail npc={selectedNPC} />
      </div>

      {/* 底部区域 */}
      <div className="px-6 py-20 max-w-4xl mx-auto text-center">
        <div className="mb-8 space-y-3">
          <p className="text-gray-300 text-lg leading-relaxed">
            As an inspector, how would you uncover the truth?
          </p>
          <p className="text-gray-300 text-lg leading-relaxed">
            Set sail immediately, Westridge Town needs you.
          </p>
        </div>

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

export default StoryIntro;
