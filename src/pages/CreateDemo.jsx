import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateLayout from '../components/CreateLayout';
import ChatPanel from '../components/ChatPanelCreate';
import ResultsPanel from '../components/ResultsPanel';
import ErrorBoundary from '../components/ErrorBoundary';
import PublishPreviewModal from '../components/PublishPreviewModal';
import { useOrchestrator } from '../hooks/useOrchestrator';
import { syncToNavApi } from '../lib/navApiClient';

// Sample Stories categories
const SAMPLE_STORIES = {
    puzzle: {
        label: 'Mystery',
        iconKey: 'Puzzle',
        stories: [
            {
                id: 'puzzle-1',
                title: 'The Secret of Sweetwater',
                description: 'Sweetwater is a transport hub on a border trade route. The town sustains itself through ore transport, livestock trading, and occasional gold prospectors. Order is maintained by the Town Hall, including the Mayor and Sheriff; yet undercurrents run deep with commerce, smuggling, land disputes, and security issues. The town has been flagged by federal auditors due to recent unusual currency and material flows.',
                coverImage: '/img/story/cover1.png'
            },
            {
                id: 'puzzle-2',
                title: 'Tidehouse 47',
                description: 'A near-future vertical orchard city suddenly experiences "collective amnesia": residents wake each day convinced they are from different floors with different identities, and the city AI dynamically rewrites their access permissions based on their "self-narratives." You are an independent fault investigator hired to find who is using "memory forgery" to cover up a murder and massive resource theft before the city\'s automated systems lock down completely.',
                coverImage: 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/Smaple_story3.webp'
            },
            {
                id: 'puzzle-3',
                title: 'The Museum of Borrowed Shadows',
                description: 'A surrealist contemporary art museum opens a "Shadow Exhibition": visitors\' shadows are temporarily "borrowed" and projected into different galleries for interactive performances. On opening night, a curator disappears, leaving only a shadow that belongs to no one wandering the museum, seemingly guiding people to "see" a hidden work. You are a hired security consultant who must investigate the truth without closing the museum.',
                coverImage: 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/Smaple_story4.webp'
            }
        ]
    },
    simulation: {
        label: 'Simulation',
        iconKey: 'Building',
        stories: [
            {
                id: 'sim-1',
                title: 'Port of Paper Birds',
                description: 'You run a floating port city during post-war reconstruction. There is no stable currency here—transactions flow through "Paper Bird Contracts" (foldable signed vouchers). Your goal is not to make quick money, but to keep the port running among various factions, refugees, and merchant ships: arranging berths, repairs, rations, and arbitrating contract disputes. NPCs will autonomously negotiate, form alliances, spread rumors, and collectively boycott your policies.',
                coverImage: 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/Smaple_story1.webp'
            },
            {
                id: 'sim-2',
                title: 'Ashen Railway Cooperative',
                description: 'You are not the mayor or the boss, but the newly appointed dispatcher and operator of a struggling mountain steam railway cooperative. The blizzard season is approaching, and the railway is the valley\'s only lifeline: transporting coal, medicine, people, repairing tracks, and setting up stations. NPCs (drivers, maintenance workers, station masters, passengers, bandit informants) will autonomously form small groups, pass messages, and compete for shifts and resources.',
                coverImage: 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/Smaple_story5.webp'
            }
        ]
    }
};

/**
 * Create page - Integrated version with error boundary and Router editing support
 */
