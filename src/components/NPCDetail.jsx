import { iconMap } from '../data/npcData';

function NPCDetail({ npc }) {
  const attributes = [
    { label: 'Description', value: npc.description, icon: iconMap.description },
    { label: 'Age', value: npc.age, icon: iconMap.age },
    { label: 'Gender', value: npc.gender, icon: iconMap.gender },
    { label: 'Goal', value: npc.goal, icon: iconMap.goal },
    { label: 'Carry with', value: npc.carryWith, icon: iconMap.carryWith },
    { label: 'Recent events', value: npc.recentEvents, icon: iconMap.recentEvents },
    { label: 'Short-term plan', value: npc.shortTermPlan, icon: iconMap.shortTermPlan },
  ];

  return (
    <div className="bg-white/[0.08] backdrop-blur-sm rounded-2xl p-8 mt-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧 - 属性列表 */}
        <div className="lg:col-span-2 space-y-4">
          {attributes.map((attr, index) => (
            <div 
              key={index} 
              className="flex items-start gap-4 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <img 
                  src={attr.icon} 
                  alt={attr.label}
                  className="w-6 h-6 object-contain opacity-70"
                />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs font-semibold mb-1 uppercase">{attr.label}</p>
                <p className="text-white text-base leading-relaxed">{attr.value}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* 右侧 - 社交网络 */}
        <div className="lg:col-span-1">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <img 
                src={iconMap.socialNetwork} 
                alt="Social network"
                className="w-6 h-6 object-contain opacity-70"
              />
            </div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase">Social network</h3>
          </div>
          
          {npc.socialNetwork && npc.socialNetwork.length > 0 ? (
            <div className="flex flex-row gap-4 pl-11">
              {npc.socialNetwork.map((contact, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <div className="relative mb-2">
                    <img 
                      src={contact.image} 
                      alt={contact.name}
                      className="w-20 h-28 object-contain rounded-lg group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <p className="text-white font-bold text-xs">{contact.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{contact.relation || '雇佣关系'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 pl-11">
              <p className="text-gray-500 text-sm">暂无社交网络信息</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NPCDetail;

