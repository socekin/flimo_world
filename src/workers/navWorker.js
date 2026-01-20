// navWorker.js - 解析 roads.png -> 网格，提供 A* 与辅助 API
// 模块类型 Worker，适配 Vite: new Worker(new URL('...', import.meta.url), { type: 'module' })

// Worker 内状态
let gridCols = 0;
let gridRows = 0;
let walkableGrid = null; // Uint8Array(rows*cols), 1 可走, 0 不可走
let sampleCfg = { kernelSize: 5, hitRatio: 0.2 };

function idx(c, r) { return r * gridCols + c; }

async function loadImageBitmap(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const blob = await res.blob();
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(blob);
  }
  // Fallback: decode via OffscreenCanvas
  const img = await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(blob);
  });
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.transferToImageBitmap();
}

function sampleToGrid(imageBitmap, cols, rows, threshold, sample) {
  const { width, height } = imageBitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;

  const cellW = width / cols;
  const cellH = height / rows;
  const data = new Uint8Array(cols * rows);
  const ks = Math.max(1, sample.kernelSize | 0); // 采样核尺寸（ks×ks）
  const needHits = Math.max(1, Math.floor(ks * ks * (sample.hitRatio ?? 0.2)));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 子采样：在该格子内做 ks×ks 网格采样
      let hits = 0;
      const baseX = c * cellW;
      const baseY = r * cellH;
      const stepX = cellW / (ks + 1);
      const stepY = cellH / (ks + 1);
      for (let iy = 1; iy <= ks; iy++) {
        for (let ix = 1; ix <= ks; ix++) {
          const rawX = baseX + ix * stepX;
          const rawY = baseY + iy * stepY;
          const sx = Math.max(0, Math.min(width - 1, Math.round(rawX)));
          const sy = Math.max(0, Math.min(height - 1, Math.round(rawY)));
          const offset = (sy * width + sx) * 4;
          const R = pixels[offset];
          const G = pixels[offset + 1];
          const B = pixels[offset + 2];
          const A = pixels[offset + 3];
          const pass = A > threshold.a && R > threshold.r && G < threshold.g && B < threshold.b;
          if (pass) hits++;
        }
      }
      data[idx(c, r)] = hits >= needHits ? 1 : 0;
    }
  }
  return data;
}

function neighbors4(c, r) {
  const out = [];
  if (c > 0) out.push([c - 1, r]);
  if (c + 1 < gridCols) out.push([c + 1, r]);
  if (r > 0) out.push([c, r - 1]);
  if (r + 1 < gridRows) out.push([c, r + 1]);
  return out;
}

function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

function aStar(start, goal) {
  // start/goal: [c,r]
  const open = new Set();
  const came = new Map(); // key 'c,r' -> 'pc,pr'
  const g = new Map();
  const f = new Map();
  const key = (p) => `${p[0]},${p[1]}`;
  const kStart = key(start);
  open.add(kStart);
  g.set(kStart, 0);
  f.set(kStart, dist(start, goal));

  function popBest() {
    let best = null; let bestF = Infinity;
    for (const k of open) {
      const fv = f.get(k) ?? Infinity;
      if (fv < bestF) { bestF = fv; best = k; }
    }
    open.delete(best);
    return best;
  }

  while (open.size) {
    let curKey = popBest();
    const [cc, cr] = curKey.split(',').map(Number);
    if (cc === goal[0] && cr === goal[1]) {
      const path = [[cc, cr]];
      while (came.has(curKey)) {
        const prev = came.get(curKey);
        const [pc, pr] = prev.split(',').map(Number);
        path.unshift([pc, pr]);
        curKey = prev;
      }
      return path;
    }

    for (const [nc, nr] of neighbors4(cc, cr)) {
      if (!walkableGrid[idx(nc, nr)]) continue;
      const nKey = `${nc},${nr}`;
      const tentative = (g.get(curKey) ?? Infinity) + dist([cc, cr], [nc, nr]);
      if (tentative < (g.get(nKey) ?? Infinity)) {
        came.set(nKey, curKey);
        g.set(nKey, tentative);
        f.set(nKey, tentative + dist([nc, nr], goal));
        open.add(nKey);
      }
    }
  }
  return null;
}

function lineOfSight(a, b) {
  // 采样直线，若所有采样单元均可走，则可直连
  const [c0, r0] = a; const [c1, r1] = b;
  const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const c = Math.round(c0 + (c1 - c0) * t);
    const r = Math.round(r0 + (r1 - r0) * t);
    if (c < 0 || r < 0 || c >= gridCols || r >= gridRows) return false;
    if (!walkableGrid[idx(c, r)]) return false;
  }
  return true;
}

function smoothPath(cells) {
  if (!cells || cells.length <= 2) return cells || [];
  const out = [cells[0]];
  let anchor = cells[0];
  for (let i = 2; i < cells.length; i++) {
    if (!lineOfSight(anchor, cells[i])) {
      out.push(cells[i - 1]);
      anchor = cells[i - 1];
    }
  }
  out.push(cells[cells.length - 1]);
  return out;
}

function findNearestWalkable(c, r, maxRadius = 32) {
  if (walkableGrid[idx(c, r)]) return [c, r];
  for (let d = 1; d <= maxRadius; d++) {
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= gridCols || nr >= gridRows) continue;
        if (walkableGrid[idx(nc, nr)]) return [nc, nr];
      }
    }
  }
  return null;
}

self.onmessage = async (e) => {
  const { type, payload } = e.data || {};
  try {
    if (type === 'INIT') {
      const { roadsUrl, gridCols: cols, gridRows: rows, colorThreshold, sample } = payload;
      gridCols = cols; gridRows = rows;
      const bitmap = await loadImageBitmap(roadsUrl);
      sampleCfg = sample || sampleCfg;
      walkableGrid = sampleToGrid(bitmap, cols, rows, colorThreshold, sampleCfg);
      self.postMessage({ type: 'BUILD_GRID_DONE', payload: { cols, rows, walkableCount: walkableGrid.reduce((a, b) => a + b, 0) } });
      return;
    }
    if (type === 'SNAP_TO_ROAD') {
      const { pct } = payload; // {x,y} percent
      const c = Math.round((pct.x / 100) * gridCols - 0.5);
      const r = Math.round((pct.y / 100) * gridRows - 0.5);
      const near = findNearestWalkable(c, r, 12);
      self.postMessage({ type: 'SNAP_TO_ROAD_RESULT', payload: { ok: !!near, cell: near ? { c: near[0], r: near[1] } : null } });
      return;
    }
    if (type === 'FIND_PATH') {
      const { id, start, goal } = payload; // {c,r}
      const path = aStar([start.c, start.r], [goal.c, goal.r]);
      const smoothed = path ? smoothPath(path) : null;
      self.postMessage({ type: 'PATH', payload: { id, ok: !!smoothed, cells: smoothed ? smoothed.map(([c, r]) => ({ c, r })) : [] } });
      return;
    }
    if (type === 'GET_GRID') {
      const copy = walkableGrid ? walkableGrid.slice() : new Uint8Array(0);
      self.postMessage({ type: 'GRID', payload: { cols: gridCols, rows: gridRows, data: copy } });
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', payload: { message: String(err && err.message ? err.message : err) } });
  }
};

