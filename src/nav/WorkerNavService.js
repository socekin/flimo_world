// WorkerNavService - 主线程封装，管理 navWorker 的生命周期与请求/响应

export class WorkerNavService {
  /**
   * @param {Object} options
   * @param {string} options.roadsUrl /img/play/roads.png 之类的相对 URL
   * @param {number} options.gridCols 栅格列数，例如 200
   * @param {number} options.gridRows 栅格行数，例如 112
   * @param {{r:number,g:number,b:number,a:number}} options.colorThreshold 颜色阈值
   */
  constructor(options) {
    this.options = options;
    this.worker = new Worker(new URL('../workers/navWorker.js', import.meta.url), { type: 'module' });
    this.reqId = 1;
    this.pending = new Map(); // id -> {resolve,reject}
    this.onGridReady = null;

    this.worker.onmessage = (e) => {
      const { type, payload } = e.data || {};
      if (type === 'BUILD_GRID_DONE') {
        try { console.log('[navWorker] grid ready:', payload, 'walkable ratio =', (payload.walkableCount/(payload.cols*payload.rows)*100).toFixed(2)+'%'); } catch { /* ignore log errors */ }
        this.onGridReady && this.onGridReady(payload);
        return;
      }
      if (type === 'PATH') {
        const p = this.pending.get(payload.id);
        if (p) { this.pending.delete(payload.id); p.resolve(payload); }
        return;
      }
      if (type === 'SNAP_TO_ROAD_RESULT') {
        const p = this.pending.get('SNAP');
        if (p) { this.pending.delete('SNAP'); p.resolve(payload); }
        return;
      }
      if (type === 'ERROR') {
        console.error('[navWorker]', payload.message);
        return;
      }
      if (type === 'GRID') {
        const p = this.pending.get('GRID');
        if (p) { this.pending.delete('GRID'); p.resolve(payload); }
        return;
      }
    };

    this.worker.postMessage({ type: 'INIT', payload: options });
  }

  destroy() {
    try { this.worker.terminate(); } catch { /* ignore worker terminate errors */ }
    this.pending.clear();
  }

  async findPath(startCell, goalCell) {
    const id = this.reqId++;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      this.worker.postMessage({ type: 'FIND_PATH', payload: { id, start: startCell, goal: goalCell } });
    });
  }

  async snapToRoad(pct) {
    return new Promise((resolve) => {
      this.pending.set('SNAP', { resolve });
      this.worker.postMessage({ type: 'SNAP_TO_ROAD', payload: { pct } });
    });
  }

  async getGrid() {
    return new Promise((resolve) => {
      this.pending.set('GRID', { resolve });
      this.worker.postMessage({ type: 'GET_GRID' });
    });
  }
}
