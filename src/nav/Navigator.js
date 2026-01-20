// Navigator - 负责多 NPC 的随机游走/停留状态机与 DOM 坐标输出

import { WorkerNavService } from './WorkerNavService';

export class Navigator {
  /**
   * @param {HTMLElement} rootEl 地图容器元素（用于像素换算）
   * @param {(id:number, state:{xPct:number,yPct:number,scale:number,zIndex:number})=>void} onMove 移动输出回调
   * @param {{gridCols?:number,gridRows?:number,roadsUrl?:string,colorThreshold?:{r:number,g:number,b:number,a:number}}} config
   */
  constructor(rootEl, onMove, config = {}) {
    this.rootEl = rootEl;
    this.onMove = onMove;
    this.config = Object.assign({
      roadsUrl: '/img/play/roads.png',
      gridCols: 200,
      gridRows: 112,
      colorThreshold: { r: 200, g: 40, b: 40, a: 64 },
      speedPxPerSec: 120,
      minCellDistance: 10,
      idleMs: 0
    }, config);

    this.nav = new WorkerNavService({
      roadsUrl: this.config.roadsUrl,
      gridCols: this.config.gridCols,
      gridRows: this.config.gridRows,
      colorThreshold: this.config.colorThreshold,
      sample: { kernelSize: 5, hitRatio: 0.2 }
    });
    this.nav.onGridReady = () => {
      // grid 就绪后可以开始
      this.ready = true;
      this._kick();
    };

    this.gridMeta = null; // { cols, rows, data:Uint8Array }
    this.componentIds = null; // Int16Array: 每格的连通分量ID
    this.componentCells = new Map(); // compId -> [{c,r}]

    this.npcs = new Map(); // id -> { pct:{x,y}, target:null|{c,r}, pathCells:[], phase:'idle'|'move', t:0 }
    this.raf = null;
  }

  addNpc(id, pct) {
    this.npcs.set(id, { pct: { x: pct.x, y: pct.y }, phase: 'idle', pathCells: [] });
  }

