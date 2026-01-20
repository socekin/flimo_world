import systemNpcRaw from '../../System_NPC_Data.json';

// 图标映射
export const iconMap = {
  description: "/img/icons/Description.png",
  age: "/img/icons/Age.png",
  gender: "/img/icons/Gender.png",
  goal: "/img/icons/Goal.png",
  carryWith: "/img/icons/Carry with.png",
  recentEvents: "/img/icons/Recent events.png",
  shortTermPlan: "/img/icons/Short-term plan.png",
  socialNetwork: "/img/icons/Social network.png"
};

// Avatar头像映射 - 用于Play页面（暂用全身照）
export const avatarMap = {
  "Harlan Tate": "/img/npc/Harlan Tate.png",
  "Marcus Doyle": "/img/npc/Marcus Doyle.png",
  "Maeve Alcott": "/img/npc/Maeve Alcott.png",
  "Eli Watkins": "/img/npc/Eli Watkins.png",
  "Ramon Vega": "/img/npc/RamonVega.png",
  "Jonah Briggs": "/img/npc/Jonah Briggs.png",
  "Lila Hart": "/img/npc/Lila Hart.png"
};

const NPC_NAME_ORDER = [
  "Harlan Tate",
  "Marcus Doyle",
  "Maeve Alcott",
  "Eli Watkins",
  "Ramon Vega",
  "Jonah Briggs",
  "Lila Hart"
];

const systemNpcList = Array.isArray(systemNpcRaw?.system_npc_data) ? systemNpcRaw.system_npc_data : [];
const systemIdToName = new Map(systemNpcList.map((npc) => [npc.id, npc.name]));
const systemNameMap = new Map(systemNpcList.map((npc) => [npc.name, npc]));

const getProfile = (raw = {}) => raw.profile && typeof raw.profile === "object" ? raw.profile : raw;

const normalizeTextList = (value) => {
  if (Array.isArray(value)) return value.join("、");
  if (typeof value === "string") return value;
  return "";
};

const toCarryWith = (carry) => {
  if (Array.isArray(carry)) return carry.join("、");
  if (typeof carry === "string") return carry;
  return "";
};

const toSocialNetwork = (network = {}) => {
  if (!network || typeof network !== "object") return [];
  return Object.entries(network).map(([key, relation]) => {
    const displayName = systemIdToName.get(key) || key;
    return {
      name: displayName,
      image: avatarMap[displayName] || "",
      relation
    };
  });
};

const formatEvidenceList = (items) => {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const evidence = item.evidence ? `证据:${item.evidence}` : "";
      const where = item.where ? `地点:${item.where}` : "";
      const proves = item.proves ? `证明:${item.proves}` : "";
      const notes = item.notes ? `备注:${item.notes}` : "";
      return [evidence, where, proves, notes].filter(Boolean).join("，");
    })
    .filter(Boolean)
    .join("；");
};

const toPersona = (persona = {}) => {
  if (!persona || typeof persona !== "object") return null;
  const voice = persona.voice && typeof persona.voice === "object" ? persona.voice : {};
  return {
    voice: {
      register: voice.register || "",
      addressing_user: voice.addressing_user || "",
      quirks: normalizeTextList(voice.quirks),
      sample_phrases: normalizeTextList(voice.sample_phrases)
    },
    public_stance: persona.public_stance || "",
    what_i_will_volunteer: normalizeTextList(persona.what_i_will_volunteer),
    what_i_can_prove: formatEvidenceList(persona.what_i_can_prove),
    what_i_wont_say: normalizeTextList(persona.what_i_wont_say),
    common_lies_or_excuses: normalizeTextList(persona.common_lies_or_excuses),
    sensory_details: normalizeTextList(persona.sensory_details),
    conversation_hooks: normalizeTextList(persona.conversation_hooks)
  };
};

const toBreakingPoint = (breakingPoint = {}) => {
  if (!breakingPoint || typeof breakingPoint !== "object") return null;
  const trigger = breakingPoint.trigger_concepts;
  return {
    trigger_concepts: Array.isArray(trigger)
      ? trigger
      : (typeof trigger === "string" ? [trigger] : []),
    logic: breakingPoint.logic || "",
    reaction: breakingPoint.reaction || "",
    confession_content: breakingPoint.confession_content || ""
  };
};

// NPC数据 - 默认使用全身照（Story页面），Play页面会使用avatarMap
export const npcData = NPC_NAME_ORDER.map((name, idx) => {
  const raw = systemNameMap.get(name) || {};
  const profile = getProfile(raw);
  const persona = toPersona(profile.persona);
  const breakingPoint = toBreakingPoint(profile.breaking_point);
  return {
    id: idx + 1,
    name: raw.name || name,
    role: profile.role || "",
    image: avatarMap[raw.name || name] || "",
    description: profile.description || "",
    age: profile.age ? String(profile.age) : "",
    gender: profile.gender || "",
    goal: profile.goal || "",
    carryWith: toCarryWith(profile.carry_with),
    recentEvents: profile.recent_events || "",
    shortTermPlan: profile.short_term_plan || "",
    socialNetwork: toSocialNetwork(profile.social_network),
    persona,
    breakingPoint,
    currentLocation: raw.current_location || profile.current_location || ""
  };
});
