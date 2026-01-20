import { useEffect, useState, useRef, forwardRef, useMemo } from 'react';
import AvatarMarker from './AvatarMarker';
import { npcData, avatarMap } from '../data/npcData';

const MAP_RATIO = 1376 / 768; // Width / Height
const CLUSTER_RADIUS_PX = 18; // Cluster detection radius (for grouping)
const TRIGGER_HALF_W = 24; // Trigger detection area half-width (covers avatar)
const TRIGGER_HALF_H = 36; // Trigger detection area half-height (covers avatar)
const COLLAPSE_DELAY_MS = 500;
const EXPAND_RADIUS_PX = 14; // Expansion offset radius
const INTERACT_OFFSET_PX = 40; // Interaction pair separation distance

const TownMap = forwardRef(function TownMap({ positions, selectedNpcId, onSelectNpc, onBlankClick, interactingPairs = new Map() }, ref) {
  const containerRef = useRef(null);
  const [mapBox, setMapBox] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [hoverOffsets, setHoverOffsets] = useState(new Map()); // npcId -> {x,y}
  const rafRef = useRef(null);
  const lastMoveRef = useRef(null);
  const collapseTimerRef = useRef(null);

  const handleMapClick = () => {
    // Click on map blank area: if onBlankClick provided, use it to close Info etc; otherwise deselect
    if (onBlankClick) onBlankClick();
    else onSelectNpc(null);
  };

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  const scheduleCollapse = () => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setHoverOffsets(new Map());
      collapseTimerRef.current = null;
    }, COLLAPSE_DELAY_MS);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computeBox = () => {
      const rect = el.getBoundingClientRect();
      const { width: W, height: H } = rect;
      if (!W || !H) return;
      const containerRatio = W / H;
      let mapWidth = W;
      let mapHeight = H;
      let offsetX = 0;
      let offsetY = 0;
      if (containerRatio > MAP_RATIO) {
        // Height limited, black bars on sides
        mapHeight = H;
        mapWidth = H * MAP_RATIO;
        offsetX = (W - mapWidth) / 2;
        offsetY = 0;
      } else {
        // Width limited, black bars top/bottom; align to bottom to avoid bottom black bar
        mapWidth = W;
        mapHeight = W / MAP_RATIO;
        offsetY = Math.max(0, H - mapHeight);
        offsetX = 0;
      }
      setMapBox({ width: mapWidth, height: mapHeight, offsetX, offsetY });
    };

    computeBox();
    window.addEventListener('resize', computeBox);
    return () => window.removeEventListener('resize', computeBox);
  }, []);

  // Calculate pixel coordinate list
  const getPixelPositions = () => {
    const hasBox = mapBox && mapBox.width > 0 && mapBox.height > 0;
    return positions.map((pos) => {
      const x = hasBox ? mapBox.offsetX + (mapBox.width * pos.xPct) / 100 : null;
      const y = hasBox ? mapBox.offsetY + (mapBox.height * pos.yPct) / 100 : null;
      return { npcId: pos.npcId, pos, x, y };
    });
  };

  const computeCluster = (clientX, clientY) => {
    const cont = containerRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const pixelPositions = getPixelPositions().filter((p) => p.x != null && p.y != null);
    const inRange = pixelPositions.filter((p) => {
      const dx = Math.abs(p.x - px);
      const dy = Math.abs(p.y - py);
      // Trigger area covers avatar rectangle with some tolerance
      const inRect = dx <= TRIGGER_HALF_W && dy <= TRIGGER_HALF_H;
      const inCircle = dx * dx + dy * dy <= CLUSTER_RADIUS_PX * CLUSTER_RADIUS_PX;
      return inRect || inCircle;
    });
    if (inRange.length <= 1) {
      if (hoverOffsets.size) {
        scheduleCollapse();
      }
      return;
    }
    clearCollapseTimer();
    const ids = inRange.map((p) => p.npcId).sort((a, b) => a - b);
    const offsets = new Map();
    const count = ids.length;
    // Dynamically adjust expansion radius: more NPCs = larger radius
    // 2 NPCs: 20px, 3 NPCs: 32px, 4 NPCs: 44px, 5 NPCs: 56px...
    const expandRadius = 20 + (count - 2) * 12;
    const step = (Math.PI * 2) / count;
    ids.forEach((id, idx) => {
      const angle = step * idx;
      offsets.set(id, {
        x: Math.round(Math.cos(angle) * expandRadius),
        y: Math.round(Math.sin(angle) * expandRadius)
      });
    });
    setHoverOffsets(offsets);
  };

  const handleMouseMove = (e) => {
    lastMoveRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (lastMoveRef.current) {
        computeCluster(lastMoveRef.current.x, lastMoveRef.current.y);
      }
    });
  };

  const handleMouseLeave = () => {
    scheduleCollapse();
  };

  const interactOffsets = useMemo(() => {
    if (!positions || positions.length === 0) return new Map();
    const hasBox = mapBox && mapBox.width > 0 && mapBox.height > 0;
    if (!hasBox) return new Map();
    const posMap = new Map();
    positions.forEach((p) => {
      const x = mapBox.offsetX + (mapBox.width * p.xPct) / 100;
      const y = mapBox.offsetY + (mapBox.height * p.yPct) / 100;
      posMap.set(p.npcId, { x, y });
    });
    const offsets = new Map();
    interactingPairs.forEach((pair) => {
      const [a, b] = pair;
      const pa = posMap.get(a);
      const pb = posMap.get(b);
      if (!pa || !pb) return;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ox = INTERACT_OFFSET_PX;

      if (!dist || dist < 1) {
        // Force left-right separation when completely overlapping
        offsets.set(a, { x: -ox, y: 0 });
        offsets.set(b, { x: ox, y: 0 });
        return;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      offsets.set(a, { x: Math.round(-nx * ox), y: Math.round(-ny * ox) });
      offsets.set(b, { x: Math.round(nx * ox), y: Math.round(ny * ox) });
    });
    return offsets;
  }, [interactingPairs, positions, mapBox]);

  return (
    <div
      ref={ref}
      className="relative w-full h-full cursor-default bg-black"
      onClick={handleMapClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/img/play/bg.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Render all NPC markers */}
        {positions.map((pos) => {
          const npc = npcData.find(n => n.id === pos.npcId);
          if (!npc) return null;

          // Use Avatar (small portrait)
          const npcWithAvatar = {
            ...npc,
            image: avatarMap[npc.name] || npc.image
          };

          const hoverOffset = hoverOffsets.get(npc.id) || { x: 0, y: 0 };
          const interactOffset = interactOffsets.get(npc.id) || { x: 0, y: 0 };
          const offset = { x: (hoverOffset.x || 0) + (interactOffset.x || 0), y: (hoverOffset.y || 0) + (interactOffset.y || 0) };
          const elevated = hoverOffsets.has(npc.id) || interactOffsets.has(npc.id);
          const isInteracting = interactOffsets.has(npc.id);

          return (
            <AvatarMarker
              key={npc.id}
              npc={npcWithAvatar}
              position={pos}
              isSelected={selectedNpcId === npc.id}
              onClick={onSelectNpc}
              mapBox={mapBox}
              offset={offset}
              elevated={elevated}
              isInteracting={isInteracting}
            />
          );
        })}

      </div>
    </div>
  );
});

export default TownMap;