  removeNpc(id) { this.npcs.delete(id); }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.nav.destroy();
  }

  _kick() {
    if (this.raf) cancelAnimationFrame(this.raf);
    let lastTs = null;
    const step = (ts) => {
      if (lastTs == null) lastTs = ts;
      const dtMs = ts - lastTs;
      lastTs = ts;
      const dt = Math.max(0, Math.min(dtMs / 1000, 0.1)); // 限制单帧最大步长，避免长时间挂起后瞬移
      this._update(dt);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  async _update(dt) {
    if (!this.ready) return;
    for (const [id, st] of this.npcs.entries()) {
      if (st.phase === 'idle') {
        // 连续移动：idle 立即选新目标
        const goal = await this._pickRandomGoal(st.pct);
        if (!goal) { st.idleUntil = Date.now() + 2000; continue; }
        const startCell = await this._snapPctToCell(st.pct);
        const path = await this.nav.findPath(startCell, goal);
        if (path.ok && path.cells.length > 1) {
          st.phase = 'move';
          st.pathCells = path.cells;
          st.segIndex = 0;
          st.segProg = 0;
        } else {
          st.idleUntil = Date.now() + 1000;
        }
      } else if (st.phase === 'move') {
        this._advanceAlongPath(id, st, dt);
      } else if (st.phase === 'playPath') {
        this._advanceAlongPlayPath(id, st, dt);
      }
    }
  }

  async _pickRandomGoal(pct) {
    const start = await this._snapPctToCell(pct);
    if (!start) return null;
    const meta = await this._ensureGridMeta();
    if (!meta) return null;
    const { cols } = meta;
    if (!this.componentIds || this.componentIds.length !== cols * meta.rows) return null;
    const startIdx = start.r * cols + start.c;
    if (startIdx < 0 || startIdx >= this.componentIds.length) return null;
    const compId = this.componentIds[startIdx];
    if (compId < 0) return null;
    const pool = this.componentCells.get(compId);
    if (!pool || pool.length === 0) return null;
    const minDist = this.config.minCellDistance ?? 0;
    const maxTry = 80;
    for (let i = 0; i < maxTry; i++) {
      const candidate = pool[(Math.random() * pool.length) | 0];
      if (!candidate) continue;
      if (candidate.c === start.c && candidate.r === start.r) continue;
      const dc = candidate.c - start.c;
      const dr = candidate.r - start.r;
      if (Math.abs(dc) + Math.abs(dr) < minDist) continue;
      return { c: candidate.c, r: candidate.r };
    }
    const fallback = pool[(Math.random() * pool.length) | 0];
    if (!fallback) return null;
    if (fallback.c === start.c && fallback.r === start.r) {
      for (let i = 0; i < pool.length; i++) {
        const alt = pool[i];
        if (alt.c !== start.c || alt.r !== start.r) return { c: alt.c, r: alt.r };
      }
      return null;
    }
    return { c: fallback.c, r: fallback.r };
  }

  async _snapPctToCell(pct) {
    const res = await this.nav.snapToRoad(pct);
    return res.ok ? res.cell : null;
  }

  _cellToPct(cell) {
    return {
      x: ((cell.c + 0.5) / this.config.gridCols) * 100,
      y: ((cell.r + 0.5) / this.config.gridRows) * 100
    };
  }

  async _ensureGridMeta() {
    if (this.gridMeta && this.gridMeta.data) return this.gridMeta;
    const meta = await this.nav.getGrid();
    if (meta && meta.data && meta.data.length === meta.cols * meta.rows) {
      this.gridMeta = { cols: meta.cols, rows: meta.rows, data: meta.data };
      this._buildComponents(meta.cols, meta.rows, meta.data);
    }
    return this.gridMeta;
  }

  _buildComponents(cols, rows, data) {
    const total = cols * rows;
    this.componentIds = new Int16Array(total);
    this.componentIds.fill(-1);
    this.componentCells = new Map();
    let compId = 0;
    const stack = [];
    for (let idx = 0; idx < total; idx++) {
      if (!data[idx] || this.componentIds[idx] !== -1) continue;
      const cells = [];
      this.componentCells.set(compId, cells);
      stack.push(idx);
      this.componentIds[idx] = compId;
      while (stack.length) {
        const current = stack.pop();
        const c = current % cols;
        const r = (current / cols) | 0;
        cells.push({ c, r });
        if (c > 0) {
          const left = current - 1;
          if (data[left] && this.componentIds[left] === -1) {
            this.componentIds[left] = compId;
            stack.push(left);
          }
        }
        if (c + 1 < cols) {
          const right = current + 1;
          if (data[right] && this.componentIds[right] === -1) {
            this.componentIds[right] = compId;
            stack.push(right);
          }
        }
        if (r > 0) {
          const up = current - cols;
          if (data[up] && this.componentIds[up] === -1) {
            this.componentIds[up] = compId;
            stack.push(up);
          }
        }
        if (r + 1 < rows) {
          const down = current + cols;
          if (data[down] && this.componentIds[down] === -1) {
            this.componentIds[down] = compId;
            stack.push(down);
          }
        }
      }
      compId++;
    }
  }

  _segmentInfo(a, b, width, height) {
    const aPct = this._cellToPct(a);
    const bPct = this._cellToPct(b);
    const ax = (aPct.x / 100) * width;
    const ay = (aPct.y / 100) * height;
    const bx = (bPct.x / 100) * width;
    const by = (bPct.y / 100) * height;
    const dist = Math.hypot(bx - ax, by - ay);
    const segDur = dist / this.config.speedPxPerSec;
    return { width, height, ax, ay, bx, by, segDur };
  }

  _emitPosition(id, st, x, y, width, height) {
    const safeW = width || 1;
    const safeH = height || 1;
    const xPct = (x / safeW) * 100;
    const yPct = (y / safeH) * 100;
    const scale = 0.9 + (yPct / 100) * 0.2;
    const zIndex = Math.floor(yPct) + 10;
    st.pct = { x: xPct, y: yPct };
    this.onMove(id, { xPct, yPct, scale, zIndex });
  }

  _emitInterpolated(id, st, info, p) {
    const x = info.ax + (info.bx - info.ax) * p;
    const y = info.ay + (info.by - info.ay) * p;
    this._emitPosition(id, st, x, y, info.width, info.height);
  }

  _emitCellPosition(id, st, cell, width, height) {
    if (!cell) return;
    const pct = this._cellToPct(cell);
    const x = (pct.x / 100) * width;
    const y = (pct.y / 100) * height;
    this._emitPosition(id, st, x, y, width, height);
  }

  _advanceAlongCells(id, st, dt, cells, { loop }) {
    if (!cells || cells.length < 2) {
      if (!loop) {
        st.phase = 'idle';
        st.idleUntil = Date.now() + this.config.idleMs;
      } else {
        st.segIndex = 0;
        st.segProg = 0;
      }
      return;
    }
    const rootRect = this.rootEl.getBoundingClientRect();
    const width = rootRect.width || 1;
    const height = rootRect.height || 1;
    let remaining = dt;
    while (true) {
      const a = cells[st.segIndex];
      const b = cells[st.segIndex + 1];
      if (!a || !b) {
        if (loop) {
          st.segIndex = 0;
          st.segProg = 0;
          continue;
        }
        st.phase = 'idle';
        st.idleUntil = Date.now() + this.config.idleMs;
        this._emitCellPosition(id, st, cells[cells.length - 1] ?? a, width, height);
        return;
      }
      const info = this._segmentInfo(a, b, width, height);
      if (!info || !isFinite(info.segDur) || info.segDur <= 1e-6) {
        st.segIndex++;
        st.segProg = 0;
        continue;
      }
      st.segProg += remaining / info.segDur;
      const prog = st.segProg;
      const clamped = Math.min(prog, 1);
      this._emitInterpolated(id, st, info, clamped);
      if (prog < 1 - 1e-4) {
        return;
      }
      remaining = (prog - 1) * info.segDur;
      st.segProg = 0;
      st.segIndex++;
      if (!loop && st.segIndex >= cells.length - 1) {
        st.phase = 'idle';
        st.idleUntil = Date.now() + this.config.idleMs;
        return;
      }
      if (loop && cells.length > 1) {
        st.segIndex %= (cells.length - 1);
      }
      if (remaining <= 1e-4) {
        return;
      }
    }
  }

  _advanceAlongPath(id, st, dt) {
    this._advanceAlongCells(id, st, dt, st.pathCells, { loop: false });
  }

  _advanceAlongPlayPath(id, st, dt) {
    this._advanceAlongCells(id, st, dt, st.playCells, { loop: true });
  }

  async startCoverage(npcId, opts = {}) {
    const speed = opts.speedPxPerSec ?? this.config.speedPxPerSec;
    const stride = Math.max(1, opts.stride ?? 4); // 每隔 stride 个格采样一个目标
    const meta = await this.nav.getGrid();
    const { cols, rows, data } = meta;
    if (!data || data.length !== cols * rows) return;

    const st = this.npcs.get(npcId);
    if (!st) return;

    const startCell = await this._snapPctToCell(st.pct);
    if (!startCell) return;
    const compMask = this._componentMask(data, cols, rows, startCell);

    // 从起点所在行开始，向上/向下交替扩展；并按 stride 采样以减少段数
    const ordered = [];
    const startRow = startCell.r;
    let up = startRow - 0, down = startRow + 1;
    const pushRow = (r, leftToRight) => {
      if (r < 0 || r >= rows) return;
      if (leftToRight) {
        for (let c = 0; c < cols; c += stride) if (compMask[r * cols + c]) ordered.push({ c, r });
      } else {
        for (let c = cols - 1; c >= 0; c -= stride) if (compMask[r * cols + c]) ordered.push({ c, r });
      }
    };
    let dir = true; // true: L->R, false: R->L
    while (up >= 0 || down < rows) {
      if (up >= 0) { pushRow(up, dir); dir = !dir; up--; }
      if (down < rows) { pushRow(down, dir); dir = !dir; down++; }
    }

    const full = [];
    let cur = startCell;
    const sameCell = (a, b) => a.c === b.c && a.r === b.r;
    for (let i = 0; i < ordered.length; i++) {
      const target = ordered[i];
      if (sameCell(cur, target)) { full.push({ ...cur }); continue; }
      const path = await this.nav.findPath(cur, target);
      if (path.ok && path.cells.length) {
        const cells = path.cells.slice();
        if (full.length && cells.length && sameCell(full[full.length - 1], cells[0])) cells.shift();
        full.push(...cells);
        cur = target;
      }
    }

    st.phase = 'playPath';
    st.playCells = full;
    st.segIndex = 0;
    st.segProg = 0;
    this.config.speedPxPerSec = speed;
  }

  _componentMask(data, cols, rows, start) {
    const q = [[start.c, start.r]];
    const seen = new Uint8Array(cols * rows);
    const id = (c, r) => r * cols + c;
    seen[id(start.c, start.r)] = 1;
    while (q.length) {
      const [c, r] = q.shift();
      const nb = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]];
      for (const [nc, nr] of nb) {
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const i = id(nc, nr);
        if (seen[i]) continue;
        if (data[i]) { seen[i] = 1; q.push([nc, nr]); }
      }
    }
    return seen;
  }
}
