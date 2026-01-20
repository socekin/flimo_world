import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import TownMap from '../components/TownMap';
import EventsPanel from '../components/EventsPanel';
import BottomHUD from '../components/BottomHUD';
import InfoPanel from '../components/InfoPanel';
import NpcEventsPanel from '../components/NpcEventsPanel';
import NpcChatPanel from '../components/NpcChatPanel';
import { Navigator } from '../nav/Navigator';
import DebugNavOverlay from '../components/DebugNavOverlay';
import { npcData, avatarMap } from '../data/npcData';
import { storyNpcData } from '../data/storyNpcData';
import { createSession, thinkNpc, moveStart, moveArrive, interactNpc, getNpcDetails, getChatDetails } from '../api/npcService';
import { navigateBetweenLocations, navigateFromCoord } from '../api/navService';
import { storyWorldSetting } from '../data/storyWorld';
import { generateGeminiImages } from '../lib/geminiImageClient';
import { callLLM } from '../lib/llmClient';
import mapSemanticList from '../../MapSemanticList.json';

const BGM_URL = 'https://pub-31802ddd5e6e45bc98585a87515784d6.r2.dev/bgm.m4a';
const ACCUSE_GLOW_DELAY_MS = 2 * 60 * 1000; // Start glowing after 2 minutes
const ACCUSE_COUNTDOWN_MS = 3 * 60 * 1000; // 3 minute countdown
const ACCUSE_AUTO_MS = ACCUSE_GLOW_DELAY_MS + ACCUSE_COUNTDOWN_MS;
const TRUE_CULPRIT_NAME = 'Marcus Doyle';
const CORRUPT_MAYOR_NAME = 'Harlan Tate';

const ENDING_COPY = {
  truth: {
    title: 'The Real Culprit Caught',
    description: 'After you identified the sheriff, the evidence and confessions finally aligned. The coerced rancher was able to tell the truth, and the townspeople s fears gradually dissipated. Before the smoke from the explosion settled, the sheriff was publicly arrested, and the shadow of greed was torn open. You earned their trust and left the town with hope for rebuilding.'
  },
  corruption: {
    title: 'Wrong Arrest - The Mayor',
    description: 'You identified the mayor, and the corruption records were exposed, forcing a reckoning with the rotten administration. The people applauded, but no one noticed the real culprit still pulling strings in the shadows. The bombing case was hastily closed, and the town celebrated a misplaced victory. You received applause, but also planted the seeds of a new crisis.'
  },
  escape: {
    title: 'The Real Culprit Escapes',
    description: 'You identified someone else, and the townspeople directed their anger at a scapegoat, quickly closing the case. The real culprit used the opportunity to clear their name and continued to control the town s order and lies. The flames of the explosion became an excuse for silence, and Westridge Town s darkness quietly continued. You could only leave with lingering questions.'
  }
};

const parseTimeToMs = (timeStr) => {
  if (!timeStr) return -Infinity;
  const parsed = Date.parse(String(timeStr).replace(/-/g, '/'));
  if (!Number.isNaN(parsed)) return parsed;
  const match = /Day\s+(\d+),\s*(\d+):(\d+)\s*(AM|PM)/i.exec(String(timeStr));
  if (!match) return -Infinity;
  const day = Number(match[1]) || 0;
  let hour = Number(match[2]) || 0;
  const minute = Number(match[3]) || 0;
  const ampm = match[4].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return (day * 24 * 60 + hour * 60 + minute) * 60 * 1000;
};

const normalizeClueText = (text) => {
  if (!text) return '';
  return String(text).replace(/\s+/g, ' ').trim();
};

