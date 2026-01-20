// 事件数据（静态列表）
// 已更新为新NPC，暂时使用示例数据
export const events = [
  {
    id: 1,
    npcId: 1,
    npcName: "Harlan Tate",
    timestamp: "2025-10-18T13:25",
    summary: "Harlan Tate召开镇务会议，讨论联邦审查事宜"
  },
  {
    id: 2,
    npcId: 2,
    npcName: "Marcus Doyle",
    timestamp: "2025-10-18T13:26",
    summary: "Marcus Doyle在镇上巡查，声称追查资源失窃案线索"
  },
  {
    id: 3,
    npcId: 3,
    npcName: "Maeve Alcott",
    timestamp: "2025-10-18T13:27",
    summary: "Maeve Alcott在酒馆中接待客人，观察镇上气氛"
  },
  {
    id: 4,
    npcId: 4,
    npcName: "Eli Watkins",
    timestamp: "2025-10-18T13:28",
    summary: "Eli Watkins采访镇民，收集异常事件线索"
  },
  {
    id: 5,
    npcId: 5,
    npcName: "Ramon Vega",
    timestamp: "2025-10-18T13:29",
    summary: "Ramon Vega发现铁匠铺的爆炸材料失窃"
  },
  {
    id: 6,
    npcId: 6,
    npcName: "Jonah Briggs",
    timestamp: "2025-10-18T13:30",
    summary: "Jonah Briggs行为紧张，频繁进出杂货铺"
  },
  {
    id: 7,
    npcId: 7,
    npcName: "Lila Hart",
    timestamp: "2025-10-18T13:31",
    summary: "Lila Hart核对账目，发现异常物资交易记录"
  }
];

// 演示聚合：为同一分钟增加多条事件
// 13:31 分钟的额外事件
events.push(
  {
    id: 8,
    npcId: 1,
    npcName: "Harlan Tate",
    timestamp: "2025-10-18T13:31",
    summary: "Harlan Tate与Marcus Doyle商讨对策"
  },
  {
    id: 9,
    npcId: 2,
    npcName: "Marcus Doyle",
    timestamp: "2025-10-18T13:31",
    summary: "Marcus Doyle控制调查方向，防止真相暴露"
  }
);

// 13:32 分钟的额外事件
events.push(
  {
    id: 10,
    npcId: 4,
    npcName: "Eli Watkins",
    timestamp: "2025-10-18T13:32",
    summary: "Eli Watkins注意到警长行为可疑"
  },
  {
    id: 11,
    npcId: 5,
    npcName: "Ramon Vega",
    timestamp: "2025-10-18T13:32",
    summary: "Ramon Vega暗中记录异常情况"
  }
);

// 13:33 分钟的额外事件
events.push(
  {
    id: 12,
    npcId: 6,
    npcName: "Jonah Briggs",
    timestamp: "2025-10-18T13:33",
    summary: "Jonah Briggs尽量保持低调，避免引起注意"
  },
  {
    id: 13,
    npcId: 7,
    npcName: "Lila Hart",
    timestamp: "2025-10-18T13:33",
    summary: "Lila Hart整理可疑交易清单"
  },
  {
    id: 14,
    npcId: 3,
    npcName: "Maeve Alcott",
    timestamp: "2025-10-18T13:33",
    summary: "Maeve Alcott观察局势，保持中立立场"
  }
);
