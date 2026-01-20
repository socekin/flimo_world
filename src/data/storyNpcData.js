import previewNpcRaw from '../../Preview_NPC_Data.json';
import { avatarMap } from './npcData';

const NPC_NAME_ORDER = [
  "Harlan Tate",
  "Marcus Doyle",
  "Maeve Alcott",
  "Eli Watkins",
  "Ramon Vega",
  "Jonah Briggs",
  "Lila Hart"
];

const previewNpcList = Array.isArray(previewNpcRaw?.player_view_npc_data)
  ? previewNpcRaw.player_view_npc_data
  : [];
const previewIdToName = new Map(previewNpcList.map((npc) => [npc.id, npc.name]));
const previewNameMap = new Map(previewNpcList.map((npc) => [npc.name, npc]));

const toCarryWith = (carry) => {
  if (Array.isArray(carry)) return carry.join("、");
  if (typeof carry === "string") return carry;
  return "";
};

const toSocialNetwork = (network = {}) => {
  if (!network || typeof network !== "object") return [];
  return Object.entries(network).map(([key, relation]) => {
    const displayName = previewIdToName.get(key) || key;
    return {
      name: displayName,
      image: avatarMap[displayName] || "",
      relation
    };
  });
};

export const storyNpcData = NPC_NAME_ORDER.map((name, idx) => {
  const raw = previewNameMap.get(name) || {};
  return {
    id: idx + 1,
    name: raw.name || name,
    image: avatarMap[raw.name || name] || "",
    description: raw.description || "",
    age: raw.age ? String(raw.age) : "",
    gender: raw.gender || "",
    goal: raw.goal || "",
    carryWith: toCarryWith(raw.carry_with),
    recentEvents: raw.recent_events || "",
    shortTermPlan: raw.short_term_plan || "",
    socialNetwork: toSocialNetwork(raw.social_network)
  };
});
