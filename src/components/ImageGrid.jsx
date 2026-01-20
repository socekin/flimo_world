import React, { useState } from 'react';

/**
 * ImageGrid - 优化的图片网格组件
 * 
 * 功能：
 * - 响应式网格布局
 * - 图片预览（点击放大）
 * - 加载状态
 * - 标题/描述 overlay
 */
export default function ImageGrid({
    images = [],
    columns = 2,
    showOverlay = true,
    onImageClick
}) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [loadingStates, setLoadingStates] = useState({});

    const handleImageLoad = (id) => {
        setLoadingStates(prev => ({ ...prev, [id]: 'loaded' }));
    };

    const handleImageError = (id) => {
        setLoadingStates(prev => ({ ...prev, [id]: 'error' }));
    };

    const handleClick = (img) => {
        if (onImageClick) {
            onImageClick(img);
        } else {
            setSelectedImage(img);
        }
    };

    return (
        <>
            <div className={`grid gap-3 grid-cols-${columns}`}>
                {images.map((img, idx) => (
                    <div
                        key={img.id || idx}
                        className="relative group cursor-pointer rounded-lg overflow-hidden bg-base-200"
                        onClick={() => handleClick(img)}
                    >
                        {/* 加载占位 */}
                        {loadingStates[img.id] !== 'loaded' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-base-200">
                                <span className="loading loading-spinner loading-md text-primary"></span>
                            </div>
                        )}

                        {/* 图片 */}
                        <img
                            src={img.url}
                            alt={img.title || `Image ${idx + 1}`}
                            className={`w-full h-48 object-cover transition-transform group-hover:scale-105 ${loadingStates[img.id] === 'loaded' ? 'opacity-100' : 'opacity-0'
                                }`}
                            onLoad={() => handleImageLoad(img.id || idx)}
                            onError={() => handleImageError(img.id || idx)}
                        />

                        {/* Overlay */}
                        {showOverlay && (img.title || img.description) && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                {img.title && (
                                    <h4 className="text-white text-sm font-semibold truncate">{img.title}</h4>
                                )}
                                {img.description && (
                                    <p className="text-white/70 text-xs line-clamp-2">{img.description}</p>
                                )}
                            </div>
                        )}

                        {/* Hover 放大提示 */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            {/* 图片预览 Modal */}
            {selectedImage && (
                <div className="modal modal-open" onClick={() => setSelectedImage(null)}>
                    <div className="modal-box max-w-4xl p-0 bg-transparent shadow-none" onClick={e => e.stopPropagation()}>
                        <button
                            className="btn btn-circle btn-sm absolute right-2 top-2 z-10"
                            onClick={() => setSelectedImage(null)}
                        >
                            ✕
                        </button>
                        <figure className="rounded-lg overflow-hidden">
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.title}
                                className="w-full max-h-[80vh] object-contain"
                            />
                        </figure>
                        {(selectedImage.title || selectedImage.description) && (
                            <div className="bg-base-100 p-4 rounded-b-lg">
                                {selectedImage.title && <h3 className="font-bold">{selectedImage.title}</h3>}
                                {selectedImage.description && <p className="text-sm opacity-70 mt-1">{selectedImage.description}</p>}
                                {selectedImage.prompt && (
                                    <div className="mt-2 p-2 bg-base-200 rounded text-xs">
                                        <span className="font-semibold">Prompt:</span> {selectedImage.prompt}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
