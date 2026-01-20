import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * LocationMarkerEditor - Location marker editor
 * Supports drawing rectangles on map and labeling location names
 */
export default function LocationMarkerEditor({
    mapUrl,
    markers = [],
    onMarkersChange,
    sceneNames = [],  // Scene name list from world.scenes
    isEditing = false
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [currentRect, setCurrentRect] = useState(null);
    const [showNameInput, setShowNameInput] = useState(false);
    const [pendingRect, setPendingRect] = useState(null);
    const [customName, setCustomName] = useState('');
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);

    // Load image to get dimensions
    useEffect(() => {
        if (!mapUrl) return;
        const img = new Image();
        img.onload = () => {
            setImageSize({ width: img.width, height: img.height });
        };
        img.src = mapUrl;
    }, [mapUrl]);

    // Calculate scale ratio
    useEffect(() => {
        if (!containerRef.current || imageSize.width === 0) return;
        const containerWidth = containerRef.current.offsetWidth;
        setScale(containerWidth / imageSize.width);
    }, [imageSize]);

    // Draw Canvas
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || imageSize.width === 0) return;

        const ctx = canvas.getContext('2d');
        const displayWidth = imageSize.width * scale;
        const displayHeight = imageSize.height * scale;

        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Clear canvas
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // Layer 1: Draw all rectangle backgrounds
        markers.forEach((marker) => {
            const x1 = marker.x1 * scale;
            const y1 = marker.y1 * scale;
            const w = (marker.x2 - marker.x1) * scale;
            const h = (marker.y2 - marker.y1) * scale;

            ctx.beginPath();
            ctx.fillStyle = 'rgba(217, 70, 239, 0.2)';
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.fillRect(x1, y1, w, h);
            ctx.strokeRect(x1, y1, w, h);
        });

        // Layer 2: Draw all text labels
        markers.forEach((marker) => {
            const x1 = marker.x1 * scale;
            const y1 = marker.y1 * scale;

            ctx.font = `bold ${Math.max(12, 13 * scale)}px sans-serif`;
            const textWidth = ctx.measureText(marker.name).width;
            const paddingH = 8;
            const paddingV = 4;
            const labelHeight = Math.max(18, 20 * scale);

            // Auto position: if no space above, show at top inside rectangle
            let labelY = y1 - labelHeight - 4;
            if (labelY < 0) {
                labelY = y1 + 4;
            }

            ctx.beginPath();
            ctx.fillStyle = 'rgba(162, 28, 175, 0.95)'; // 更深的紫色，提升对比度
            ctx.roundRect(x1, labelY, textWidth + paddingH * 2, labelHeight, 6);
            ctx.fill();

            // Draw text
            ctx.fillStyle = '#FFFFFF';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            ctx.fillText(marker.name, x1 + paddingH, labelY + labelHeight / 2 + 1);
        });

        // Layer 3: Draw delete buttons (only in edit mode)
        if (isEditing) {
            markers.forEach((marker) => {
                const x1 = marker.x1 * scale;
                const y1 = marker.y1 * scale;
                const w = (marker.x2 - marker.x1) * scale;

                ctx.beginPath();
                ctx.fillStyle = 'rgba(239, 68, 68, 1)';
                ctx.arc(x1 + w, y1, 10, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('×', x1 + w, y1);
            });
        }

        // Draw currently drawing rectangle (bright pink)
        if (currentRect) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(217, 70, 239, 0.15)';
            ctx.strokeStyle = 'rgba(217, 70, 239, 1)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.fillRect(currentRect.x1, currentRect.y1, currentRect.x2 - currentRect.x1, currentRect.y2 - currentRect.y1);
            ctx.strokeRect(currentRect.x1, currentRect.y1, currentRect.x2 - currentRect.x1, currentRect.y2 - currentRect.y1);
            ctx.setLineDash([]);
        }
    }, [markers, currentRect, scale, imageSize, isEditing]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Get mouse position on Canvas
    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    // Mouse event handlers
    const handleMouseDown = (e) => {
        if (!isEditing) return;

        const pos = getMousePos(e);

        // Check if delete button was clicked
        for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            const deleteX = marker.x2 * scale;
            const deleteY = marker.y1 * scale;
            const dist = Math.sqrt((pos.x - deleteX) ** 2 + (pos.y - deleteY) ** 2);
            if (dist < 12 * scale) {
                // Delete this marker
                const newMarkers = markers.filter((_, idx) => idx !== i);
                onMarkersChange(newMarkers);
                return;
            }
        }

        setIsDrawing(true);
        setStartPoint(pos);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !startPoint) return;
        const pos = getMousePos(e);
        setCurrentRect({
            x1: Math.min(startPoint.x, pos.x),
            y1: Math.min(startPoint.y, pos.y),
            x2: Math.max(startPoint.x, pos.x),
            y2: Math.max(startPoint.y, pos.y)
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentRect) {
            setIsDrawing(false);
            return;
        }

        // Check if rectangle size is valid
        const width = Math.abs(currentRect.x2 - currentRect.x1);
        const height = Math.abs(currentRect.y2 - currentRect.y1);
        if (width < 20 || height < 20) {
            setIsDrawing(false);
            setCurrentRect(null);
            return;
        }

        // Convert to original coordinates
        setPendingRect({
            x1: currentRect.x1 / scale,
            y1: currentRect.y1 / scale,
            x2: currentRect.x2 / scale,
            y2: currentRect.y2 / scale
        });
        setShowNameInput(true);
        setIsDrawing(false);
        setCurrentRect(null);
    };

    // Confirm add marker
    const confirmMarker = (name) => {
        if (!pendingRect || !name.trim()) return;

        const newMarker = {
            id: `loc-${Date.now()}`,
            name: name.trim(),
            ...pendingRect
        };

        onMarkersChange([...markers, newMarker]);
        setShowNameInput(false);
        setPendingRect(null);
        setCustomName('');
    };

    if (!mapUrl) {
        return (
            <div className="flex items-center justify-center h-64 bg-base-200 rounded-xl">
                <span className="text-base-content/50">No map available</span>
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            {/* Map image */}
            <img
                src={mapUrl}
                alt="World Map"
                className="w-full rounded-xl"
                style={{ display: 'block' }}
            />

            {/* Canvas overlay */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 rounded-xl"
                style={{
                    cursor: isEditing ? 'crosshair' : 'default',
                    pointerEvents: isEditing ? 'auto' : 'none'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />

            {/* Name input modal */}
            {showNameInput && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-900/40 backdrop-blur-[2px] rounded-xl z-20 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-0 shadow-2xl w-[340px] border border-base-200 overflow-hidden transform animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-base-50 px-6 py-4 border-b border-base-200 flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-black text-sm text-base-content uppercase tracking-tight">Add New Location</h3>
                                <p className="text-[10px] text-base-content/40 uppercase font-bold tracking-widest mt-0.5">Define Map Location</p>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Preset names section */}
                            {sceneNames.length > 0 && (
                                <div className="mb-6">
                                    <label className="text-[10px] font-black text-base-content/40 uppercase tracking-widest mb-3 block">
                                        Quick Select from Scenes
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {sceneNames.map((name, idx) => (
                                            <button
                                                key={idx}
                                                className="px-3 py-1.5 rounded-lg bg-base-100 border border-base-200 hover:border-primary/50 hover:bg-primary/5 text-xs font-bold text-base-content/70 hover:text-primary transition-all shadow-sm active:scale-95"
                                                onClick={() => confirmMarker(name)}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom input section */}
                            <div className="mb-6">
                                <label className="text-[10px] font-black text-base-content/40 uppercase tracking-widest mb-2 block">
                                    Custom Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="input input-sm h-10 w-full bg-base-50 border-base-200 focus:border-primary focus:ring-2 focus:ring-primary/10 font-bold text-sm rounded-xl transition-all pl-3 shadow-inner"
                                        placeholder="e.g., Mystery Lab..."
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && confirmMarker(customName)}
                                        autoFocus
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-1.386-.388L12 10.732 5.212 6.424a1 1 0 1 0-1.048 1.707L11.477 12l-7.313 4.869a1 1 0 1 0 1.048 1.707L12 14.268l7.788 4.308a1 1 0 0 0 1.386-1.319l-7.427-5.257 7.427-5.257z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 justify-end">
                                <button
                                    className="btn btn-sm h-10 px-4 flex-1 bg-transparent border-base-200 hover:bg-base-100 text-base-content/60 font-bold rounded-xl transition-all"
                                    onClick={() => {
                                        setShowNameInput(false);
                                        setPendingRect(null);
                                        setCustomName('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-sm h-10 px-6 flex-1 btn-primary shadow-lg shadow-primary/20 font-bold rounded-xl active:scale-95 transition-all"
                                    onClick={() => confirmMarker(customName)}
                                    disabled={!customName.trim()}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
