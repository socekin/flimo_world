// NPC 专属事件示例数据（与 events.js 独立，用于展示原型）
// 结构：id, npcId, timestamp, summary, participants: number[], preview: { type, url, poster }

export const npcEvents = [
  // Marcus Doyle 示例
  {
    id: 'marcus-1',
    npcId: 2,
    timestamp: '2025-10-18T13:25:27',
    summary: 'Secretly discusses with Jonah Briggs',
    participants: [6], // Harlan Tate
    preview: { type: 'video', url: '/video/Foss Event.mp4', poster: '/video/Foss Event Cover.png' }
  },
  {
    id: 'marcus-2',
    npcId: 2,
    timestamp: '2025-10-18T13:28:12',
    summary: 'Patrols all over town, claiming to be following leads on resource thefts.',
    participants: [],
    preview: { type: 'video', url: '/video/Foss Event2.mp4', poster: '/video/Foss Event2 Cover.png' }
  },
  // Eli Watkins 示例
  {
    id: 'eli-1',
    npcId: 4,
    timestamp: '2025-10-18T13:28:40',
    summary: 'Interviews Ramon Vega, learning about the stolen explosives.',
    participants: [5], // Ramon Vega
    preview: { type: 'video', url: '', poster: '/img/story/cover3.png' }
  },
  {
    id: 'eli-2',
    npcId: 4,
    timestamp: '2025-10-18T13:29:05',
    summary: 'Exchange information with Maeve at the tavern.',
    participants: [3], // Maeve Alcott
    preview: { type: 'video', url: '', poster: '/img/story/cover4.png' }
  },
];
