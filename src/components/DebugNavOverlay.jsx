import { useEffect, useRef } from 'react';

export default function DebugNavOverlay({ cols = 200, rows = 112, show = false, gridData, showRoadsImage = false, roadsUrl = '/img/play/roads.png' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!show) return;
    const el = ref.current; if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.width = cols; canvas.height = rows;
    canvas.style.width = '100%'; canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    el.innerHTML = '';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cols, rows);
    if (gridData && gridData.length === cols * rows) {
      const img = ctx.createImageData(cols, rows);
      for (let i = 0; i < gridData.length; i++) {
        img.data[i * 4 + 0] = 255;
        img.data[i * 4 + 1] = 0;
        img.data[i * 4 + 2] = 0;
        img.data[i * 4 + 3] = gridData[i] ? 50 : 0; // alpha
      }
      ctx.putImageData(img, 0, 0);
    } else {
      ctx.fillStyle = 'rgba(255,0,0,0.15)';
      ctx.fillRect(0, 0, cols, rows);
    }

    if (showRoadsImage) {
      const img = new Image();
      img.onload = () => {
        // 将 roads.png 按比例缩放到与网格同像素的画布上，再以 0.2 透明叠加
        const tmp = document.createElement('canvas');
        tmp.width = cols; tmp.height = rows;
        const tctx = tmp.getContext('2d');
        tctx.globalAlpha = 0.2;
        tctx.drawImage(img, 0, 0, cols, rows);
        ctx.drawImage(tmp, 0, 0);
      };
      img.src = roadsUrl;
    }
  }, [cols, rows, show, gridData, showRoadsImage, roadsUrl]);
  if (!show) return null;
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[5]" />
  );
}

