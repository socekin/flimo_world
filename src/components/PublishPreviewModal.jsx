import { useState, useRef, useEffect, useMemo } from 'react';
import { removeBackgroundBatch } from '../lib/removeBackgroundApi';
import { publishGame } from '../lib/gameStorageClient';

/**
 * PublishPreviewModal - Publish preview modal component
 * Full-screen modal displaying story content for creator confirmation before publishing
 * 
 * @param {Object} props
 * @param {Object} props.storyData - Story data (world, worldPlayer, npcs, npcsPlayer)
 * @param {Array} props.environmentImages - Scene image list
 * @param {Array} props.gameTips - Opening tips text
 * @param {Object} props.npcImageMap - NPC image mapping
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onConfirm - Confirm publish callback
 */
export default function PublishPreviewModal({
    storyData,
    environmentImages = [],
    gameTips = [],
    npcImageMap = {},
    navWorldId = null,
    onClose,
    onConfirm
}) {
    const [selectedNPC, setSelectedNPC] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const scrollContainerRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // 抠图处理状态
    const [processedNpcImageMap, setProcessedNpcImageMap] = useState({});
    const [processingNpcs, setProcessingNpcs] = useState(new Set());
    const [isProcessingBg, setIsProcessingBg] = useState(false);

    // 发布状态
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState(null);
    const [publishSuccess, setPublishSuccess] = useState(false);

    // Create Chinese name → English name mapping (based on array index)
    const chineseToEnglishNameMap = useMemo(() => {
        const map = {};
        const npcsEN = storyData?.npcs || [];
        const npcsCN = storyData?.npcsPlayer || [];
        npcsCN.forEach((npcCN, index) => {
            const npcEN = npcsEN[index];
            if (npcCN?.name && npcEN?.name) {
                map[npcCN.name] = npcEN.name;
            }
        });
        return map;
    }, [storyData]);

    // Initialize with first NPC selected
    useEffect(() => {
        const npcs = storyData?.npcsPlayer || [];
        if (npcs.length > 0 && !selectedNPC) {
            setSelectedNPC(npcs[0]);
        }
    }, [storyData, selectedNPC]);

    // Prevent duplicate processing
    const hasStartedProcessing = useRef(false);

    // Start background removal processing
    useEffect(() => {
        if (!npcImageMap || Object.keys(npcImageMap).length === 0) return;
        if (hasStartedProcessing.current) return;

        hasStartedProcessing.current = true;
        setIsProcessingBg(true);
        setProcessingNpcs(new Set(Object.keys(npcImageMap)));

        removeBackgroundBatch(npcImageMap, (npcName, processedUrl) => {
            // Each NPC processed, update state
            setProcessedNpcImageMap(prev => ({
                ...prev,
                [npcName]: [{ url: processedUrl }]
            }));
            setProcessingNpcs(prev => {
                const next = new Set(prev);
                next.delete(npcName);
                return next;
            });
        }).then(() => {
            setIsProcessingBg(false);
        }).catch(error => {
            console.error('[PublishPreviewModal] Background removal error:', error);
            setIsProcessingBg(false);
        });
    }, [npcImageMap]);

    // Get NPC image (prefer processed version)
    const getNpcImage = (npcChineseName) => {
        const npcEnglishName = chineseToEnglishNameMap[npcChineseName] || npcChineseName;
        const processed = processedNpcImageMap[npcEnglishName];
        if (processed && processed.length > 0 && processed[0]?.url) {
            return processed[0].url;
        }
        const original = npcImageMap[npcEnglishName];
        return original?.[0]?.url || '/img/placeholder-npc.png';
    };

    // Check if NPC is being processed
    const isNpcProcessing = (npcChineseName) => {
        const npcEnglishName = chineseToEnglishNameMap[npcChineseName] || npcChineseName;
        return processingNpcs.has(npcEnglishName);
    };

    // Auto carousel
    useEffect(() => {
        if (environmentImages.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % environmentImages.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [environmentImages.length]);

    // Check scroll position
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
    }, []);

    const scrollLeft = () => {
        scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
    };

    const scrollRight = () => {
        scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
    };

    const handleConfirmPublish = async () => {
        if (isPublishing || isProcessingBg) return;

        setIsPublishing(true);
        setPublishError(null);

        try {
            // Build NPC image map (use background-removed version, key is Chinese name)
            const npcImages = {};
            const npcsPlayer = storyData?.npcsPlayer || [];
            npcsPlayer.forEach((npc) => {
                const englishName = chineseToEnglishNameMap[npc.name] || npc.name;
                const processed = processedNpcImageMap[englishName];
                if (processed?.[0]?.url) {
                    npcImages[npc.name] = processed[0].url;
                } else {
                    // Fallback to original image
                    const original = npcImageMap[englishName];
                    if (original?.[0]?.url) {
                        npcImages[npc.name] = original[0].url;
                    }
                }
            });

            // Build GameData
            const gameData = {
                title: storyData?.worldPlayer?.title || storyData?.world?.title || 'Untitled Story',
                summary: storyData?.worldPlayer?.summary || '',
                environmentImages: environmentImages.map(img => img.url),
                npcsPlayer: storyData?.npcsPlayer || [],
                npcs: storyData?.npcs || [],
                world: storyData?.world || {},
                worldPlayer: storyData?.worldPlayer || {},
                navWorldId: navWorldId || '',
                gameTips: gameTips || []
            };

            // Call publish API
            const result = await publishGame(gameData, {
                coverUrl: environmentImages[0]?.url,
                npcImageMap: npcImages,
                environmentImages: environmentImages.map(img => img.url)  // 新增：环境图片 URL 数组
            });

            console.log('[PublishPreviewModal] Publish success:', result);
            setPublishSuccess(true);

            // Notify parent component
            if (onConfirm) {
                onConfirm(result);
            }
        } catch (error) {
            console.error('[PublishPreviewModal] Publish failed:', error);
            setPublishError(error.message || 'Publish failed, please retry');
        } finally {
            setIsPublishing(false);
        }
    };

    // Data extraction
    const title = storyData?.worldPlayer?.title || storyData?.world?.title || 'Untitled Story';
    const summary = storyData?.worldPlayer?.summary || '';
    const npcs = storyData?.npcsPlayer || [];

    // If no data, show prompt
    if (!storyData) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl mb-4 text-base-content">No story data found</p>
                    <button onClick={onClose} className="btn btn-primary">
                        Back to Edit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 text-base-content overflow-y-auto overflow-x-hidden animate-fade-in">
            {/* Back button */}
            <div className="p-6">
                <button
                    onClick={onClose}
                    className="btn btn-primary btn-sm gap-2 hover:gap-3 hover:scale-105 transition-all duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Edit
                </button>
            </div>

            {/* Scene carousel */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-gray-200">
                    {environmentImages.map((img, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img
                                src={img.url}
                                alt={`Scene ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}

                    {/* Navigation arrows */}
                    <button
                        onClick={() => setCurrentImageIndex((prev) => (prev - 1 + environmentImages.length) % environmentImages.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-primary opacity-70 hover:opacity-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % environmentImages.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-primary opacity-70 hover:opacity-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Indicators */}
                <div className="flex justify-center gap-2 mt-6">
                    {environmentImages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`h-2 rounded-full transition-all duration-500 ${index === currentImageIndex
                                ? 'bg-orange-500 w-12 shadow-lg shadow-orange-500/30'
                                : 'bg-gray-300 w-2 hover:bg-gray-400 hover:w-6'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Story introduction */}
            <div className="max-w-5xl mx-auto px-6 py-12">
                <h2 className="text-5xl font-bold text-center mb-10 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-clip-text text-transparent italic">
                    {title}
                </h2>
                <div className="bg-white/70 backdrop-blur-md rounded-3xl p-10 shadow-xl border border-orange-100">
                    <p className="text-gray-700 leading-relaxed text-xl text-justify indent-10 whitespace-pre-line tracking-wide">
                        {summary}
                    </p>
                </div>
            </div>

            {/* Character introduction */}
            <div className="px-6 py-12 max-w-5xl mx-auto">
                <div className="flex items-center justify-center gap-4 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-300"></div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                        Characters - {npcs.length}
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-300"></div>
                </div>

                {/* NPC list */}
                <div className="relative mt-12">
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
                        className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent"
                    >
                        <div className="flex gap-6 pt-20 pb-12 px-8 min-w-max justify-center">
                            {npcs.map((npc, index) => {
                                const imageUrl = getNpcImage(npc.name);
                                const isProcessing = isNpcProcessing(npc.name);

                                return (
                                    <div
                                        key={npc.name || index}
                                        onClick={() => setSelectedNPC(npc)}
                                        className={`cursor-pointer transition-all duration-500 ${selectedNPC?.name === npc.name
                                            ? 'scale-110 -translate-y-3'
                                            : 'hover:scale-105 hover:-translate-y-1 opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        <div className={`relative rounded-2xl transition-all duration-300 ${selectedNPC?.name === npc.name
                                            ? 'ring-4 ring-amber-400/50 shadow-2xl shadow-orange-200'
                                            : ''
                                            }`}>
                                            <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-base-200">
                                                {/* Image + Loading state */}
                                                <div className={`relative w-48 h-64 rounded-lg group ${isProcessing ? 'bg-gray-100' : ''}`}>
                                                    <img
                                                        src={imageUrl}
                                                        alt={npc.name}
                                                        className={`w-full h-full object-contain transition-all duration-500 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}
                                                        onError={(e) => {
                                                            if (e.target.src.includes('data:image/svg')) return;
                                                            console.warn(`[PublishPreviewModal] Image load failed: ${npc.name}, using placeholder`);
                                                            e.target.onerror = null;
                                                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                                                        }}
                                                    />
                                                    {isProcessing && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-lg">
                                                            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                            <span className="text-[10px] text-orange-600 font-medium uppercase tracking-wider animate-pulse">Processing</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedNPC?.name === npc.name && (
                                                    <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent pointer-events-none"></div>
                                                )}
                                                <div className={`absolute bottom-0 left-0 right-0 p-2 text-center transition-all duration-300 ${selectedNPC?.name === npc.name
                                                    ? 'bg-amber-500/80 backdrop-blur-sm rounded-b-2xl'
                                                    : 'bg-transparent'
                                                    }`}>
                                                    <p className={`font-bold transition-all duration-300 ${selectedNPC?.name === npc.name ? 'text-white text-base' : 'text-gray-600 text-sm'
                                                        }`}>
                                                        {npc.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* NPC details */}
                {selectedNPC && (
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 mt-8 shadow-xl border border-orange-100">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left side - Attribute list */}
                            <div className="lg:col-span-2 space-y-4">
                                {/* Description */}
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-500 text-xs font-semibold mb-1 uppercase">Description</p>
                                        <p className="text-gray-800 text-base leading-relaxed">{selectedNPC.description}</p>
                                    </div>
                                </div>

                                {/* Age & Gender */}
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-500 text-xs font-semibold mb-1 uppercase">Age / Gender</p>
                                        <p className="text-gray-800 text-base leading-relaxed">{selectedNPC.age} / {selectedNPC.gender}</p>
                                    </div>
                                </div>

                                {/* Goal */}
                                {selectedNPC.goal && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold mb-1 uppercase">Goal</p>
                                            <p className="text-gray-800 text-base leading-relaxed">{selectedNPC.goal}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Carry With */}
                                {selectedNPC.carry_with && selectedNPC.carry_with.length > 0 && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold mb-1 uppercase">Carry With</p>
                                            <p className="text-gray-800 text-base leading-relaxed">{Array.isArray(selectedNPC.carry_with) ? selectedNPC.carry_with.join('、') : selectedNPC.carry_with}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Recent Events */}
                                {selectedNPC.recent_events && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold mb-1 uppercase">Recent Events</p>
                                            <p className="text-gray-800 text-base leading-relaxed">{selectedNPC.recent_events}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Short Term Plan */}
                                {selectedNPC.short_term_plan && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold mb-1 uppercase">Short-term Plan</p>
                                            <p className="text-gray-800 text-base leading-relaxed">{selectedNPC.short_term_plan}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right side - Social network */}
                            <div className="lg:col-span-1">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-orange-500/70">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    </div>
                                    <h3 className="text-gray-500 text-xs font-semibold uppercase">Social Network</h3>
                                </div>

                                {selectedNPC.social_network && Object.keys(selectedNPC.social_network).length > 0 ? (
                                    <div className="flex flex-wrap gap-4 pl-11">
                                        {Object.entries(selectedNPC.social_network).map(([npcId, relation], index) => {
                                            const relatedNpc = npcs.find(n => n.id === npcId || n.name === npcId);
                                            const relatedImageUrl = relatedNpc ? getNpcImage(relatedNpc.name) : '/img/placeholder-npc.png';
                                            const isRelatedProcessing = relatedNpc ? isNpcProcessing(relatedNpc.name) : false;

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex flex-col items-center transition-all duration-300 hover:scale-105 cursor-pointer group"
                                                >
                                                    <div className={`relative mb-2 rounded-lg overflow-hidden ${isRelatedProcessing ? 'bg-gray-100' : ''}`}>
                                                        <img
                                                            src={relatedImageUrl}
                                                            alt={relatedNpc?.name || npcId}
                                                            className={`w-20 h-28 object-contain group-hover:opacity-80 transition-all duration-500 ${isRelatedProcessing ? 'opacity-0' : 'opacity-100'}`}
                                                            onError={(e) => {
                                                                if (e.target.src.includes('data:image/svg')) return;
                                                                e.target.onerror = null;
                                                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                                                            }}
                                                        />
                                                        {isRelatedProcessing && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                                                                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-800 font-bold text-xs">{relatedNpc?.name || npcId}</p>
                                                    <p className="text-gray-500 text-xs mt-1">{relation}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 pl-11">
                                        <p className="text-gray-500 text-sm">No social network info</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Opening tips + Publish button */}
            <div className="px-6 py-20 max-w-4xl mx-auto text-center">
                {gameTips && gameTips.length > 0 && (
                    <div className="mb-12 space-y-4">
                        {gameTips.map((tip, idx) => (
                            <p key={idx} className="text-gray-600 text-2xl font-medium leading-relaxed tracking-wide italic">
                                "{tip}"
                            </p>
                        ))}
                    </div>
                )}

                <h3 className="text-4xl font-bold mb-10 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    Your Choices, Your World
                </h3>

                {/* Publish status prompt */}
                {publishError && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700">
                        ⚠️ {publishError}
                    </div>
                )}

                {publishSuccess ? (
                    <div className="space-y-6">
                        <div className="p-6 bg-green-100 border border-green-300 rounded-xl text-green-700 text-xl">
                            ✅ Published successfully! Game saved to Library
                        </div>
                        <button
                            onClick={onClose}
                            className="px-12 py-4 text-xl font-bold text-white rounded-xl bg-primary hover:bg-primary/90 transition-all"
                        >
                            Back to Edit
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleConfirmPublish}
                        disabled={isPublishing || isProcessingBg}
                        className={`relative overflow-hidden px-24 py-5 text-2xl font-bold text-white rounded-xl transition-all duration-300 shadow-2xl ${isPublishing || isProcessingBg
                            ? 'opacity-70 cursor-not-allowed'
                            : 'hover:scale-110 active:scale-95'
                            }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600"></div>
                        <span className="relative z-10 flex items-center gap-3">
                            {isPublishing && (
                                <span className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></span>
                            )}
                            {isPublishing ? 'Publishing...' : isProcessingBg ? 'Processing images...' : 'Confirm Publish'}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
