function NPCCard({ npc, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer transition-all duration-500 ${
        isSelected 
          ? 'scale-110 -translate-y-3' 
          : 'hover:scale-105 hover:-translate-y-1 opacity-70 hover:opacity-100'
      }`}
    >
      <div className={`relative rounded-2xl overflow-hidden ${
        isSelected 
          ? 'ring-4 ring-primary shadow-2xl shadow-primary/50 bg-black/40' 
          : 'bg-transparent'
      }`}>
        <img 
          src={npc.image} 
          alt={npc.name}
          className="w-32 h-40 object-contain"
        />
        {isSelected && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent pointer-events-none"></div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 p-2 text-center transition-all duration-300 ${
          isSelected 
            ? 'bg-primary/90 backdrop-blur-sm' 
            : 'bg-transparent'
        }`}>
          <p className={`font-bold transition-all duration-300 ${
            isSelected ? 'text-white text-base' : 'text-white text-sm'
          }`}>
            {npc.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export default NPCCard;

