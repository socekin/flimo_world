import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleEnter = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/story');
    }, 300);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      navigate('/create');
    }, 300);
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat relative animate-fade-in"
      style={{ backgroundImage: 'url(/img/login/Login_bg.png)' }}
    >
      {/* 暗色遮罩 */}
      <div className="absolute inset-0 bg-black/30 z-0"></div>
      
      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center gap-16 animate-slide-up">
        <h1 className="text-7xl md:text-8xl font-bold tracking-wider drop-shadow-2xl bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-pulse-slow">
          Flimo World
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button 
            onClick={handleEnter}
            disabled={isLoading || isCreating}
            className="relative overflow-hidden px-16 py-3 text-xl font-bold text-white rounded-xl hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl disabled:opacity-50 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-primary"></div>
            <span className="relative z-10">{isLoading ? 'Loading...' : 'Play Demo'}</span>
          </button>

          <button
            onClick={handleCreate}
            disabled={isLoading || isCreating}
            className="relative overflow-hidden px-16 py-3 text-xl font-bold text-white rounded-xl hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl disabled:opacity-50 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-400"></div>
            <span className="relative z-10">{isCreating ? 'Loading...' : 'Create World'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