function CreateContent() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState('story');
    const [hasStarted, setHasStarted] = useState(false);
    const [inputToFill, setInputToFill] = useState('');
    const [storyType, setStoryType] = useState('puzzle'); // 'puzzle' | 'simulation'
    const [showSimulationWarning, setShowSimulationWarning] = useState(false);

    // Dynamic title state
    const [storyTitle, setStoryTitle] = useState(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitleValue, setEditingTitleValue] = useState('');

    const {
        state,
        messages,
        isLoading,
        createMysteryStory,
        handleStoryInput,
        handleWorldmapInput,
        generateWorldmap,
        generateGameTips,
        addWelcomeMessage
    } = useOrchestrator();

    // Setting Step 3 state
    const [gameTips, setGameTips] = useState([]);
    const [hasAutoGeneratedTips, setHasAutoGeneratedTips] = useState(false);

    // Publish preview modal state
    const [showPublishPreview, setShowPublishPreview] = useState(false);

    useEffect(() => {
        addWelcomeMessage();
    }, [addWelcomeMessage]);

    // Auto-generate opening tips (triggered once when entering Setting page)
    useEffect(() => {
        if (activeStep === 'game' && gameTips.length === 0 && state.world && !hasAutoGeneratedTips && !isLoading) {
            setHasAutoGeneratedTips(true);
            generateGameTips()
                .then(tips => setGameTips(tips))
                .catch(e => console.error('Auto generate tips error:', e));
        }
    }, [activeStep, gameTips.length, state.world, hasAutoGeneratedTips, isLoading, generateGameTips]);

    // Route by activeStep and storyType
    const handleSendMessage = async (input) => {
        // Check simulation mode BEFORE marking as started (to avoid triggering UI loading)
        if (!state.world && storyType === 'simulation') {
            setShowSimulationWarning(true);
            setTimeout(() => setShowSimulationWarning(false), 4000);
            return;
        }

        // User sent a message, mark as started
        if (!hasStarted) {
            setHasStarted(true);
        }

        // Detect Setting-related commands (opening tips)
        const settingKeywords = ['opening tips', 'intro text', 'welcome text', 'prologue'];
        const isSettingCommand = settingKeywords.some(k => input.includes(k));

        if (isSettingCommand && state.world) {
            try {
                const tips = await generateGameTips();
                setGameTips(tips);
            } catch (e) {
                console.error('Generate tips error:', e);
            }
            return;
        }

        if (activeStep === 'worldmap') {
            await handleWorldmapInput(input);
        } else if (state.world) {
            // Has story, use edit flow
            await handleStoryInput(input);
        } else {
            // New story - only puzzle type reaches here now
            await createMysteryStory(input);
        }
    };

    // Use Sample Story to fill input box and auto-set corresponding type
    const handleUseSampleStory = (story, category) => {
        // Check if simulation mode
        if (category === 'simulation') {
            setShowSimulationWarning(true);
            setTimeout(() => setShowSimulationWarning(false), 4000);
            return;
        }
        setInputToFill(story.description);
        // Auto-set storyType based on sample category
        if (category) {
            setStoryType(category);
        }
        // Reset inputToFill so next click can still trigger
        setTimeout(() => setInputToFill(''), 100);
    };

    const storyData = state.world ? {
        world: state.world,
        npcs: state.npcs || [],
        environmentImages: state.environmentImages || [],
        npcImageMap: state.npcImageMap || {},
        // Mystery stories: player version data
        worldPlayer: state.worldPlayer || null,
        npcsPlayer: state.npcsPlayer || []
    } : null;

    const worldmapData = state.worldmap || null;

    // Location marker management
    const [locationMarkers, setLocationMarkers] = useState([]);
    const [navWorldId, setNavWorldId] = useState(null);

    // Sync to navigation service
    const handleSyncToNav = useCallback(async () => {
        if (!worldmapData?.url || !state.layout?.layoutImage) {
            throw new Error('Map or layout image does not exist');
        }
        if (locationMarkers.length === 0) {
            throw new Error('Please mark at least one location first');
        }

        const result = await syncToNavApi({
            name: storyTitle || state.world?.title || state.world?.world || 'Flimo World',
            mapUrl: worldmapData.url,
            worldpathUrl: state.layout.layoutImage,
            locations: locationMarkers
        });

        setNavWorldId(result.worldId);
        return result;
    }, [worldmapData, state.layout, state.world, locationMarkers]);

    // 同步 World Title
    useEffect(() => {
        if (state.world?.title && !storyTitle) {
            setStoryTitle(state.world.title);
        }
    }, [state.world, storyTitle]);

    const handleTitleSave = () => {
        if (editingTitleValue.trim()) {
            setStoryTitle(editingTitleValue.trim());
        }
        setIsEditingTitle(false);
    };

    return (
        <div className="h-screen flex flex-col bg-base-100 font-sans relative">
            {/* Simulation mode warning toast */}
            {showSimulationWarning && (
                <div className="toast toast-top toast-center z-[100] absolute top-16 pointer-events-none">
                    <div role="alert" className="alert alert-warning shadow-lg border-2 border-warning/20 min-w-[320px] py-2 h-auto min-h-0 pointer-events-auto animate-in slide-in-from-top-10 duration-500 ease-out">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-bold tracking-tight">Simulation mode has not been released yet, coming soon</span>
                        <button
                            className="btn btn-xs btn-circle btn-ghost"
                            onClick={() => setShowSimulationWarning(false)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            {/* Header - Compact design */}
            <div className="h-12 border-b border-base-200 flex items-center bg-base-100/80 backdrop-blur z-20 sticky top-0">
                {/* Left section: corresponding to ResultsPanel width, title centered in this area */}
                <div className="flex-1 flex items-center h-full px-4">
                    <div className="flex-1 flex items-center">
                        <button
                            onClick={() => navigate('/')}
                            className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-base-content hover:bg-base-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                            Back
                        </button>
                    </div>

                    <div className="flex-none flex items-center gap-2">
                        {isEditingTitle ? (
                            <div className="flex items-center animate-in fade-in zoom-in-95 duration-200">
                                <input
                                    type="text"
                                    className="input input-sm input-bordered w-48 text-center font-bold text-base-content focus:outline-none focus:border-primary"
                                    value={editingTitleValue}
                                    onChange={(e) => setEditingTitleValue(e.target.value)}
                                    onBlur={handleTitleSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                                    autoFocus
                                    placeholder="Enter story title"
                                />
                            </div>
                        ) : (
                            <div className="relative group flex items-center justify-center px-4 py-1 rounded-lg hover:bg-base-200/50 transition-all cursor-pointer" onClick={() => {
                                setEditingTitleValue(storyTitle || 'Flimo World Creator');
                                setIsEditingTitle(true);
                            }}>
                                <span className="font-black text-base text-base-content tracking-tight">
                                    {storyTitle || 'Flimo World Creator'}
                                </span>
                                {/* Edit icon - absolutely positioned to avoid interfering with text centering */}
                                <div className="absolute left-[calc(100%-8px)] opacity-0 group-hover:opacity-100 transition-opacity text-base-content/40 p-1 rounded-md bg-base-200 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        <path d="m15 5 4 4" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1"></div>
                </div>

                {/* Right section: corresponding to ChatPanel width (450px) */}
                <div className="w-[450px] border-l border-base-200 h-full flex items-center justify-end px-4">
                    <button
                        className={`btn btn-sm px-4 transition-all ${state.world ? 'btn-primary shadow-sm' : 'btn-disabled bg-base-200 text-base-content/20'}`}
                        disabled={!state.world}
                        onClick={() => setShowPublishPreview(true)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                        Publish to Play
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <CreateLayout
                    resultsPanel={
                        <ErrorBoundary>
                            <ResultsPanel
                                activeStep={activeStep}
                                onStepChange={setActiveStep}
                                storyData={storyData}
                                layoutData={state.layout}
                                worldmapData={worldmapData}
                                rewardData={null}
                                onGenerateWorldmap={generateWorldmap}
                                isLoading={isLoading}
                                canGenerateMap={!!state.world}
                                hasStarted={hasStarted}
                                sampleStories={SAMPLE_STORIES}
                                onUseSampleStory={handleUseSampleStory}
                                locationMarkers={locationMarkers}
                                onMarkersChange={setLocationMarkers}
                                navWorldId={navWorldId}
                                onSyncToNav={handleSyncToNav}
                                storyType={storyType}
                                gameTips={gameTips}
                                onTipsChange={setGameTips}
                                onGenerateTips={generateGameTips}
                            />
                        </ErrorBoundary>
                    }
                    chatPanel={
                        <ErrorBoundary>
                            <ChatPanel
                                title="Flimo Agent"
                                messages={messages}
                                onSendMessage={handleSendMessage}
                                isLoading={isLoading}
                                externalInput={inputToFill}
                                storyType={storyType}
                                onStoryTypeChange={setStoryType}
                                hasStarted={hasStarted}
                            />
                        </ErrorBoundary>
                    }
                />
            </div>

            {/* Publish preview modal */}
            {showPublishPreview && (
                <PublishPreviewModal
                    storyData={{
                        world: state.world,
                        worldPlayer: state.worldPlayer,
                        npcs: state.npcs,
                        npcsPlayer: state.npcsPlayer
                    }}
                    environmentImages={state.environmentImages || []}
                    gameTips={gameTips}
                    npcImageMap={state.npcImageMap || {}}
                    navWorldId={navWorldId}
                    onClose={() => setShowPublishPreview(false)}
                    onConfirm={(result) => {
                        console.log('[CreateDemo] Publish complete:', result);
                    }}
                />
            )}
        </div>
    );
}

/**
 * Top-level error boundary wrapper
 */
export default function Create() {
    const navigate = useNavigate();

    return (
        <ErrorBoundary
            fallback={({ error, retry }) => (
                <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-8">
                    <div className="card bg-base-100 shadow-xl max-w-md w-full">
                        <div className="card-body items-center text-center">
                            <div className="text-6xl mb-4">😵</div>
                            <h2 className="card-title text-error">Application Error</h2>
                            <p className="text-sm opacity-70">
                                {error?.message || 'An unknown error occurred'}
                            </p>
                            <div className="card-actions justify-center mt-4 gap-2">
                                <button className="btn btn-primary" onClick={retry}>
                                    Retry
                                </button>
                                <button className="btn btn-ghost" onClick={() => navigate('/')}>
                                    Back to Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        >
            <CreateContent />
        </ErrorBoundary>
    );
}
