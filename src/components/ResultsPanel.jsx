import React, { useState, useEffect, useRef } from 'react';
import LocationMarkerEditor from './LocationMarkerEditor';

// SVG Icons
const Icons = {
    Story: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    ),
    Map: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
        </svg>
    ),
    Game: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="12" x="2" y="6" rx="2" /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" />
        </svg>
    ),
    Reward: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    World: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
        </svg>
    ),
    Scene: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    ),
    Users: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    Sparkles: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    ),
    // NPC Details Icons + Chevron
    Eye: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
        </svg>
    ),
    Target: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
        </svg>
    ),
    Flag: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" />
        </svg>
    ),
    Lock: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    ChevronLeft: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    ),
    ChevronRight: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
    // Tab 分类图标
    Puzzle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
        </svg>
    ),
    Building: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
        </svg>
    )
};

/**
 * ResultsPanel - 现代化重构版
 */
export default function ResultsPanel({
    activeStep = 'story',
    onStepChange,
    storyData,
    layoutData,
    worldmapData,
    rewardData,
    onGenerateWorldmap,
    isLoading,
    canGenerateMap,
    hasStarted = false,
    sampleStories = null,
    onUseSampleStory,
    // 地点标注相关
    locationMarkers = [],
    onMarkersChange,
    navWorldId,
    onSyncToNav,
    // Setting Step 3
    storyType = 'puzzle',
    gameTips = [],
    onTipsChange,
    onGenerateTips
}) {
    const stepIndex = activeStep === 'story' ? 0 : activeStep === 'worldmap' ? 1 : 2;
    const [showSyncWarning, setShowSyncWarning] = useState(false);
    const [worldmapActiveTab, setWorldmapActiveTab] = useState('layout');

    // 处理步骤切换，带验证逻辑
    const handleStepChange = (step) => {
        // 尝试进入 step 3 (game) 时，检查 SYNC 是否完成
        if (step === 'game' && !navWorldId) {
            setShowSyncWarning(true);
            // 自动切换到 Final Map tab
            setWorldmapActiveTab('worldmap');
            // 保持在 worldmap 步骤
            if (activeStep !== 'worldmap') {
                onStepChange('worldmap');
            }
            // 3秒后自动隐藏警告
            setTimeout(() => setShowSyncWarning(false), 3000);
            return;
        }
        setShowSyncWarning(false);
        onStepChange(step);
    };

    return (
        <div className="flex flex-col h-full bg-base-200/50 relative">
            {/* SYNC 未完成警告 - Toast 悬浮样式 */}
            {showSyncWarning && (
                <div className="toast toast-top toast-center z-[100] absolute top-10 pointer-events-none">
                    <div role="alert" className="alert alert-warning shadow-lg border-2 border-warning/20 min-w-[320px] py-1.5 h-auto min-h-0 pointer-events-auto animate-in slide-in-from-top-10 duration-500 ease-out">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-bold tracking-tight">Please complete map annotation and sync first</span>
                        <button
                            className="btn btn-xs btn-circle btn-ghost"
                            onClick={() => setShowSyncWarning(false)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Steps 指示器 */}
            {hasStarted && (
                <div className="px-8 pt-6 pb-2 bg-white/50 backdrop-blur-md border-b border-base-200 sticky top-0 z-10">
                    <div className="flex items-start justify-between max-w-sm mx-auto">
                        <StepItem
                            active={stepIndex >= 0}
                            completed={stepIndex > 0}
                            current={stepIndex === 0}
                            icon={Icons.Story}
                            label="Story"
                            onClick={() => handleStepChange('story')}
                        />
                        <StepLine active={stepIndex >= 1} />
                        <StepItem
                            active={stepIndex >= 1}
                            completed={stepIndex > 1}
                            current={stepIndex === 1}
                            icon={Icons.Map}
                            label="Map"
                            onClick={() => handleStepChange('worldmap')}
                        />
                        <StepLine active={stepIndex >= 2} />
                        <StepItem
                            active={stepIndex >= 2}
                            completed={stepIndex > 2}
                            current={stepIndex === 2}
                            icon={Icons.Game}
                            label="Setting"
                            onClick={() => handleStepChange('game')}
                        />
                    </div>
                </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
                <div className="max-w-4xl mx-auto space-y-6">
                    {activeStep === 'story' && (
                        <StoryContent
                            data={storyData}
                            hasStarted={hasStarted}
                            isLoading={isLoading}
                            sampleStories={sampleStories}
                            onUseSampleStory={onUseSampleStory}
                        />
                    )}
                    {activeStep === 'worldmap' && (
                        <WorldmapContent
                            layoutData={layoutData}
                            worldmapData={worldmapData}
                            onGenerateWorldmap={onGenerateWorldmap}
                            isLoading={isLoading}
                            canGenerateMap={canGenerateMap}
                            locationMarkers={locationMarkers}
                            onMarkersChange={onMarkersChange}
                            navWorldId={navWorldId}
                            onSyncToNav={onSyncToNav}
                            sceneNames={storyData?.world?.scenes?.map(s => s.title || s.name) || []}
                            externalActiveTab={worldmapActiveTab}
                            onActiveTabChange={setWorldmapActiveTab}
                        />
                    )}
                    {activeStep === 'game' && (
                        <SettingContent
                            storyType={storyType}
                            gameTips={gameTips}
                            onTipsChange={onTipsChange}
                            environmentImages={storyData?.environmentImages || []}
                            onGenerateTips={onGenerateTips}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function StepItem({ active, completed, current, icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-2 group transition-all duration-300 w-20 ${active ? 'text-primary' : 'text-base-content/30'}`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${current
                ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                : completed
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-200 bg-white text-base-content/20 group-hover:border-primary/50'
                }`}>
                <Icon />
            </div>
            <span className={`text-[10px] font-bold tracking-wide uppercase text-center leading-tight transition-colors ${current ? 'text-primary' : 'text-base-content/40'}`}>
                {label}
            </span>
        </button>
    );
}

function StepLine({ active }) {
    return (
        <div className="flex-1 h-0.5 mx-2 mt-5 bg-gray-300 rounded-full overflow-hidden">
            <div className={`h-full bg-primary transition-all duration-500 ease-out ${active ? 'w-full' : 'w-0'}`} />
        </div>
    );
}

function StoryContent({ data, hasStarted, isLoading, sampleStories, onUseSampleStory }) {
    const [selectedNpcIndex, setSelectedNpcIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState('puzzle');
    const [viewMode, setViewMode] = useState('creator'); // 'creator' | 'player'

    // Loading 状态
    if (hasStarted && (!data || !data.world)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icons.Sparkles />
                    </div>
                </div>
                <h2 className="text-lg font-semibold mt-6 text-base-content/80">Creating your world...</h2>
                <p className="text-sm text-base-content/50 mt-2">Generating lore, characters, and scenes</p>
            </div>
        );
    }

    // Welcome State
    if (!data || !data.world) {
        const categories = sampleStories ? Object.keys(sampleStories) : [];
        const currentCategory = sampleStories?.[activeCategory];
        const stories = currentCategory?.stories || [];

        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto">
                <div className="text-center mb-8 space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 mb-2">
                        <Icons.Sparkles />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/70">
                        Start Creation
                    </h1>
                    <p className="text-base text-base-content/50 max-w-md mx-auto leading-relaxed">
                        Describe your story idea in the chat, or start with our curated examples below.
                    </p>
                </div>

                {/* Tabs */}
                {sampleStories && categories.length > 0 && (
                    <div className="w-full">
                        <div className="flex flex-wrap bg-base-200/50 p-1 rounded-xl w-fit mx-auto mb-6 border border-base-200">
                            {categories.map((key) => {
                                const cat = sampleStories[key];
                                const IconComponent = Icons[cat.iconKey];
                                return (
                                    <button
                                        key={key}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === key
                                            ? 'bg-white text-primary shadow-sm'
                                            : 'text-base-content/50 hover:text-base-content/70'
                                            }`}
                                        onClick={() => setActiveCategory(key)}
                                    >
                                        {IconComponent && <IconComponent />}
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Story Cards Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {stories.map((story) => (
                                <div
                                    key={story.id}
                                    className="group relative bg-white rounded-2xl shadow-md shadow-base-200/50 cursor-pointer border border-base-100 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/10 transform-gpu"
                                    onClick={() => onUseSampleStory(story, activeCategory)}
                                >
                                    {/* Cover Image */}
                                    <div
                                        className="relative h-28 overflow-hidden rounded-t-2xl"
                                        style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
                                    >
                                        {story.coverImage ? (
                                            <img
                                                src={story.coverImage}
                                                alt={story.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                        <div className="absolute bottom-3 left-4 right-4">
                                            <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">{story.title}</h3>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <p className="text-base-content/60 text-xs leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">
                                            {story.description}
                                        </p>
                                        <button className="btn btn-primary btn-xs rounded-full px-4 w-full shadow-sm shadow-primary/10 group-hover:shadow-primary/30 transition-shadow">
                                            Use This
                                            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const { world, npcs = [], environmentImages = [], npcImageMap = {} } = data;

    // 判断是否有玩家版数据（解谜类故事）
    const hasPlayerView = !!(data.worldPlayer && data.npcsPlayer);

    // 根据当前视图模式选择数据
    const currentWorld = viewMode === 'player' && data.worldPlayer ? data.worldPlayer : world;
    const currentNpcs = viewMode === 'player' && data.npcsPlayer ? data.npcsPlayer : npcs;

    const selectedNpc = currentNpcs[selectedNpcIndex];
    const scenesWithImages = currentWorld.scenes?.map((scene, idx) => ({ ...scene, image: environmentImages[idx] || null })) || [];

    return (
        <div className="space-y-8 pb-10">
            {/* 创作者版/玩家版 Tab 切换 */}
            {hasPlayerView && (
                <div className="flex justify-center">
                    <div className="flex bg-base-200/50 p-1 rounded-xl w-fit border border-base-200">
                        <button
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${viewMode === 'creator'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-base-content/50 hover:text-base-content/70'
                                }`}
                            onClick={() => { setViewMode('creator'); setSelectedNpcIndex(0); }}
                        >
                            <Icons.Lock />
                            <span>Creator View</span>
                        </button>
                        <button
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${viewMode === 'player'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-base-content/50 hover:text-base-content/70'
                                }`}
                            onClick={() => { setViewMode('player'); setSelectedNpcIndex(0); }}
                        >
                            <Icons.Eye />
                            <span>Player View</span>
                        </button>
                    </div>
                </div>
            )}

            {/* World Settings */}
            <SectionCard title={viewMode === 'player' ? 'Story Overview' : 'World Setting'} icon={Icons.World}>
                {viewMode === 'player' && currentWorld.summary ? (
                    <p className="text-base-content/80 leading-relaxed whitespace-pre-line">
                        {currentWorld.summary}
                    </p>
                ) : (
                    <div className="grid gap-4">
                        <InfoBlock label="Background" content={currentWorld.world} color="primary" />
                        <InfoBlock label="Situation" content={currentWorld.situation} color="secondary" />
                        {currentWorld.truth && viewMode === 'creator' && <InfoBlock label="Hidden Truth" content={currentWorld.truth} color="secondary" />}
                    </div>
                )}
            </SectionCard>

            {/* Scenes */}
            {scenesWithImages.length > 0 && (
                <SectionCard title="Key Scenes" icon={Icons.Scene}>
                    <div className="grid grid-cols-2 gap-4">
                        {scenesWithImages.map((scene, idx) => (
                            <SceneCard key={idx} scene={scene} />
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* NPCs */}
            {currentNpcs.length > 0 && (
                <SectionCard title="Characters" icon={Icons.Users}>
                    {/* NPC 列表 - 带箭头的滚动容器 */}
                    <ScrollableList>
                        {currentNpcs.map((npc, idx) => (
                            <NpcImageCard
                                key={idx}
                                npc={npc}
                                image={npcImageMap[npc.name]?.[0]}
                                isSelected={idx === selectedNpcIndex}
                                onClick={() => setSelectedNpcIndex(idx)}
                            />
                        ))}
                    </ScrollableList>

                    {/* NPC 详情 - 左右分栏布局 */}
                    {selectedNpc && (
                        <div className="bg-base-50 rounded-2xl p-6 border border-base-200 mt-4 animate-fade-in shadow-sm relative overflow-hidden">
                            <div className="flex gap-8">
                                {/* 左侧：详细信息 */}
                                <div className="flex-1 space-y-6 z-10">
                                    <div>
                                        <h3 className="text-3xl font-bold text-base-content mb-1">{selectedNpc.name}</h3>
                                        <p className="text-base text-base-content/60 font-medium">{selectedNpc.role}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* 创作者版字段 - 完整信息 */}
                                        {viewMode === 'creator' && (
                                            <>
                                                {/* 基础信息 */}
                                                {(selectedNpc.profile?.description || selectedNpc.description) && (
                                                    <NpcDetailItem icon={Icons.Eye} label="Description" content={selectedNpc.profile?.description || selectedNpc.description} />
                                                )}
                                                {(selectedNpc.profile?.goal || selectedNpc.goal) && (
                                                    <NpcDetailItem icon={Icons.Target} label="True Goal" content={selectedNpc.profile?.goal || selectedNpc.goal} />
                                                )}
                                                {(selectedNpc.profile?.recent_events || selectedNpc.recent_events) && (
                                                    <NpcDetailItem icon={Icons.Flag} label="Recent Events" content={selectedNpc.profile?.recent_events || selectedNpc.recent_events} />
                                                )}
                                                {(selectedNpc.profile?.short_term_plan || selectedNpc.short_term_plan) && (
                                                    <NpcDetailItem icon={Icons.Target} label="Short-term Plan" content={selectedNpc.profile?.short_term_plan || selectedNpc.short_term_plan} />
                                                )}

                                                {/* 随身物品 */}
                                                {(selectedNpc.profile?.carry_with || selectedNpc.carry_with)?.length > 0 && (
                                                    <NpcDetailItem
                                                        icon={Icons.Lock}
                                                        label="Carried Items"
                                                        content={(selectedNpc.profile?.carry_with || selectedNpc.carry_with).join('、')}
                                                    />
                                                )}

                                                {/* Breaking Point - Core Secret */}
                                                {selectedNpc.profile?.breaking_point && (
                                                    <div className="pt-2 border-t border-base-200 mt-2 space-y-3">
                                                        <NpcDetailItem
                                                            icon={Icons.Lock}
                                                            label="Breaking Point Triggers"
                                                            content={selectedNpc.profile.breaking_point.trigger_concepts?.join('、') || ''}
                                                            isSecret
                                                        />
                                                        <NpcDetailItem
                                                            icon={Icons.Lock}
                                                            label="Breaking Logic"
                                                            content={selectedNpc.profile.breaking_point.logic || ''}
                                                            isSecret
                                                        />
                                                        <NpcDetailItem
                                                            icon={Icons.Lock}
                                                            label="Confession Content"
                                                            content={selectedNpc.profile.breaking_point.confession_content || ''}
                                                            isSecret
                                                        />
                                                    </div>
                                                )}

                                                {/* Persona - Dialogue Style */}
                                                {selectedNpc.profile?.persona && (
                                                    <div className="pt-2 border-t border-base-200 mt-2">
                                                        {selectedNpc.profile.persona.voice?.register && (
                                                            <NpcDetailItem icon={Icons.Eye} label="Speaking Style" content={selectedNpc.profile.persona.voice.register} />
                                                        )}
                                                        {selectedNpc.profile.persona.public_stance && (
                                                            <NpcDetailItem icon={Icons.Eye} label="Public Stance" content={selectedNpc.profile.persona.public_stance} />
                                                        )}
                                                        {selectedNpc.profile.persona.what_i_wont_say && (
                                                            <NpcDetailItem icon={Icons.Lock} label="Will Never Say" content={selectedNpc.profile.persona.what_i_wont_say} isSecret />
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Player View Fields - No Spoiler Info */}
                                        {viewMode === 'player' && (
                                            <>
                                                {selectedNpc.description && (
                                                    <NpcDetailItem icon={Icons.Eye} label="Description" content={selectedNpc.description} />
                                                )}
                                                {selectedNpc.goal && (
                                                    <NpcDetailItem icon={Icons.Target} label="Goal" content={selectedNpc.goal} />
                                                )}
                                                {selectedNpc.recent_events && (
                                                    <NpcDetailItem icon={Icons.Flag} label="Recent Activity" content={selectedNpc.recent_events} />
                                                )}
                                                {selectedNpc.short_term_plan && (
                                                    <NpcDetailItem icon={Icons.Target} label="Current Behavior" content={selectedNpc.short_term_plan} />
                                                )}
                                                {selectedNpc.carry_with?.length > 0 && (
                                                    <NpcDetailItem icon={Icons.Lock} label="Carried Items" content={selectedNpc.carry_with.join(', ')} />
                                                )}
                                                {selectedNpc.social_network && Object.keys(selectedNpc.social_network).length > 0 && (
                                                    <NpcDetailItem
                                                        icon={Icons.Users}
                                                        label="Relationships"
                                                        content={Object.entries(selectedNpc.social_network).map(([k, v]) => `${k}: ${v}`).join('；')}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* 右侧：全身立绘 */}
                                <div className="w-[200px] shrink-0 relative flex items-center justify-center min-h-[300px]">
                                    {npcImageMap[selectedNpc.name]?.[0]?.url ? (
                                        <img
                                            src={npcImageMap[selectedNpc.name][0].url}
                                            alt={selectedNpc.name}
                                            className="w-full h-auto object-contain max-h-[400px]"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-base-200/50 rounded-xl flex flex-col items-center justify-center text-base-content/40 gap-3 border border-dashed border-base-300">
                                            <span className="loading loading-ring loading-lg text-primary/50"></span>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-medium opacity-70">Drawing...</span>
                                                <span className="text-[10px] opacity-40">Please wait</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SectionCard>
            )}
        </div>
    );
}

function SectionCard({ title, icon: Icon, children }) {
    return (
        <div className="card bg-white shadow-sm border border-base-200 overflow-visible">
            <div className="card-body p-6">
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-base-content mb-4">
                    <div className="p-1.5 rounded-lg bg-base-100 border border-base-200 text-primary">
                        <Icon />
                    </div>
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
}

function InfoBlock({ label, content, color }) {
    return (
        <div className="relative pl-4 py-1">
            <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full bg-${color}`} />
            <h4 className={`text-xs font-bold text-${color} uppercase tracking-wider mb-1`}>{label}</h4>
            <p className="text-sm leading-relaxed text-base-content/80">{content}</p>
        </div>
    );
}

function Badge({ label, outline = false }) {
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${outline
            ? 'border border-base-300 text-base-content/60 bg-transparent'
            : 'bg-base-200 text-base-content/70'
            }`}>
            {label}
        </span>
    );
}

function SceneCard({ scene }) {
    const hasImage = scene.image && scene.image.url;
    return (
        <div className="relative group rounded-xl overflow-hidden bg-base-100 border border-base-200 aspect-[2/1]">
            {hasImage ? (
                <img
                    src={scene.image.url}
                    alt={scene.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-base-100">
                    <span className="loading loading-spinner loading-sm text-base-content/20"></span>
                </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
                <h3 className="font-semibold text-white text-sm tracking-wide">{scene.name}</h3>
                <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{scene.description}</p>
            </div>
        </div>
    );
}

function NpcDetailItem({ icon: Icon, label, content, isSecret }) {
    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${isSecret ? 'bg-primary/5 border border-primary/10' : 'bg-white border border-base-100'}`}>
            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSecret ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-base-200/50 text-base-content/50'
                }`}>
                <Icon />
            </div>
            <div>
                <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isSecret ? 'text-primary' : 'text-base-content/40'}`}>
                    {label}
                </span>
                <p className={`text-sm leading-relaxed ${isSecret ? 'text-base-content/90' : 'text-base-content/80'}`}>
                    {content}
                </p>
            </div>
        </div>
    );
}

function NpcImageCard({ npc, image, isSelected, onClick }) {
    return (
        <div
            className={`flex-shrink-0 cursor-pointer transition-all duration-300 ${isSelected ? 'scale-100' : 'opacity-80 hover:opacity-100 hover:scale-[1.02]'
                }`}
            onClick={onClick}
            style={{ width: '180px' }}
        >
            <div className={`relative rounded-2xl overflow-hidden aspect-[3/4] transition-all ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-base-100 shadow-xl shadow-primary/20' : 'border border-base-200'
                }`}>
                {image?.url ? (
                    <img src={image.url} alt={npc.name} className="w-full h-full object-cover object-top" />
                ) : (
                    <div className="w-full h-full bg-base-100 flex flex-col items-center justify-center p-2 text-base-content/40 gap-2">
                        <span className="loading loading-spinner loading-md text-primary/40"></span>
                        <span className="text-[10px] text-center font-medium opacity-60 animate-pulse">Generating...</span>
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8">
                    <p className="text-sm font-bold text-white text-center truncate tracking-wide">{npc.name}</p>
                </div>
            </div >
        </div >
    );
}

function WorldmapContent({
    layoutData,
    worldmapData,
    onGenerateWorldmap,
    isLoading,
    canGenerateMap,
    // 新增：地点标注相关
    locationMarkers = [],
    onMarkersChange,
    navWorldId,
    onSyncToNav,
    sceneNames = [],
    // 外部 tab 控制
    externalActiveTab,
    onActiveTabChange
}) {
    const [internalActiveTab, setInternalActiveTab] = useState('layout');
    const [isMarkerMode, setIsMarkerMode] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);

    // 使用外部 tab 或内部 tab
    const activeTab = externalActiveTab || internalActiveTab;
    const setActiveTab = (tab) => {
        setInternalActiveTab(tab);
        onActiveTabChange?.(tab);
    };

    const hasLayout = layoutData && (layoutData.layoutImage || layoutData.layoutUrl);
    const layoutImageUrl = layoutData?.layoutImage || layoutData?.layoutUrl;
    const hasWorldmap = worldmapData && worldmapData.url;

    // 同步外部 tab 变化到内部
    useEffect(() => {
        if (externalActiveTab && externalActiveTab !== internalActiveTab) {
            setInternalActiveTab(externalActiveTab);
        }
    }, [externalActiveTab]);

    // 首次生成 worldmap 时自动切换到 Final Map tab
    const prevHasWorldmapRef = useRef(hasWorldmap);
    useEffect(() => {
        // 从无到有时自动切换
        if (hasWorldmap && !prevHasWorldmapRef.current) {
            setActiveTab('worldmap');
        }
        prevHasWorldmapRef.current = hasWorldmap;
    }, [hasWorldmap]);

    // 处理同步
    const handleSync = async () => {
        if (!onSyncToNav || locationMarkers.length === 0) return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            await onSyncToNav();
        } catch (err) {
            setSyncError(err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!hasLayout && !hasWorldmap) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-base-200 rounded-3xl bg-base-50/50">
                <div className="w-16 h-16 rounded-full bg-base-100 flex items-center justify-center mb-4 shadow-sm">
                    <Icons.Map />
                </div>
                <h3 className="text-lg font-bold text-base-content">World Map</h3>
                <p className="text-sm text-base-content/50 max-w-xs text-center mt-2 mb-6">
                    {canGenerateMap ? 'Ready to generate your world map.' : 'Complete the story setting first.'}
                </p>
                {canGenerateMap && (
                    <button
                        className="btn btn-primary btn-sm rounded-full px-6"
                        onClick={() => onGenerateWorldmap?.()}
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Generate Map'}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4 mt-2">
            {/* Tab 切换 + 工具栏 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex bg-base-200/50 p-1 rounded-xl w-fit border border-base-200">
                    <button
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'layout' ? 'bg-white text-primary shadow-sm' : 'text-base-content/50 hover:text-base-content/70'}`}
                        onClick={() => setActiveTab('layout')}
                        disabled={!hasLayout}
                    >
                        Layout Draft
                    </button>
                    <button
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'worldmap' ? 'bg-white text-primary shadow-sm' : 'text-base-content/50 hover:text-base-content/70'}`}
                        onClick={() => setActiveTab('worldmap')}
                        disabled={!hasWorldmap}
                    >
                        Final Map
                    </button>
                </div>

                {/* 标注工具栏 */}
                {hasWorldmap && activeTab === 'worldmap' && (
                    <div className="flex items-center gap-2">
                        <button
                            className={`btn btn-xs gap-1.5 shadow-sm transition-all duration-300 font-extrabold border px-4 ${isMarkerMode
                                ? 'bg-secondary text-white border-secondary shadow-md scale-105'
                                : 'bg-base-100 border-base-300 text-base-content/70 hover:bg-secondary/10 hover:border-secondary/50 hover:text-secondary'
                                }`}
                            onClick={() => setIsMarkerMode(!isMarkerMode)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="text-[10px]">{isMarkerMode ? 'Done Marking' : 'Mark Locations'}</span>
                        </button>

                        {locationMarkers.length > 0 && (
                            <div className="flex items-center bg-primary/10 border border-primary/20 rounded-md px-1.5 h-6">
                                <span className="text-[10px] font-black text-primary uppercase tracking-wider">{locationMarkers.length} LOCS</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 标注提示信息 */}
            {isMarkerMode && (
                <div className="alert bg-secondary/10 border-secondary/20 shadow-sm flex items-center gap-3 py-2 px-4 rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <div className="p-1.5 bg-secondary text-white rounded-lg">
                        <Icons.Target />
                    </div>
                    <p className="text-xs font-bold text-base-content/80">
                        Use mouse to select locations on the map that need navigation, then click the<span className="text-secondary font-bold mx-1">"Cloud Sync"</span>button below to create navigation
                    </p>
                </div>
            )}

            {/* 地图内容 */}
            <div className="card bg-white shadow-md border border-base-200 overflow-hidden group rounded-xl">
                <figure className="relative">
                    {activeTab === 'layout' && (
                        hasLayout ? <img src={layoutImageUrl} alt="Layout" className="w-full object-cover" /> : <div className="flex items-center justify-center h-64"><span className="loading loading-spinner"></span></div>
                    )}
                    {activeTab === 'worldmap' && (
                        hasWorldmap ? (
                            <LocationMarkerEditor
                                mapUrl={worldmapData.url}
                                markers={locationMarkers}
                                onMarkersChange={onMarkersChange}
                                sceneNames={sceneNames}
                                isEditing={isMarkerMode}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-64"><span className="loading loading-spinner"></span></div>
                        )
                    )}
                </figure>
            </div>

            {/* 已标注地点列表 */}
            {activeTab === 'worldmap' && locationMarkers.length > 0 && (
                <div className="card bg-base-100/50 border border-base-200 p-3 shadow-sm rounded-xl">
                    <h4 className="text-[10px] font-black text-base-content/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Icons.Target /> Marked Regions
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                        {locationMarkers.map((marker) => (
                            <span key={marker.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-base-300 text-[11px] font-bold text-base-content shadow-sm">
                                <span className="text-primary">#</span> {marker.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 同步到导航服务 */}
            {activeTab === 'worldmap' && hasWorldmap && hasLayout && (
                <div className="card bg-base-100 border border-base-300 p-4 shadow-sm rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                    <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                        <div className="flex-1 min-w-[200px]">
                            <h4 className="font-bold text-xs text-base-content flex items-center gap-2 uppercase tracking-wide">
                                <div className="p-1.5 bg-primary text-white rounded-lg shadow-sm">
                                    <Icons.Target />
                                </div>
                                WorldNav Sync
                            </h4>
                            <p className="text-[10px] text-base-content/50 mt-1.5 break-all font-mono leading-relaxed">
                                {navWorldId
                                    ? <span className="text-success flex flex-col gap-0.5">
                                        <span className="font-bold text-[11px]">Synced Successfully</span>
                                        <span className="opacity-60 text-[9px] uppercase tracking-tighter">ID: {navWorldId}</span>
                                    </span>
                                    : 'Upload map & annotations to Nav API to enable NPC autonomous logic.'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {navWorldId && (
                                <a
                                    href={`${import.meta.env.VITE_NAV_API_BASE || 'http://localhost:8000'}/demo/?world=${navWorldId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-xs bg-base-200 border-base-300 hover:bg-base-300 text-base-content font-bold gap-1.5 h-8 px-3 rounded-lg transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" x2="21" y1="14" y2="3" />
                                    </svg>
                                    <span className="text-[10px] uppercase tracking-tight">Demo</span>
                                </a>
                            )}
                            <button
                                className={`btn btn-xs gap-1.5 shadow-sm transition-all duration-300 font-bold h-8 px-4 rounded-lg border ${navWorldId
                                    ? 'bg-primary/5 border-primary/20 text-primary hover:bg-primary/10'
                                    : 'btn-primary border-primary shadow-primary/20 hover:scale-105'
                                    }`}
                                onClick={handleSync}
                                disabled={isSyncing || locationMarkers.length === 0}
                            >
                                {isSyncing ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                        <path d="M16 16h5v5" />
                                    </svg>
                                )}
                                <span className="text-[10px] uppercase tracking-tight">{navWorldId ? 'Re-Sync' : 'Cloud Sync'}</span>
                            </button>
                        </div>
                    </div>
                    {syncError && (
                        <div className="text-xs text-error mt-2">❌ {syncError}</div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * SettingContent - Setting Step 3 卡片式布局
 */
function SettingContent({
    storyType = 'puzzle',
    gameTips = [],
    onTipsChange,
    environmentImages = [],
    onGenerateTips,
    isLoading
}) {
    const [localTips, setLocalTips] = useState(gameTips);
    const [editingTipIndex, setEditingTipIndex] = useState(null);
    const [editingTipValue, setEditingTipValue] = useState('');
    const [selectedBgm, setSelectedBgm] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentCgIndex, setCurrentCgIndex] = useState(0);
    const audioRef = useRef(null);

    // 同步外部 tips
    useEffect(() => {
        if (gameTips.length > 0) {
            setLocalTips(gameTips);
        }
    }, [gameTips]);

    // CG 轮播自动切换
    useEffect(() => {
        if (environmentImages.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentCgIndex(prev => (prev + 1) % environmentImages.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [environmentImages.length]);

    // 预置 BGM 列表
    const bgmList = [
        { id: 'mystery-1', name: 'Mystery Explore', url: 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/bgm.m4a' },
        { id: 'mystery-2', name: 'Tense Pursuit', url: '' },
        { id: 'adventure-1', name: 'Adventure Start', url: '' },
        { id: 'ambient-1', name: 'Ambient Immersion', url: '' }
    ];

    const handleTipEdit = (index) => {
        setEditingTipIndex(index);
        setEditingTipValue(localTips[index] || '');
    };

    const handleTipSave = () => {
        if (editingTipIndex !== null) {
            const newTips = [...localTips];
            newTips[editingTipIndex] = editingTipValue.trim();
            setLocalTips(newTips);
            onTipsChange?.(newTips);
            setEditingTipIndex(null);
        }
    };

    const handleGenerateTips = async () => {
        if (onGenerateTips) {
            try {
                const tips = await onGenerateTips();
                setLocalTips(tips);
            } catch (e) {
                console.error('Generate tips error:', e);
            }
        }
    };

    const handleBgmSelect = (bgm) => {
        // 如果点击的是当前播放的BGM，切换播放/暂停
        if (selectedBgm === bgm.id && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
            return;
        }

        // 切换到新BGM
        setSelectedBgm(bgm.id);
        setIsPlaying(false);

        if (bgm.url && audioRef.current) {
            audioRef.current.src = bgm.url;
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    // 停止播放
    const handleStopBgm = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* 游戏类型标签 */}
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <Icons.Puzzle />
                    <span className="text-sm font-bold text-primary">
                        {storyType === 'puzzle' ? 'Mystery Game' : 'Simulation Game'}
                    </span>
                </div>
            </div>

            {/* Tips 卡片 - 诗句风格 */}
            <SectionCard title="Opening Tips" icon={Icons.Sparkles}>
                {/* 隐藏的音频元素 */}
                <audio ref={audioRef} loop />

                <div className="py-4">
                    {localTips.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-sm text-base-content/50 mb-4">
                                Generate tips shown before entering the game
                            </p>
                            <button
                                className="btn btn-primary btn-sm gap-2"
                                onClick={handleGenerateTips}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    <Icons.Sparkles />
                                )}
                                Generate Opening Verse
                            </button>
                        </div>
                    ) : (
                        <div className="group relative">
                            {/* Verse Display */}
                            <div className="text-center py-6 px-4 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl">
                                {localTips.map((line, idx) => (
                                    <p
                                        key={idx}
                                        className="text-lg font-medium text-base-content/90 leading-relaxed tracking-wide"
                                        style={{ fontFamily: "'Noto Serif SC', 'Source Han Serif CN', serif" }}
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>

                            {/* 编辑按钮 - 始终显示 */}
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <button
                                    className="btn btn-xs btn-ghost gap-1"
                                    onClick={() => handleTipEdit(0)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    </svg>
                                    Edit
                                </button>
                                <button
                                    className="btn btn-xs btn-ghost gap-1 text-base-content/50 hover:text-primary"
                                    onClick={handleGenerateTips}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <span className="loading loading-spinner loading-xs"></span> : '🔄'}
                                    Regenerate
                                </button>
                            </div>

                            {/* 编辑模式 */}
                            {editingTipIndex !== null && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl p-4 flex flex-col gap-3">
                                    <textarea
                                        className="textarea textarea-bordered flex-1 text-center"
                                        value={localTips.join('\n')}
                                        onChange={(e) => setLocalTips(e.target.value.split('\n').slice(0, 2))}
                                        placeholder="First line&#10;Second line"
                                        rows={3}
                                    />
                                    <div className="flex gap-2 justify-center">
                                        <button className="btn btn-sm btn-ghost" onClick={() => setEditingTipIndex(null)}>
                                            Cancel
                                        </button>
                                        <button className="btn btn-sm btn-primary" onClick={() => {
                                            onTipsChange?.(localTips);
                                            setEditingTipIndex(null);
                                        }}>
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* BGM 选择卡片 */}
            <SectionCard title="Background Music" icon={Icons.Game}>
                <div className="grid grid-cols-2 gap-3">
                    {bgmList.map((bgm) => (
                        <button
                            key={bgm.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedBgm === bgm.id
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : bgm.url ? 'border-base-200 hover:border-primary/30' : 'border-base-200 opacity-50 cursor-not-allowed'
                                }`}
                            onClick={() => bgm.url && handleBgmSelect(bgm)}
                            disabled={!bgm.url}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedBgm === bgm.id ? 'bg-primary text-white' : 'bg-base-200 text-base-content/50'
                                }`}>
                                {selectedBgm === bgm.id && isPlaying ? (
                                    /* 暂停图标 */
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <rect x="6" y="4" width="4" height="16" rx="1" />
                                        <rect x="14" y="4" width="4" height="16" rx="1" />
                                    </svg>
                                ) : selectedBgm === bgm.id ? (
                                    /* 播放图标 */
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                ) : (
                                    /* 音符图标 */
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18V5l12-2v13" />
                                        <circle cx="6" cy="18" r="3" />
                                        <circle cx="18" cy="16" r="3" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-sm font-medium ${selectedBgm === bgm.id ? 'text-primary' : 'text-base-content/70'}`}>
                                    {bgm.name}
                                </span>
                                {!bgm.url && (
                                    <span className="text-xs text-base-content/40">Coming Soon</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-base-200">
                    <button className="btn btn-outline btn-sm w-full gap-2 opacity-50 cursor-not-allowed" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        Generate by SUNO (Coming Soon)
                    </button>
                </div>
            </SectionCard>

            {/* 开场 CG 卡片 */}
            <SectionCard title="Story Enter Preview" icon={Icons.Scene}>
                {environmentImages.length > 0 ? (
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                        <img
                            src={environmentImages[currentCgIndex]?.url}
                            alt={`Scene ${currentCgIndex + 1}`}
                            className="w-full h-full object-cover transition-opacity duration-700"
                        />
                        {/* 指示器 */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {environmentImages.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentCgIndex ? 'bg-white w-6' : 'bg-white/50'
                                        }`}
                                    onClick={() => setCurrentCgIndex(idx)}
                                />
                            ))}
                        </div>
                        {/* 遮罩文字 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-12 left-4 right-4 text-white">
                            <p className="text-xs opacity-70 uppercase tracking-wider">Scene {currentCgIndex + 1}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-base-content/40">
                        <Icons.Scene />
                        <p className="text-sm mt-2">暂无场景图片</p>
                    </div>
                )}
                <p className="text-xs text-base-content/50 mt-3 text-center">
                    CG animation editing features will be launched soon
                </p>
            </SectionCard>
        </div>
    );
}

function ScrollableList({ children }) {
    const scrollRef = React.useRef(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeft(scrollLeft > 0);
        setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    React.useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [children]);

    const scroll = (direction) => {
        if (!scrollRef.current) return;
        const amount = direction === 'left' ? -300 : 300;
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    return (
        <div className="relative group/scroll px-1">
            {showLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center text-base-content/70 hover:bg-white hover:text-primary transition-all -ml-3 border border-base-200"
                >
                    <Icons.ChevronLeft />
                </button>
            )}

            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-4 overflow-x-auto pb-6 pt-4 px-2 scrollbar-hide scroll-smooth -mx-2"
                style={{ scrollPaddingLeft: '8px', scrollPaddingRight: '8px' }}
            >
                {children}
            </div>

            {showRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center text-base-content/70 hover:bg-white hover:text-primary transition-all -mr-3 border border-base-200"
                >
                    <Icons.ChevronRight />
                </button>
            )}
        </div>
    );
}