const normalizeSummaryText = (text) => normalizeClueText(text).replace(/^["']|["']$/g, '');

const shuffleArray = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getNpcAvatar = (npc) => {
  if (!npc) return '';
  return avatarMap[npc.name] || npc.image || '';
};

const locationNames = mapSemanticList.map((node) => node.name);
const locationSet = new Set(locationNames);
const fallbackLocation = locationNames[0] || 'Tavern';
const MAP_WIDTH = 1376;
const MAP_HEIGHT = 768;
const locationAliasMap = new Map([
  ['Sheriff Office', 'Police Station'],
  ['Mayor Office', 'City Hall'],
  ['Jail', 'Police Station'],
  ['Town Street', 'Residential Area']
]);
const locationCenterMap = mapSemanticList.reduce((acc, loc) => {
  acc.set(loc.name, loc.center);
  return acc;
}, new Map());

const toPctFromCenter = (name) => {
  const center = locationCenterMap.get(name);
  if (!center) return { xPct: 50, yPct: 50 };
  return {
    xPct: (center.x / MAP_WIDTH) * 100,
    yPct: (center.y / MAP_HEIGHT) * 100
  };
};

const npcInitialLocationMap = new Map([
  ['Eli Watkins', 'Residential Area'],
  ['Harlan Tate', 'City Hall'],
  ['Jonah Briggs', 'Police Station'],
  ['Lila Hart', 'Grocery Store'],
  ['Maeve Alcott', 'Tavern'],
  ['Marcus Doyle', 'Police Station'],
  ['Ramon Vega', 'Blacksmith']
]);

const getInitialLocationByNpc = (npc) => {
  const prefer = npc.currentLocation ? (locationAliasMap.get(npc.currentLocation) || npc.currentLocation) : null;
  if (prefer && locationCenterMap.has(prefer)) return prefer;
  const loc = npcInitialLocationMap.get(npc.name);
  if (loc && locationCenterMap.has(loc)) return loc;
  return fallbackLocation;
};

const isValidLocation = (name) => !!name && locationSet.has(name);

const pctFromLocationName = (locName) => toPctFromCenter(locName || fallbackLocation);

const toApiNpc = (npc) => ({
  id: `npc_${npc.id}`,
  name: npc.name,
  profile: {
    role: npc.role,
    description: npc.description,
    goal: npc.goal,
    recentEvents: npc.recentEvents,
    shortTermPlan: npc.shortTermPlan,
    carryWith: npc.carryWith,
    age: npc.age,
    gender: npc.gender,
    socialNetwork: npc.socialNetwork?.map((item) =>
      `${item.name}${item.relation ? ` (${item.relation})` : ''}`
    ),
    persona: npc.persona,
    breakingPoint: npc.breakingPoint
  },
  current_location: getInitialLocationByNpc(npc)
});

// Cross-mount initialization flag to prevent duplicate requests in StrictMode
let globalSessionInitStarted = false;

function Play() {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const initialPositions = useMemo(
    () =>
      npcData.map((npc) => {
        const loc = getInitialLocationByNpc(npc);
        const pct = toPctFromCenter(loc);
        return { npcId: npc.id, ...pct };
      }),
    []
  );
  const storyNpcMap = useMemo(() => {
    const map = new Map();
    storyNpcData.forEach((npc) => {
      if (npc?.name) map.set(npc.name, npc);
    });
    return map;
  }, []);
  const [hasStarted, setHasStarted] = useState(false);
  const [positions, setPositions] = useState(initialPositions);
  const [simEnabled] = useState(() => new URLSearchParams(window.location.search).get('sim') === '1' || localStorage.getItem('navSim') === '1');
  const navigatorRef = useRef(null);
  const [gridVis, setGridVis] = useState({ cols: 200, rows: 112, data: null });
  const [coverEnabled] = useState(() => new URLSearchParams(window.location.search).get('cover') === '1');
  const [selectedNpcId, setSelectedNpcId] = useState(2); // Default: Marcus Doyle (Sheriff, id=2)
  const [playTimeMs, setPlayTimeMs] = useState(0);
  const [isEventsPanelOpen, setIsEventsPanelOpen] = useState(true); // Default open
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isNpcEventsOpen, setIsNpcEventsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSysLogOpen, setIsSysLogOpen] = useState(false);
  const [npcEventsNpcId, setNpcEventsNpcId] = useState(null);
  const [sessionState, setSessionState] = useState({
    status: 'idle',
    sessionId: null,
    initialStates: null,
    error: null
  });
  const [npcLocations, setNpcLocations] = useState(() => {
    const map = new Map();
    npcData.forEach((npc) => {
      const loc = getInitialLocationByNpc(npc);
      map.set(npc.id, loc);
    });
    return map;
  });
  const initSessionStartedRef = useRef(false);
  const npcApiIdMap = useMemo(() => {
    const map = new Map();
    npcData.forEach((npc) => {
      map.set(npc.id, `npc_${npc.id}`);
    });
    return map;
  }, []);
  const topbarHeightVar = 'var(--topbar-h, 36px)';
  const navTimersRef = useRef(new Map());
  const thinkTimersRef = useRef(new Map());
  const npcLocationsRef = useRef(npcLocations);
  const positionsRef = useRef(positions);
  const bgmAudioRef = useRef(null);
  const [chatNpcId, setChatNpcId] = useState(null);
  const pausedCoordsRef = useRef(new Map()); // npcId -> {x,y} px
  const thinkInFlightRef = useRef(new Set());
  const chatNpcIdRef = useRef(null);
  const npcStateRef = useRef(new Map()); // npcId -> 'idle' | 'moving' | 'chatting'
  const lastTargetRef = useRef(new Map()); // npcId -> last valid target_location
  const sessionMetaRef = useRef({ id: null, status: 'idle' });
  const [sysLogs, setSysLogs] = useState([]);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [eventFeed, setEventFeed] = useState([]); // Latest behavior event feed
  const latestBehaviorRef = useRef(new Map()); // npcId -> {start_time, action, target_location}
  const lastInteractRef = useRef(new Map()); // npcId -> ts
  const pairInteractRef = useRef(new Map()); // key a-b -> ts
  const [interactingPairs, setInteractingPairs] = useState(new Map()); // pairKey -> [a,b]
  const interactToastRef = useRef(null);
  const interactToastTimerRef = useRef(null);
  const [isAccuseOpen, setIsAccuseOpen] = useState(false);
  const [accuseNpcId, setAccuseNpcId] = useState(null);
  const [showAccuseGlow, setShowAccuseGlow] = useState(false);
  const [accuseCountdownMs, setAccuseCountdownMs] = useState(null);
  const accuseAutoOpenedRef = useRef(false);
  const [isEndingOpen, setIsEndingOpen] = useState(false);
  const [endingStatus, setEndingStatus] = useState('idle');
  const [endingImageUrl, setEndingImageUrl] = useState(null);
  const [endingError, setEndingError] = useState(null);
  const [endingOutcome, setEndingOutcome] = useState(null);
  const [endingAccusedId, setEndingAccusedId] = useState(null);
  const [endingClueStatus, setEndingClueStatus] = useState('idle');
  const [endingClueError, setEndingClueError] = useState(null);
  const [endingClueGroups, setEndingClueGroups] = useState([]);
  const endingRequestIdRef = useRef(0);
  const endingRequestRef = useRef({ prompt: null, referenceImages: [] });
  const endingClueRequestIdRef = useRef(0);
  const playPausedRef = useRef(false);
  const playerInteractedNpcIdsRef = useRef(new Set());

  const clearNavTimer = (npcId) => {
    const t = navTimersRef.current.get(npcId);
    if (t) {
      clearInterval(t);
      navTimersRef.current.delete(npcId);
    }
  };

  const markNpcInteracted = (npcId) => {
    if (!npcId) return;
    playerInteractedNpcIdsRef.current.add(npcId);
  };

  const stopPlayRequests = () => {
    playPausedRef.current = true;
    navTimersRef.current.forEach((t) => clearInterval(t));
    thinkTimersRef.current.forEach((t) => clearTimeout(t));
    navTimersRef.current.clear();
    thinkTimersRef.current.clear();
    thinkInFlightRef.current.clear();
  };

  const pickWitnessNpcs = (accusedId) => {
    const interacted = [...playerInteractedNpcIdsRef.current].filter((id) => id && id !== accusedId);
    let picked = interacted;
    if (picked.length > 4) {
      picked = shuffleArray(picked).slice(0, 4);
    }
    return picked.map((id) => npcData.find((npc) => npc.id === id)).filter(Boolean);
  };

  const buildEndingPrompt = (accusedNpc, witnessNpcs) => {
    const accusedLabel = accusedNpc
      ? `${accusedNpc.name}${accusedNpc.role ? ` (${accusedNpc.role})` : ''}`
      : 'the accused NPC';
    const witnessesLabel = witnessNpcs.length
      ? witnessNpcs.map((npc) => `${npc.name}${npc.role ? ` (${npc.role})` : ''}`).join(', ')
      : 'town NPCs';
    return [
      'Disney/Pixar style 3D western town scene, cinematic wide shot.',
      `Scene: ${accusedLabel} is being arrested, hands restrained, no player character present.`,
      `Onlookers in the crowd: ${witnessesLabel}.`,
      'Background: the town bank is exploding with smoke, fire, and flying debris.',
      'Keep character faces and outfits consistent with the provided reference images.',
      'Warm dramatic lighting, clean composition, no text or watermark.'
    ].join(' ');
  };

  const requestEndingImage = async ({ prompt, referenceImages }) => {
    if (!prompt) return;
    const requestId = endingRequestIdRef.current + 1;
    endingRequestIdRef.current = requestId;
    setEndingStatus('loading');
    setEndingImageUrl(null);
    setEndingError(null);
    try {
      const images = await generateGeminiImages({
        prompt,
        n: 1,
        referenceImages,
        resolution: '1k',
        temperature: 0.7
      });
      if (endingRequestIdRef.current !== requestId) return;
      setEndingImageUrl(images?.[0]?.url || null);
      setEndingStatus('ready');
    } catch (err) {
      if (endingRequestIdRef.current !== requestId) return;
      setEndingStatus('error');
      setEndingError(err?.message || 'Failed to generate ending image');
    }
  };

  const formatChatMessages = (messages) => {
    return (Array.isArray(messages) ? messages : [])
      .map((msg) => {
        const role = msg?.role === 'user' ? 'Player' : 'NPC';
        const content = normalizeClueText(msg?.content);
        return content ? `${role}: ${content}` : '';
      })
      .filter(Boolean);
  };

  const buildNpcSummaryInput = ({ userChatHistory, chatDetails, activeChat, behaviorHistory }) => {
    const chatLines = [];
    const detailMap = new Map();
    chatDetails.forEach((detail) => {
      if (detail?.chat_id) detailMap.set(detail.chat_id, detail);
    });
    const sortedHistory = [...(userChatHistory || [])].map((item, idx) => ({
      item,
      sortValue: parseTimeToMs(item?.end_time || item?.start_time) + idx * 0.0001
    }));
    sortedHistory.sort((a, b) => a.sortValue - b.sortValue);
    sortedHistory.forEach(({ item }, index) => {
      const detail = item?.chat_id ? detailMap.get(item.chat_id) : null;
      const titleParts = [];
      if (item?.topic) titleParts.push(`Topic: ${normalizeClueText(item.topic)}`);
      const timeLabel = [item?.start_time, item?.end_time].filter(Boolean).join(' - ');
      if (timeLabel) titleParts.push(`Time: ${timeLabel}`);
      const header = titleParts.length ? `[Chat ${index + 1} | ${titleParts.join(' | ')}]` : `[Chat ${index + 1}]`;
      const lines = detail?.messages ? formatChatMessages(detail.messages) : [];
      if (lines.length) {
        chatLines.push(header, ...lines);
      } else if (item?.summary) {
        chatLines.push(`${header} ${normalizeClueText(item.summary)}`);
      }
    });
    const activeLines = formatChatMessages(activeChat);
    if (activeLines.length) {
      chatLines.push('[Active Chat]', ...activeLines);
    }
    const behaviorLines = (Array.isArray(behaviorHistory) ? behaviorHistory : [])
      .map((item) => {
        const action = normalizeClueText(item?.action);
        if (!action) return '';
        const location = normalizeClueText(item?.target_location);
        const timeLabel = item?.start_time || item?.end_time || '';
        const parts = [timeLabel, action, location ? `Location: ${location}` : ''].filter(Boolean);
        return parts.join('｜');
      })
      .filter(Boolean);
    return { chatLines, behaviorLines };
  };

  const buildNpcSummaryPrompt = ({ npcName, chatLines, behaviorLines }) => {
    const chatText = chatLines.length ? chatLines.join('\n') : '(None)';
    const behaviorText = behaviorLines.length ? behaviorLines.join('\n') : '(None)';
    return [
      'You are a mystery game recorder. Strictly summarize what the player has explicitly learned based on the provided records.',
      'Requirements: Only restate explicit information. Do not infer, add background, or introduce names/locations/events not present.',
      'Output: A paragraph in English (2-4 sentences, under 100 words). If records are empty or no clear info, output "No information to summarize."',
      `NPC: ${npcName || 'Unknown'}`,
      'Chat Records:',
      chatText,
      'Behavior Records:',
      behaviorText
    ].join('\n');
  };

  const summarizeNpcInsights = async ({ npcName, chatLines, behaviorLines }) => {
    if (!chatLines.length && !behaviorLines.length) {
      return 'No information to summarize.';
    }
    const prompt = buildNpcSummaryPrompt({ npcName, chatLines, behaviorLines });
    const { content } = await callLLM({
      temperature: 0.2,
      reasoning: null,
      messages: [
        { role: 'system', content: 'You are a precise summarization assistant. Never fabricate information.' },
        { role: 'user', content: prompt }
      ]
    });
    const cleaned = normalizeSummaryText(content);
    return cleaned || 'No information to summarize.';
  };

  const loadEndingClues = async (npcIds) => {
    const requestId = endingClueRequestIdRef.current + 1;
    endingClueRequestIdRef.current = requestId;
    setEndingClueStatus('loading');
    setEndingClueError(null);
    setEndingClueGroups([]);
    const sessionId = sessionMetaRef.current.id || sessionState.sessionId;
    const sessionStatus = sessionMetaRef.current.status || sessionState.status;
    if (!sessionId || sessionStatus !== 'ready' || !npcIds.length) {
      setEndingClueStatus('ready');
      return;
    }
    try {
      const results = await Promise.all(
        npcIds.map(async (npcId) => {
          const npc = npcData.find((item) => item.id === npcId);
          if (!npc) return null;
          const apiId = npcApiIdMap.get(npcId) || `npc_${npcId}`;
          try {
            const details = await getNpcDetails(sessionId, apiId);
            const userChatHistory = Array.isArray(details?.user_chat_history) ? details.user_chat_history : [];
            const activeChat = Array.isArray(details?.active_chat) ? details.active_chat : [];
            const behaviorHistory = Array.isArray(details?.behavior_history) ? details.behavior_history : [];
            const chatDetails = await Promise.all(
              userChatHistory.map(async (item) => {
                if (!item?.chat_id) return null;
                try {
                  return await getChatDetails(sessionId, apiId, item.chat_id);
                } catch (err) {
                  console.warn('load chat detail failed', err);
                  return null;
                }
              })
            );
            const { chatLines, behaviorLines } = buildNpcSummaryInput({
              userChatHistory,
              chatDetails: chatDetails.filter(Boolean),
              activeChat,
              behaviorHistory
            });
            const summary = await summarizeNpcInsights({ npcName: npc.name, chatLines, behaviorLines });
            return {
              npcId,
              name: npc.name,
              avatar: getNpcAvatar(npc),
              summary,
              error: null
            };
          } catch (err) {
            return {
              npcId,
              name: npc.name,
              avatar: getNpcAvatar(npc),
              summary: 'Summary failed. Please try again later.',
              error: err?.message || 'Failed to load clues'
            };
          }
        })
      );
      if (endingClueRequestIdRef.current !== requestId) return;
      const errors = results.filter((group) => group?.error);
      if (errors.length) {
        setEndingClueError('Failed to compile some information');
      }
      const groups = results.filter((group) => group);
      setEndingClueGroups(groups);
      setEndingClueStatus(groups.length === 0 && errors.length ? 'error' : 'ready');
    } catch (err) {
      if (endingClueRequestIdRef.current !== requestId) return;
      setEndingClueError(err?.message || 'Failed to load clues');
      setEndingClueGroups([]);
      setEndingClueStatus('error');
    }
  };

  const startEndingSequence = async (npcId) => {
    const accusedNpc = npcData.find((npc) => npc.id === npcId) || null;
    const outcome = accusedNpc?.name === TRUE_CULPRIT_NAME
      ? 'truth'
      : accusedNpc?.name === CORRUPT_MAYOR_NAME
        ? 'corruption'
        : 'escape';
    const witnesses = pickWitnessNpcs(npcId);
    const referenceImages = [getNpcAvatar(accusedNpc), ...witnesses.map((npc) => getNpcAvatar(npc))].filter(Boolean);
    const prompt = buildEndingPrompt(accusedNpc, witnesses);
    endingRequestRef.current = { prompt, referenceImages };

    setEndingOutcome(outcome);
    setEndingAccusedId(npcId);
    setIsEndingOpen(true);
    stopPlayRequests();
    setIsAccuseOpen(false);
    setIsChatOpen(false);
    setIsInfoOpen(false);
    setIsNpcEventsOpen(false);
    setIsEventsPanelOpen(false);
    const interactedNpcIds = [...playerInteractedNpcIdsRef.current].filter((id) => id);
    loadEndingClues(interactedNpcIds);
    await requestEndingImage({ prompt, referenceImages });
  };

  const tryInteract = (npcId, { reason = 'move' } = {}) => {
    if (playPausedRef.current) return;
    const now = Date.now();
    const sessionId = sessionMetaRef.current.id || sessionState.sessionId;
    const sessionStatus = sessionMetaRef.current.status || sessionState.status;
    if (!sessionId || sessionStatus !== 'ready') return;
    if (isNpcBusy(npcId)) return;
    if (isInCooldown(npcId, now)) return;
    const myLoc = npcLocationsRef.current.get(npcId) || null;
    const mePos = positionsRef.current?.find((p) => p.npcId === npcId);
    if (!mePos) return;
    const candidates = positionsRef.current
      .filter((p) => p.npcId !== npcId)
      .map((p) => ({ ...p, state: getNpcState(p.npcId) || 'idle', loc: npcLocationsRef.current.get(p.npcId) || null }));
    const NEAR_DIST2 = 30 * 30;
    const SAME_LOC_DIST2 = 80 * 80;
    const moving = getNpcState(npcId) === 'moving';
    const pool = candidates.filter((p) => {
      if (isNpcBusy(p.npcId)) return false;
      if (isInCooldown(p.npcId, now)) return false;
      if (isPairInCooldown(npcId, p.npcId, now)) return false;
      // Moving NPCs don't use 'same location' check to avoid misjudgment from old positions; same location also requires distance threshold
      const sameLoc = !moving && myLoc && p.loc && myLoc === p.loc;
      const dx = ((p.xPct - mePos.xPct) * MAP_WIDTH) / 100;
      const dy = ((p.yPct - mePos.yPct) * MAP_HEIGHT) / 100;
      const dist2 = dx * dx + dy * dy;
      const maxDist2 = sameLoc ? SAME_LOC_DIST2 : NEAR_DIST2;
      return dist2 <= maxDist2;
    });
    if (!pool.length) {
      if (reason === 'arrive') {
        logSnapshot('interact-none', npcId, { reason, loc: myLoc });
      }
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    logSnapshot('interact-attempt', npcId, { reason, target: pick.npcId, loc: myLoc });
    const initiatorId = npcApiIdMap.get(npcId) || `npc_${npcId}`;
    const targetId = npcApiIdMap.get(pick.npcId) || `npc_${pick.npcId}`;
    interactNpc(sessionId, initiatorId, targetId, { current_time: formatNow() })
      .then((res) => {
        markInteraction(npcId, pick.npcId);
        if (res?.behavior_updates) {
          Object.entries(res.behavior_updates).forEach(([apiId, behavior]) => {
            const id = Number(String(apiId).replace('npc_', '')) || null;
            if (id) upsertEvent(id, behavior);
          });
        }
      })
      .catch((err) => {
        console.warn('interact failed', err);
        logSnapshot('interact-error', npcId, { reason, target: pick.npcId, error: err?.message });
      });
  };

  const clearThinkTimer = (npcId) => {
    const t = thinkTimersRef.current.get(npcId);
    if (t) {
      clearTimeout(t);
      thinkTimersRef.current.delete(npcId);
    }
    thinkInFlightRef.current.delete(npcId);
  };

  const setNpcState = (npcId, state) => {
    const map = new Map(npcStateRef.current);
    map.set(npcId, state);
    npcStateRef.current = map;
  };

  const getNpcState = (npcId) => npcStateRef.current.get(npcId);

  const isNpcBusy = (npcId) => {
    const state = getNpcState(npcId);
    return state === 'chatting' || state === 'moving';
  };

  const parseBehaviorTime = (t) => {
    if (!t) return null;
    const parsed = Date.parse(String(t).replace(/-/g, '/'));
    if (!Number.isNaN(parsed)) return new Date(parsed);
    return null;
  };

  const upsertEvent = (npcId, behavior) => {
    if (!behavior?.start_time) return;
    const parsed = parseBehaviorTime(behavior.start_time);
    if (!parsed) return;
    const map = new Map(latestBehaviorRef.current);
    map.set(npcId, {
      start_time: behavior.start_time,
      action: behavior.action || '',
      target_location: behavior.target_location || ''
    });
    latestBehaviorRef.current = map;
    const list = [];
    map.forEach((b, id) => {
      const t = parseBehaviorTime(b.start_time);
      if (!t) return;
      const npc = npcData.find((n) => n.id === id);
      list.push({
        npcId: id,
        npcName: npc?.name || `npc_${id}`,
        startTime: t,
        action: b.action,
        targetLocation: b.target_location
      });
    });
    list.sort((a, b) => b.startTime - a.startTime);
    setEventFeed(list);
  };

  const pairKey = (a, b) => {
    const [x, y] = [a, b].sort((m, n) => m - n);
    return `${x}-${y}`;
  };

  const isInCooldown = (npcId, nowMs) => {
    const ts = lastInteractRef.current.get(npcId) || 0;
    return nowMs - ts < 30000;
  };

  const isPairInCooldown = (a, b, nowMs) => {
    const ts = pairInteractRef.current.get(pairKey(a, b)) || 0;
    return nowMs - ts < 30000;
  };

  const markInteraction = (a, b) => {
    const now = Date.now();
    const key = pairKey(a, b);
    const m1 = new Map(lastInteractRef.current);
    m1.set(a, now);
    m1.set(b, now);
    lastInteractRef.current = m1;
    const m2 = new Map(pairInteractRef.current);
    m2.set(key, now);
    pairInteractRef.current = m2;
    setInteractingPairs((prev) => {
      const next = new Map(prev);
      next.set(key, [a, b]);
      return next;
    });
    setTimeout(() => {
      setInteractingPairs((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }, 5000);
  };

  const showInteractingToast = (text = 'NPC is in conversation...') => {
    if (interactToastRef.current) return;
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.bottom = '32px';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '9999';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '999px';
    el.style.background = 'rgba(0,0,0,0.7)';
    el.style.color = '#fff';
    el.style.fontSize = '12px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#34d399;display:inline-block;animation:pulse 1s infinite;"></span>${text}`;
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
    `;
    el.appendChild(style);
    document.body.appendChild(el);
    interactToastRef.current = el;
    interactToastTimerRef.current = setTimeout(() => {
      if (interactToastRef.current?.parentNode) {
        interactToastRef.current.parentNode.removeChild(interactToastRef.current);
      }
      interactToastRef.current = null;
      interactToastTimerRef.current = null;
    }, 2000);
  };

  const logSnapshot = (label, npcId = null, meta = null) => {
    const ts = formatNow();
    const targets = npcId ? npcData.filter((n) => n.id === npcId) : npcData;
    const snapshot = targets.map((npc) => {
      const id = npc.id;
      const currentLocation = npcLocationsRef.current.get(id) || getInitialLocationByNpc(npc);
      const targetLocation = lastTargetRef.current.get(id);
      const state = getNpcState(id) || 'idle';
      const navRunning = navTimersRef.current.has(id);
      return { npcId: id, name: npc.name, currentLocation, targetLocation, state, navRunning };
    });
    setSysLogs((prev) => {
      const next = [{ ts, label, npcId, meta, snapshot }, ...prev];
      return next.slice(0, 100);
    });
  };

  const formatNow = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const updateNpcPositionToLocation = (npcId, locName) => {
    const pct = pctFromLocationName(locName);
    setPositions((prev) => {
      const next = prev.map((p) => (p.npcId === npcId ? { ...p, ...pct } : p));
      positionsRef.current = next;
      return next;
    });
    setNpcLocations((prev) => {
      const next = new Map(prev);
      next.set(npcId, locName);
      npcLocationsRef.current = next;
      return next;
    });
  };

  const startNavigation = async (npcId, fromLoc, toLoc, opts = {}) => {
    if (playPausedRef.current) return;
    if (!toLoc || toLoc === fromLoc) {
      logSnapshot('nav-skip', npcId, { reason: 'no-dest-or-same', fromLoc, toLoc });
      return;
    }
    if (chatNpcIdRef.current === npcId) {
      logSnapshot('nav-skip', npcId, { reason: 'chatting', toLoc });
      return; // Don't move while chatting
    }
    clearNavTimer(npcId);
    setNpcState(npcId, 'moving');
    const sessionId = opts.sessionId || sessionMetaRef.current.id || sessionState.sessionId;
    const sessionStatus = opts.sessionStatus || sessionMetaRef.current.status || sessionState.status;
    if (!sessionId || sessionStatus !== 'ready') {
      logSnapshot('nav-skip', npcId, { reason: 'session-not-ready' });
      return;
    }
    try {
      await moveStart(sessionId, npcApiIdMap.get(npcId) || `npc_${npcId}`, {
        current_time: formatNow(),
        from_location: fromLoc,
        to_location: toLoc
      });
    } catch (err) {
      console.warn('move/start failed', err);
      logSnapshot('nav-error', npcId, { reason: 'move-start', error: err?.message });
    }
    if (playPausedRef.current) return;
    logSnapshot('nav-start', npcId, { from: fromLoc, to: toLoc });

    // Prefer current pixel coordinates as starting point to ensure navigation from real-time position
    const normalizeCoord = (pt) => pt ? { x: Math.round(pt.x), y: Math.round(pt.y) } : null;
    const useCoord = normalizeCoord(
      opts.fromCoord ||
      (() => {
        const pos = positionsRef.current?.find((p) => p.npcId === npcId);
        if (!pos) return null;
        return { x: (pos.xPct / 100) * MAP_WIDTH, y: (pos.yPct / 100) * MAP_HEIGHT };
      })()
    );

    const navPromise = useCoord
      ? navigateFromCoord({ fromX: useCoord.x, fromY: useCoord.y, to: toLoc })
      : navigateBetweenLocations({ from: fromLoc, to: toLoc });

    logSnapshot('nav-branch', npcId, {
      fromLoc,
      toLoc,
      branch: useCoord ? 'coord' : 'location',
      fromCoord: useCoord || undefined
    });

    navPromise
      .then((res) => {
        if (playPausedRef.current) return;
        const path = Array.isArray(res?.path) ? res.path : [];
        if (path.length < 2) {
          updateNpcPositionToLocation(npcId, toLoc);
          setNpcState(npcId, 'idle');
          scheduleThink(npcId);
          tryInteract(npcId, { reason: 'arrive' });
          return;
        }
        let idx = 0;
        let stepCounter = 0;
        const timer = setInterval(() => {
          if (playPausedRef.current) {
            clearInterval(timer);
            navTimersRef.current.delete(npcId);
            return;
          }
          idx += 1;
          if (idx >= path.length) {
            clearInterval(timer);
            navTimersRef.current.delete(npcId);
            updateNpcPositionToLocation(npcId, toLoc);
            setNpcState(npcId, 'idle');
            moveArrive(sessionId, npcApiIdMap.get(npcId) || `npc_${npcId}`, {
              current_time: formatNow(),
              location: toLoc
            }).catch((err) => console.warn('move/arrive failed', err));
            logSnapshot('arrive', npcId);
            scheduleThink(npcId);
            tryInteract(npcId, { reason: 'arrive' });
            return;
          }
          stepCounter += 1;
          if (stepCounter >= 10) {
            tryInteract(npcId, { reason: 'move' });
            stepCounter = 0;
          }
          const pt = path[idx];
          const xPct = (pt.x / MAP_WIDTH) * 100;
          const yPct = (pt.y / MAP_HEIGHT) * 100;
          setPositions((prev) =>
            prev.map((p) =>
              p.npcId === npcId ? { ...p, xPct, yPct } : p
            )
          );
        }, 40);
        navTimersRef.current.set(npcId, timer);
      })
      .catch((err) => {
        console.warn('Navigation failed', err);
        setNpcState(npcId, 'idle');
        logSnapshot('nav-error', npcId, { reason: 'nav-fetch', error: err?.message });
      });
  };

  const scheduleThink = (npcId, opts = {}) => {
    if (playPausedRef.current) {
      clearThinkTimer(npcId);
      return;
    }
    clearThinkTimer(npcId);
    const sessionId = opts.sessionId ?? sessionMetaRef.current.id ?? sessionState.sessionId;
    const sessionStatus = opts.sessionStatus ?? sessionMetaRef.current.status ?? sessionState.status;
    const npcApiId = npcApiIdMap.get(npcId) || `npc_${npcId}`;
    if (!sessionId || sessionStatus !== 'ready') return;
    if (chatNpcIdRef.current === npcId) return; // Don't trigger think while chatting
    if (getNpcState(npcId) === 'moving') return;
    if (interactingPairs.size && [...interactingPairs.values()].some((pair) => pair.includes(npcId))) return;
    if (thinkInFlightRef.current.has(npcId)) return;
    thinkInFlightRef.current.add(npcId);
    const timer = setTimeout(async () => {
      if (playPausedRef.current) {
        thinkInFlightRef.current.delete(npcId);
        return;
      }
      try {
        const currentLoc = npcLocations.get(npcId) || fallbackLocation;
        const res = await thinkNpc(sessionId, npcApiId, {
          current_time: formatNow()
        });
        if (playPausedRef.current) return;
        logSnapshot('think', npcId);
        if (res?.behavior) {
          upsertEvent(npcId, res.behavior);
        }
        const rawTarget = res?.behavior?.target_location;
        const nextLoc = isValidLocation(rawTarget) ? rawTarget : (lastTargetRef.current.get(npcId) || rawTarget);
        if (isValidLocation(nextLoc)) {
          lastTargetRef.current.set(npcId, nextLoc);
        }
        const latestLoc = npcLocationsRef.current.get(npcId) || currentLoc;
        if (nextLoc && isValidLocation(nextLoc) && nextLoc !== latestLoc) {
          startNavigation(npcId, latestLoc, nextLoc);
        } else {
          // Target unchanged and still idle, schedule next think
          scheduleThink(npcId);
        }
      } catch (err) {
        console.warn('Think failed', err);
        logSnapshot('think-error', npcId, { error: err?.message });
      } finally {
        thinkInFlightRef.current.delete(npcId);
      }
    }, 30000); // 30s interval
    thinkTimersRef.current.set(npcId, timer);
  };

  const applyInitialStates = (initialStates = {}, sessionIdForInit = null) => {
    const newPositions = npcData.map((npc) => {
      const key = `npc_${npc.id}`;
      const state = initialStates[key];
      const loc = state?.current_location || getInitialLocationByNpc(npc);
      const pct = pctFromLocationName(loc);
      return { npcId: npc.id, ...pct };
    });
    setPositions(newPositions);
    setNpcLocations(() => {
      const m = new Map();
      npcData.forEach((npc) => {
        const key = `npc_${npc.id}`;
        const state = initialStates[key];
        const loc = state?.current_location || getInitialLocationByNpc(npc);
        m.set(npc.id, loc);
      });
      return m;
    });

    npcData.forEach((npc) => {
      const key = `npc_${npc.id}`;
      const state = initialStates[key];
      const currentLoc = state?.current_location || getInitialLocationByNpc(npc);
      const target = state?.behavior?.target_location;
      if (state?.behavior) {
        upsertEvent(npc.id, state.behavior);
      }
      const m = new Map(npcStateRef.current);
      m.set(npc.id, state?.status || 'idle');
      npcStateRef.current = m;
      if (isValidLocation(target)) {
        const m = new Map(lastTargetRef.current);
        m.set(npc.id, target);
        lastTargetRef.current = m;
      }
      if (currentLoc && currentLoc === target) {
        setNpcState(npc.id, 'idle');
        scheduleThink(npc.id, { sessionId: sessionIdForInit, sessionStatus: 'ready' });
      } else if (currentLoc === 'moving') {
        setNpcState(npc.id, 'moving');
      } else if (target && target !== currentLoc) {
        setNpcState(npc.id, 'moving');
        const dest = isValidLocation(target) ? target : currentLoc;
        if (isValidLocation(dest) && dest !== currentLoc) {
          startNavigation(npc.id, currentLoc, dest, { sessionId: sessionIdForInit, sessionStatus: 'ready' });
        }
      } else {
        setNpcState(npc.id, 'idle');
        scheduleThink(npc.id, { sessionId: sessionIdForInit, sessionStatus: 'ready' });
      }
    });
  };
  // PlayTime timer
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setPlayTimeMs(Date.now() - startTime);
    }, 100); // 每100ms更新一次

    return () => clearInterval(timer);
  }, []);

  // Sync latest npcLocations to ref (for async callbacks)
  useEffect(() => {
    npcLocationsRef.current = npcLocations;
  }, [npcLocations]);

  // Continuously sync latest coordinates for navigation starting point
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    chatNpcIdRef.current = chatNpcId;
  }, [chatNpcId]);

  /* eslint-disable react-hooks/exhaustive-deps */
  // Initialize world session
  useEffect(() => {
    if (!hasStarted) return;
    if (initSessionStartedRef.current || globalSessionInitStarted) return;
    initSessionStartedRef.current = true;
    globalSessionInitStarted = true;

    const payload = {
      current_time: formatNow(),
      world_setting: storyWorldSetting,
      locations: mapSemanticList.map((loc) => loc.name),
      npcs: npcData.map((npc) => {
        const locName = getInitialLocationByNpc(npc);
        return { ...toApiNpc(npc), current_location: locName };
      })
    };
    setSessionState((prev) => ({ ...prev, status: 'loading', error: null }));
    createSession(payload)
      .then((res) => {
        sessionMetaRef.current = { id: res.session_id, status: 'ready' };
        setSessionState({
          status: 'ready',
          sessionId: res.session_id,
          initialStates: res.initial_states || {},
          error: null
        });
        applyInitialStates(res.initial_states || {}, res.session_id);
      })
      .catch((err) => {
        console.error('Failed to initialize world session', err);
        setSessionState({
          status: 'error',
          sessionId: null,
          initialStates: null,
          error: err?.message || 'Initialization failed'
        });
      });
    // Cleanup: reset global flag when component unmounts
    return () => {
      globalSessionInitStarted = false;
      initSessionStartedRef.current = false;
    };
  }, [hasStarted]);

  // Background music
  useEffect(() => {
    const audio = new Audio(BGM_URL);
    audio.loop = true;
    audio.volume = 0.5;
    audio.muted = isBgmMuted;
    const handlePlay = () => setIsBgmPlaying(true);
    const handlePause = () => setIsBgmPlaying(false);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    bgmAudioRef.current = audio;
    audio.play().catch(() => { });
    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      bgmAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;
    audio.muted = isBgmMuted;
    if (isBgmMuted) {
      audio.pause();
    } else if (audio.paused) {
      audio.play().catch(() => { });
    }
  }, [isBgmMuted]);

  const toggleBgm = () => {
    setIsBgmMuted((v) => !v);
  };

  const handleAccuseConfirm = () => {
    if (!accuseNpcId) return;
    startEndingSequence(accuseNpcId);
    setAccuseNpcId(null);
  };

  const handleEndingRetry = () => {
    const { prompt, referenceImages } = endingRequestRef.current || {};
    if (!prompt) return;
    stopPlayRequests();
    requestEndingImage({ prompt, referenceImages });
  };

  const handleEndingClose = () => {
    setIsEndingOpen(false);
    navigate('/story');
  };

  useEffect(() => {
    if (isEndingOpen) {
      stopPlayRequests();
    }
  }, [isEndingOpen]);

  // Accuse button glow and auto-popup timer
  useEffect(() => {
    if (isEndingOpen) {
      setShowAccuseGlow(false);
      setAccuseCountdownMs(null);
      return;
    }
    if (!hasStarted) {
      setShowAccuseGlow(false);
      setAccuseCountdownMs(null);
      return;
    }
    if (playTimeMs >= ACCUSE_GLOW_DELAY_MS) {
      setShowAccuseGlow(true);
      const remaining = Math.max(ACCUSE_AUTO_MS - playTimeMs, 0);
      const withinWindow = Math.min(remaining, ACCUSE_COUNTDOWN_MS);
      setAccuseCountdownMs(withinWindow);
      if (remaining === 0 && !accuseAutoOpenedRef.current) {
        setIsAccuseOpen(true);
        accuseAutoOpenedRef.current = true;
      }
    } else {
      setShowAccuseGlow(false);
      setAccuseCountdownMs(null);
    }
  }, [playTimeMs, hasStarted]);

  const pauseNavigation = (npcId) => {
    clearNavTimer(npcId);
    clearThinkTimer(npcId);
    const pos = positionsRef.current?.find((p) => p.npcId === npcId);
    if (pos) {
      const x = Math.round((pos.xPct / 100) * MAP_WIDTH);
      const y = Math.round((pos.yPct / 100) * MAP_HEIGHT);
      pausedCoordsRef.current.set(npcId, { x, y });
    }
  };

  const handleChatStart = (npcId) => {
    if (playPausedRef.current) return;
    if (interactingPairs.size && [...interactingPairs.values()].some((pair) => pair.includes(npcId))) {
      showInteractingToast();
      return;
    }
    markNpcInteracted(npcId);
    setChatNpcId(npcId);
    chatNpcIdRef.current = npcId;
    setNpcState(npcId, 'chatting');
    pauseNavigation(npcId);
  };

  const handleChatThinkResult = (npcId, targetLoc, behavior = null) => {
    setChatNpcId(null);
    chatNpcIdRef.current = null;
    const paused = pausedCoordsRef.current.get(npcId);
    pausedCoordsRef.current.delete(npcId);
    setNpcState(npcId, 'idle');
    if (playPausedRef.current) {
      return;
    }
    const sessionId = sessionMetaRef.current.id || sessionState.sessionId;
    const sessionStatus = sessionMetaRef.current.status || sessionState.status;
    if (!sessionId || sessionStatus !== 'ready') {
      scheduleThink(npcId);
      return;
    }
    const intended = isValidLocation(targetLoc)
      ? targetLoc
      : lastTargetRef.current.get(npcId) || targetLoc;
    const toLoc = isValidLocation(intended)
      ? intended
      : npcLocationsRef.current.get(npcId) || fallbackLocation;
    if (isValidLocation(toLoc)) {
      const m = new Map(lastTargetRef.current);
      m.set(npcId, toLoc);
      lastTargetRef.current = m;
    }
    if (behavior) {
      upsertEvent(npcId, behavior);
    }
    if (paused) {
      setNpcState(npcId, 'moving');
      const npcApiId = npcApiIdMap.get(npcId) || `npc_${npcId}`;
      moveStart(sessionId, npcApiId, {
        current_time: formatNow(),
        from_location: 'paused',
        to_location: toLoc
      }).catch((err) => console.warn('move/start failed after chat', err));
      logSnapshot('nav-start-resume', npcId);
      navigateFromCoord({
        fromX: paused.x,
        fromY: paused.y,
        to: toLoc
      })
        .then((res) => {
          if (playPausedRef.current) return;
          const path = Array.isArray(res?.path) ? res.path : [];
          if (!path.length) {
            updateNpcPositionToLocation(npcId, toLoc);
            setNpcState(npcId, 'idle');
            scheduleThink(npcId);
            tryInteract(npcId, { reason: 'arrive' });
            return;
          }
          let idx = 0;
          let stepCounter = 0;
          const timer = setInterval(() => {
            if (playPausedRef.current) {
              clearInterval(timer);
              navTimersRef.current.delete(npcId);
              return;
            }
            idx += 1;
            if (idx >= path.length) {
              clearInterval(timer);
              navTimersRef.current.delete(npcId);
              updateNpcPositionToLocation(npcId, toLoc);
              setNpcState(npcId, 'idle');
              scheduleThink(npcId);
              tryInteract(npcId, { reason: 'arrive' });
              return;
            }
            stepCounter += 1;
            if (stepCounter >= 10) {
              tryInteract(npcId, { reason: 'move' });
              stepCounter = 0;
            }
            const pt = path[idx];
            const xPct = (pt.x / MAP_WIDTH) * 100;
            const yPct = (pt.y / MAP_HEIGHT) * 100;
            setPositions((prev) =>
              prev.map((p) =>
                p.npcId === npcId ? { ...p, xPct, yPct } : p
              )
            );
          }, 40);
          navTimersRef.current.set(npcId, timer);
        })
        .catch((err) => {
          console.warn('Navigation failed (resume after chat)', err);
          setNpcState(npcId, 'idle');
          logSnapshot('nav-error', npcId, { reason: 'nav-resume', error: err?.message });
          scheduleThink(npcId);
        });
    } else {
      const currentLoc = npcLocationsRef.current.get(npcId) || fallbackLocation;
      if (toLoc !== currentLoc) {
        startNavigation(npcId, currentLoc, toLoc);
      } else {
        scheduleThink(npcId);
      }
    }
  };

  // Select/deselect NPC
  const handleSelectNpc = (npcId) => {
    if (npcId && interactingPairs.size && [...interactingPairs.values()].some((pair) => pair.includes(npcId))) {
      showInteractingToast();
      return;
    }
    setSelectedNpcId(prevId => {
      const nextId = prevId === npcId ? null : npcId;
      // Info 打开时，切换 NPC 直接切换内容；如果点击空白导致 nextId 为 null，则关闭 Info
      if (isInfoOpen && nextId === null) setIsInfoOpen(false);
      return nextId;
    });
  };

  // Toggle Events panel
  const handleToggleEventsPanel = () => {
    setIsEventsPanelOpen(prev => !prev);
  };

  // Open Info: close Events
  const openInfo = () => {
    if (selectedNpcId) markNpcInteracted(selectedNpcId);
    setIsInfoOpen(true);
    setIsEventsPanelOpen(false);
    setIsNpcEventsOpen(false);
    setIsChatOpen(false);
  };

  const closeInfo = () => setIsInfoOpen(false);

  // Open NPC events panel
  const openNpcEvents = (npcId, { keepEventsPanelOpen = false } = {}) => {
    if (!npcId) return;
    markNpcInteracted(npcId);
    setNpcEventsNpcId(npcId);
    setIsNpcEventsOpen(true);
    setIsInfoOpen(false);
    if (!keepEventsPanelOpen) {
      setIsEventsPanelOpen(false);
    }
    setIsChatOpen(false);
  };
  const closeNpcEvents = () => {
    setIsNpcEventsOpen(false);
    setNpcEventsNpcId(null);
  };

  // Open Chat panel
  const openChat = () => {
    if (selectedNpc && interactingPairs.size && [...interactingPairs.values()].some((pair) => pair.includes(selectedNpc.id))) {
      showInteractingToast();
      return;
    }
    setIsChatOpen(true);
    setIsInfoOpen(false);
    setIsNpcEventsOpen(false);
    setIsEventsPanelOpen(false);
  };
  const closeChat = () => setIsChatOpen(false);

  // Get selected NPC data
  const selectedNpc = selectedNpcId
    ? npcData.find(npc => npc.id === selectedNpcId)
    : null;
  const displayNpc = selectedNpc
    ? storyNpcMap.get(selectedNpc.name) || selectedNpc
    : null;
  const npcForEventsPanel = npcEventsNpcId
    ? npcData.find(npc => npc.id === npcEventsNpcId)
    : null;
  const endingAccusedNpc = endingAccusedId
    ? npcData.find((npc) => npc.id === endingAccusedId)
    : null;
  const endingCopy = endingOutcome ? ENDING_COPY[endingOutcome] : null;
  const accuseCountdownProgress = accuseCountdownMs === null
    ? null
    : Math.max(0, Math.min(accuseCountdownMs / ACCUSE_COUNTDOWN_MS, 1));
  const endingClueStats = useMemo(() => {
    return { npcCount: endingClueGroups.length };
  }, [endingClueGroups]);

  // Start/destroy navigation simulation (?sim=1 or ?cover=1)
  useEffect(() => {
    if (!simEnabled && !coverEnabled) return;
    const root = mapRef.current;
    if (!root) return;
    const nav = new Navigator(root, (id, state) => {
      // Update corresponding NPC position (percentage)
      setPositions(prev => prev.map(p => p.npcId === id ? { ...p, xPct: state.xPct, yPct: state.yPct } : p));
    }, { speedPxPerSec: coverEnabled ? 200 : 120, gridCols: 240, gridRows: 135, colorThreshold: { r: 180, g: 80, b: 80, a: 40 } });
    navigatorRef.current = nav;
    if (coverEnabled) {
      const id = 2; // Marcus Doyle (Sheriff)
      const p = initialPositions.find(x => x.npcId === id);
      if (p) nav.addNpc(id, { x: p.xPct, y: p.yPct });
      const prevReady = nav.nav.onGridReady;
      nav.nav.onGridReady = (meta) => {
        if (prevReady) prevReady(meta);
        nav.nav.getGrid().then(({ cols, rows, data }) => setGridVis({ cols, rows, data }));
        nav.startCoverage(id, { stride: 4, speedPxPerSec: 400 });
      };
      // Fallback: if grid is already available, start immediately
      nav.nav.getGrid().then(({ cols, rows, data }) => {
        if (data && data.length === cols * rows) {
          setGridVis({ cols, rows, data });
          nav.startCoverage(id, { stride: 4, speedPxPerSec: 400 });
        }
      });
    } else {
      // Random walk (Marcus Doyle Sheriff, Eli Watkins Journalist, Ramon Vega Blacksmith)
      const activeNpcIds = new Set([2, 4, 5]);
      initialPositions
        .filter(p => activeNpcIds.has(p.npcId))
        .forEach(p => nav.addNpc(p.npcId, { x: p.xPct, y: p.yPct }));
      nav.nav.getGrid().then(({ cols, rows, data }) => setGridVis({ cols, rows, data }));
    }
    return () => { nav.destroy(); navigatorRef.current = null; };
  }, [simEnabled, coverEnabled]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      navTimersRef.current.forEach((t) => clearInterval(t));
      thinkTimersRef.current.forEach((t) => clearTimeout(t));
      navTimersRef.current.clear();
      thinkTimersRef.current.clear();
      thinkInFlightRef.current.clear();
      if (interactToastRef.current?.parentNode) {
        interactToastRef.current.parentNode.removeChild(interactToastRef.current);
      }
      if (interactToastTimerRef.current) {
        clearTimeout(interactToastTimerRef.current);
      }
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Mission intro modal */}
      {!hasStarted && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center px-6">
          <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl space-y-6 text-white animate-fade-in">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-white/60">Mission</p>
              <h2 className="text-3xl font-bold">Westridge Town Needs You</h2>
              <p className="text-base leading-relaxed text-white/80">
                An explosion hit the bank vault, and the cash inside is missing. As an inspector originally here to investigate the town's financial issues, you now have to handle this incident. Find the culprit as soon as possible.
              </p>
            </div>
            <button
              onClick={() => setHasStarted(true)}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-lg font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              Start Investigation
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <TopBar
        playTimeMs={playTimeMs}
        isEventsPanelOpen={isEventsPanelOpen}
        onToggleEventsPanel={handleToggleEventsPanel}
        isSysLogOpen={isSysLogOpen}
        onToggleSysLog={() => setIsSysLogOpen((v) => !v)}
        isBgmMuted={isBgmMuted}
        isBgmPlaying={!isBgmMuted && isBgmPlaying}
        onToggleBgm={toggleBgm}
        onOpenAccuse={() => setIsAccuseOpen(true)}
        accuseGlow={showAccuseGlow}
        accuseCountdownProgress={accuseCountdownProgress}
      />

      {/* Main area (map + panels), height excludes top bar */}
      <div
        className="relative w-full"
        style={{ height: `calc(100% - ${topbarHeightVar})`, marginTop: topbarHeightVar }}
      >
        {/* Central map */}
        <TownMap
          ref={mapRef}
          positions={positions}
          selectedNpcId={selectedNpcId}
          interactingPairs={interactingPairs}
          onSelectNpc={handleSelectNpc}
          onBlankClick={() => {
            if (isInfoOpen) setIsInfoOpen(false); // Only close Info, don't clear selection
          }}
        />
        {/* Debug grid: only show when cover=1 or sim=1 and grid data exists */}
        {coverEnabled && gridVis.data && (
          <DebugNavOverlay show={true} cols={gridVis.cols} rows={gridVis.rows} gridData={gridVis.data} showRoadsImage={true} roadsUrl={'/img/play/roads.png'} />
        )}

        {/* Right events panel */}
        <EventsPanel
          events={eventFeed}
          isOpen={isEventsPanelOpen}
          onToggle={handleToggleEventsPanel}
          onSelectNpcEvents={(npcId) => openNpcEvents(npcId, { keepEventsPanelOpen: true })}
        />

        {/* Bottom HUD (auto-hide when Info is open) */}
        {!isInfoOpen && !isNpcEventsOpen && !isChatOpen && interactingPairs.size === 0 && (
          <BottomHUD
            selectedNpc={selectedNpc}
            onOpenInfo={openInfo}
            isInfoOpen={isInfoOpen}
            onCloseInfo={closeInfo}
            onOpenEvents={() => selectedNpc && openNpcEvents(selectedNpc.id)}
            onOpenChat={openChat}
          />
        )}

        {/* Info floating panel */}
        {isInfoOpen && displayNpc && (
          <InfoPanel npc={displayNpc} onClose={closeInfo} />
        )}

        {/* NPC Events floating panel */}
        {isNpcEventsOpen && npcForEventsPanel && (
          <NpcEventsPanel
            npc={npcForEventsPanel}
            onClose={closeNpcEvents}
            sessionId={sessionState.sessionId}
            sessionStatus={sessionState.status}
          />
        )}

        {/* Chat panel */}
        {isChatOpen && selectedNpc && (
          <NpcChatPanel
            npc={selectedNpc}
            npcApiId={npcApiIdMap.get(selectedNpc.id)}
            sessionId={sessionState.sessionId}
            sessionStatus={sessionState.status}
            onClose={closeChat}
            currentGameTime={formatNow()}
            onAfterThink={handleChatThinkResult}
            onChatStart={() => handleChatStart(selectedNpc.id)}
          />
        )}
      </div>

      {/* Accuse modal */}
      {isAccuseOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center px-6">
          <div className="max-w-3xl w-full bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 text-white animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">Identify</p>
                <h2 className="text-2xl font-bold">Identify the Culprit</h2>
              </div>
              <button
                onClick={() => setIsAccuseOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close identification panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {npcData.map((npc) => {
                const isSelected = accuseNpcId === npc.id;
                const avatar = avatarMap[npc.name] || npc.image;
                return (
                  <button
                    key={npc.id}
                    onClick={() => setAccuseNpcId(npc.id)}
                    className={`relative group rounded-2xl border p-3 flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? 'border-primary bg-primary/20' : 'border-white/10 bg-white/5 hover:border-primary/60'
                      }`}
                  >
                    <div className="w-20 h-24 flex items-center justify-center">
                      <img src={avatar} alt={npc.name} className="max-h-full object-contain drop-shadow" />
                    </div>
                    <p className="text-sm font-semibold text-center">{npc.name}</p>
                    {isSelected && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-lg">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {accuseNpcId && (
              <div className="flex justify-end">
                <button
                  onClick={handleAccuseConfirm}
                  className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-base font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg"
                >
                  Arrest Culprit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ending result modal */}
      {isEndingOpen && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-lg flex items-start justify-center px-6 py-10 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6 text-white animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-white/60">Finale</p>
                <h2 className="text-3xl font-bold">The Finale</h2>
                {endingAccusedNpc && (
                  <p className="text-sm text-white/60 mt-1">Accused: {endingAccusedNpc.name}</p>
                )}
              </div>
              <button
                onClick={handleEndingClose}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
                aria-label="Close ending panel"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                {endingImageUrl ? (
                  <img
                    src={endingImageUrl}
                    alt={endingAccusedNpc ? `${endingAccusedNpc.name} arrest scene` : 'Ending scene'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 text-sm gap-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" aria-hidden="true" />
                      Generating ending...
                    </span>
                  </div>
                )}
              </div>

              {endingStatus === 'error' && endingError && (
                <div className="text-sm text-rose-200 flex items-center gap-3">
                  <span>Failed to generate ending image: {endingError}</span>
                  <button
                    onClick={handleEndingRetry}
                    className="px-3 py-1 rounded-full bg-rose-200/10 text-rose-100 hover:bg-rose-200/20 transition-colors text-xs font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {endingCopy && (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{endingCopy.title}</h3>
                  <p className="text-base leading-relaxed text-white/80">{endingCopy.description}</p>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">What You Have Learned</h3>
                    <p className="text-xs text-white/60 mt-1">
                      Compiled information from {endingClueStats.npcCount} NPCs
                    </p>
                  </div>
                  {endingClueStatus === 'loading' && (
                    <span className="text-xs text-white/60 inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-white/50 border-t-transparent animate-spin" aria-hidden="true" />
                      Compiling...
                    </span>
                  )}
                </div>

                {endingClueError && (
                  <div className="text-sm text-rose-200">{endingClueError}</div>
                )}

                {endingClueStatus === 'ready' && endingClueGroups.length === 0 && (
                  <div className="text-sm text-white/60">No information to summarize.</div>
                )}

                {endingClueGroups.length > 0 && (
                  <div className="space-y-6">
                    {endingClueGroups.map((group) => (
                      <div key={group.npcId} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={group.avatar}
                            alt={group.name}
                            className="w-7 h-7 rounded-full ring-2 ring-white/20 object-cover object-top"
                          />
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">
                          {group.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System log sidebar */}
      {isSysLogOpen && (
        <div className="fixed top-[var(--topbar-h,36px)] right-0 w-80 h-[calc(100vh-var(--topbar-h,36px))] bg-black/80 text-white z-[70] border-l border-white/10 backdrop-blur-md overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold">System Log</span>
            <button onClick={() => setIsSysLogOpen(false)} className="text-white/70 hover:text-white">×</button>
          </div>
          <div className="p-3 space-y-3 text-xs">
            {sysLogs.length === 0 && <div className="text-white/60">No logs yet</div>}
            {sysLogs.map((log, idx) => (
              <div key={`${log.ts}-${idx}`} className="rounded-lg border border-white/10 p-2">
                <div className="flex items-center justify-between text-white/80">
                  <span>{log.label}</span>
                  <span className="text-white/50">{log.ts}</span>
                </div>
                {log.npcId && <div className="text-white/60">npc: {log.npcId}</div>}
                {log.meta && (
                  <div className="text-white/60 text-[11px] break-words">
                    {typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta)}
                  </div>
                )}
                <div className="mt-1 space-y-1">
                  {log.snapshot.map((s) => (
                    <div key={s.npcId} className="flex flex-col text-[11px] text-white/70">
                      <div className="flex justify-between">
                        <span className="truncate max-w-[80px]">{s.name}</span>
                        <span className="truncate max-w-[60px]">state:{s.state}</span>
                        <span className={s.navRunning ? 'text-emerald-300' : 'text-white/50'}>{s.navRunning ? 'nav' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate max-w-[120px]">cur:{s.currentLocation}</span>
                        <span className="truncate max-w-[120px]">tgt:{s.targetLocation || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Play;
