import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameProvider, useGame } from './GameContext';
import GameTownMap from './components/GameTownMap';
import GameTopBar from './components/GameTopBar';
import GameBottomHUD from './components/GameBottomHUD';
import GameEventsPanel from './components/GameEventsPanel';
import GameInfoPanel from './components/GameInfoPanel';
import GameNpcEventsPanel from './components/GameNpcEventsPanel';
import GameNpcChatPanel from './components/GameNpcChatPanel';
import GameIntroModal from './components/GameIntroModal';
import GameAccuseModal from './components/GameAccuseModal';
import GameEndingModal from './components/GameEndingModal';
import { useNpcBehavior } from './hooks/useNpcBehavior';

/**
 * GamePlayContent - 游戏主内容（需要在 GameProvider 内）
 */
function GamePlayContent() {
    const navigate = useNavigate();
    const {
        loading,
        error,
        gameData,
        title,
        npcs,
        npcsPlayer,
        npcImageMap,
        mapUrl,
        locations,
        locationNames,
        navWorldId,
        gameTips,
        trueCulpritName,
        getLocationCenter,
        getRandomLocation
    } = useGame();

    // 游戏状态
    const [showIntro, setShowIntro] = useState(true);  // 是否显示开场弹窗
    const [hasStarted, setHasStarted] = useState(false);
    const [playTimeMs, setPlayTimeMs] = useState(0);
    const [selectedNpcId, setSelectedNpcId] = useState(null);
    const [isEventsPanelOpen, setIsEventsPanelOpen] = useState(true);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isNpcEventsOpen, setIsNpcEventsOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatNpcId, setChatNpcId] = useState(null);
    const [isAccuseOpen, setIsAccuseOpen] = useState(false);
    const [isEndingOpen, setIsEndingOpen] = useState(false);
    const [accusedNpcId, setAccusedNpcId] = useState(null);
    const [eventFeed, setEventFeed] = useState([]);  // 事件流

    // BGM 状态
    const [isBgmMuted, setIsBgmMuted] = useState(false);
    const [isBgmPlaying, setIsBgmPlaying] = useState(false);
    const bgmAudioRef = useRef(null);
    const BGM_URL = 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/bgm.m4a';

    // 构建 NPC 数据（合并 npcs 和图片，展开 profile 字段）
    const gameNpcs = useMemo(() => {
        return npcs.map((npc, index) => {
            // npcs 数据可能有嵌套的 profile 对象，需要展开
            const profile = npc.profile || {};
            return {
                id: index + 1,  // 生成 ID
                name: npc.name,
                image: npcImageMap[npc.name] || npcImageMap[npcsPlayer?.[index]?.name] || '',
                // 展开 profile 字段
                role: profile.role || npc.role,
                description: profile.description || npc.description,
                age: profile.age || npc.age,
                gender: profile.gender || npc.gender,
                goal: profile.goal || npc.goal,
                carryWith: profile.carry_with || npc.carry_with || npc.carryWith,
                recentEvents: profile.recent_events || npc.recent_events || npc.recentEvents,
                shortTermPlan: profile.short_term_plan || npc.short_term_plan || npc.shortTermPlan,
                socialNetwork: profile.social_network || npc.social_network || npc.socialNetwork,
                currentLocation: npc.current_location || npc.currentLocation,
                // 保留原始数据
                ...npc
            };
        });
    }, [npcs, npcsPlayer, npcImageMap]);

    // NPC 位置（随机分配到地点）
    const [positions, setPositions] = useState([]);

    // 初始化位置
    useEffect(() => {
        if (gameNpcs.length > 0 && locationNames.length > 0 && positions.length === 0) {
            const initialPositions = gameNpcs.map(npc => {
                const locationName = getRandomLocation();
                const center = getLocationCenter(locationName);
                // 假设地图尺寸为 1376 x 768（与原 Play.jsx 一致）
                const MAP_WIDTH = 1376;
                const MAP_HEIGHT = 768;
                const xPct = center ? (center.x / MAP_WIDTH) * 100 : 50;
                const yPct = center ? (center.y / MAP_HEIGHT) * 100 : 50;
                return { npcId: npc.id, xPct, yPct, location: locationName };
            });
            setPositions(initialPositions);
            setHasStarted(true);
        }
    }, [gameNpcs, locationNames, positions.length, getRandomLocation, getLocationCenter]);

    // 事件处理回调
    const handleEvent = useCallback((event) => {
        setEventFeed(prev => [event, ...prev].slice(0, 50)); // 最多保留 50 条
    }, []);

    // NPC 行为循环
    const {
        sessionId,
        isSessionReady,
        initSession,
        startNavigation,
        npcStates
    } = useNpcBehavior({
        gameData,
        npcs: gameNpcs,
        navWorldId,
        locations,
        positions,
        setPositions,
        onEvent: handleEvent,
        enabled: hasStarted && positions.length > 0
    });

    // 初始化完成后创建 session
    useEffect(() => {
        if (hasStarted && positions.length > 0 && !sessionId) {
            initSession();
        }
    }, [hasStarted, positions.length, sessionId, initSession]);

    // 游戏计时器
    useEffect(() => {
        if (!hasStarted) return;
        const timer = setInterval(() => {
            setPlayTimeMs(prev => prev + 1000);
        }, 1000);
        return () => clearInterval(timer);
    }, [hasStarted]);

    // BGM 控制
    useEffect(() => {
        if (!bgmAudioRef.current) {
            bgmAudioRef.current = new Audio(BGM_URL);
            bgmAudioRef.current.loop = true;
            bgmAudioRef.current.volume = 0.3;
        }

        const audio = bgmAudioRef.current;

        // 开场弹窗关闭后开始播放
        if (!showIntro && !isBgmMuted) {
            audio.play().then(() => {
                setIsBgmPlaying(true);
            }).catch(e => {
                console.warn('BGM play failed:', e);
            });
        }

        return () => {
            if (audio) {
                audio.pause();
            }
        };
    }, [showIntro, isBgmMuted]);

    // BGM 切换
    const handleToggleBgm = useCallback(() => {
        const audio = bgmAudioRef.current;
        if (!audio) return;

        if (isBgmMuted) {
            audio.play().then(() => {
                setIsBgmPlaying(true);
            }).catch(e => console.warn('BGM play failed:', e));
        } else {
            audio.pause();
            setIsBgmPlaying(false);
        }
        setIsBgmMuted(!isBgmMuted);
    }, [isBgmMuted]);

    // 选中的 NPC 对象
    const selectedNpc = useMemo(() => {
        return gameNpcs.find(npc => npc.id === selectedNpcId) || null;
    }, [gameNpcs, selectedNpcId]);

    // Loading 状态
    if (loading) {
        return (
            <div className="min-h-screen bg-base-300 flex items-center justify-center">
                <div className="text-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-base-content/60">Loading...</p>
                </div>
            </div>
        );
    }

    // Error 状态
    if (error) {
        return (
            <div className="min-h-screen bg-base-300 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <p className="text-error mb-4">{error}</p>
                    <button onClick={() => navigate('/#library')} className="btn btn-primary">
                        返回 Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">
            {/* 顶部导航栏 */}
            <GameTopBar
                title={title}
                playTimeMs={playTimeMs}
                isEventsPanelOpen={isEventsPanelOpen}
                onToggleEventsPanel={() => setIsEventsPanelOpen(!isEventsPanelOpen)}
                onOpenAccuse={() => setIsAccuseOpen(true)}
                isBgmMuted={isBgmMuted}
                isBgmPlaying={isBgmPlaying}
                onToggleBgm={handleToggleBgm}
            />

            {/* 地图主区域 - 高度为扣除顶部栏后的区域 */}
            <div
                className="relative w-full"
                style={{
                    height: 'calc(100% - var(--topbar-h, 36px))',
                    marginTop: 'var(--topbar-h, 36px)'
                }}
            >
                <GameTownMap
                    mapUrl={mapUrl}
                    npcs={gameNpcs}
                    positions={positions}
                    selectedNpcId={selectedNpcId}
                    onSelectNpc={setSelectedNpcId}
                    onBlankClick={() => {
                        setSelectedNpcId(null);
                        setIsInfoOpen(false);
                    }}
                />
            </div>

            {/* 底部 HUD */}
            <GameBottomHUD
                selectedNpc={selectedNpc}
                isInfoOpen={isInfoOpen}
                onOpenInfo={() => setIsInfoOpen(true)}
                onCloseInfo={() => setIsInfoOpen(false)}
                onOpenEvents={() => {
                    if (selectedNpcId) {
                        setIsNpcEventsOpen(true);
                    }
                }}
                onOpenChat={() => {
                    if (selectedNpcId) {
                        setChatNpcId(selectedNpcId);
                        setIsChatOpen(true);
                    }
                }}
            />

            {/* 右侧事件面板 */}
            <GameEventsPanel
                events={eventFeed}
                npcs={gameNpcs}
                isOpen={isEventsPanelOpen}
                onToggle={() => setIsEventsPanelOpen(!isEventsPanelOpen)}
                onSelectNpcEvents={(npcId) => {
                    setSelectedNpcId(npcId);
                    setIsNpcEventsOpen(true);
                }}
            />

            {/* NPC 信息面板 */}
            {isInfoOpen && selectedNpc && (
                <GameInfoPanel
                    npc={selectedNpc}
                    allNpcs={gameNpcs}
                    onClose={() => setIsInfoOpen(false)}
                />
            )}

            {/* NPC 事件历史面板 */}
            {isNpcEventsOpen && selectedNpc && (
                <GameNpcEventsPanel
                    npc={selectedNpc}
                    sessionId={sessionId}
                    onClose={() => setIsNpcEventsOpen(false)}
                    onOpenChat={(npc) => {
                        setIsNpcEventsOpen(false);
                        setChatNpcId(npc.id);
                        setIsChatOpen(true);
                    }}
                />
            )}

            {/* NPC 对话面板 */}
            {isChatOpen && chatNpcId && (
                <GameNpcChatPanel
                    npc={gameNpcs.find(n => n.id === chatNpcId)}
                    sessionId={sessionId}
                    onClose={() => {
                        setIsChatOpen(false);
                        setChatNpcId(null);
                    }}
                    onAfterThink={(npcId, targetLoc, behavior) => {
                        // 对话结束后，NPC 可能需要移动
                        if (behavior) {
                            handleEvent({
                                npcId,
                                npcName: gameNpcs.find(n => n.id === npcId)?.name || '',
                                action: behavior.action || '',
                                targetLocation: behavior.target_location || '',
                                startTime: behavior.start_time || new Date().toISOString()
                            });
                        }
                        if (targetLoc) {
                            const currentLoc = positions.find(p => p.npcId === npcId)?.location || '';
                            if (targetLoc !== currentLoc) {
                                startNavigation(npcId, currentLoc, targetLoc);
                            }
                        }
                    }}
                    onChatStart={(npcId) => {
                        // 开始对话时暂停该 NPC 的 think
                        console.log('[Chat] Started with NPC:', npcId);
                    }}
                />
            )}

            {/* 开场弹窗 */}
            {showIntro && !loading && (
                <GameIntroModal
                    title={title}
                    gameTips={gameTips}
                    onStart={() => setShowIntro(false)}
                />
            )}

            {/* 指控弹窗 */}
            {isAccuseOpen && (
                <GameAccuseModal
                    npcs={gameNpcs}
                    onAccuse={(npcId) => {
                        setAccusedNpcId(npcId);
                        setIsAccuseOpen(false);
                        setIsEndingOpen(true);
                    }}
                    onClose={() => setIsAccuseOpen(false)}
                />
            )}

            {/* 结局弹窗 */}
            {isEndingOpen && accusedNpcId && (
                <GameEndingModal
                    accusedNpc={gameNpcs.find(n => n.id === accusedNpcId)}
                    trueCulpritName={trueCulpritName}
                    onClose={() => setIsEndingOpen(false)}
                    onBackToLibrary={() => navigate('/#library')}
                />
            )}
        </div>
    );
}

/**
 * GamePlay - 动态游戏页面入口
 */
export default function GamePlay() {
    const { id } = useParams();

    if (!id) {
        return (
            <div className="min-h-screen bg-base-300 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-error">缺少游戏 ID</p>
                </div>
            </div>
        );
    }

    return (
        <GameProvider gameId={id}>
            <GamePlayContent />
        </GameProvider>
    );
}
