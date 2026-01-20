const NAV_API_BASE = import.meta.env.VITE_NAV_API_BASE || '/nav-api';
const NAV_WORLD_ID = import.meta.env.VITE_NAV_WORLD_ID;

const parseMaybeJson = async (res) => {
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

export async function navigateBetweenLocations({
  worldId = NAV_WORLD_ID,
  from,
  to
}) {
  if (!from || !to) throw new Error('Missing origin or destination');
  if (!worldId) throw new Error('Missing nav world_id, please set VITE_NAV_WORLD_ID in environment variables');
  const url = `${NAV_API_BASE}/api/navigate`;
  const payload = {
    world_id: worldId,
    from_location: from,
    to_location: to
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await parseMaybeJson(res);
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  if (!data?.success) {
    throw new Error('Navigation service returned failure');
  }
  return data;
}

export async function navigateFromCoord({
  worldId = NAV_WORLD_ID,
  fromX,
  fromY,
  to
}) {
  if (fromX === undefined || fromY === undefined) throw new Error('Missing origin coordinates');
  if (!to) throw new Error('Missing destination location');
  if (!worldId) throw new Error('Missing nav world_id');
  const url = `${NAV_API_BASE}/api/navigate/from-coord`;
  const payload = {
    world_id: worldId,
    from_x: fromX,
    from_y: fromY,
    to_location: to
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await parseMaybeJson(res);
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  if (!data?.success) {
    throw new Error('Navigation service returned failure');
  }
  return data;
}
