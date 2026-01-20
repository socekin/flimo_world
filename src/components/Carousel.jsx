import { useState, useEffect } from 'react';

function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/img/story/cover1.png',
    '/img/story/cover2.png',
    '/img/story/cover3.png'
  ];

  // 自动轮播 - 每3秒切换
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* 轮播图容器 */}
      <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border-0">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 flex items-center justify-center ${
              index === currentIndex 
                ? 'opacity-100' 
                : 'opacity-0'
            }`}
          >
            <img 
              src={image} 
              alt={`Cover ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        
        {/* 左箭头 */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-primary opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* 右箭头 */}
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-primary opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-300 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* 指示器 */}
      <div className="flex justify-center gap-2 mt-6">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-500 ${
              index === currentIndex 
                ? 'bg-primary w-12 shadow-lg shadow-primary/50' 
                : 'bg-gray-600 w-2 hover:bg-gray-400 hover:w-6'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default Carousel;

