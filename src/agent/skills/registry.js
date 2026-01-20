import storyWorldDoc from './story-world/SKILL.md?raw';
import storyNpcDoc from './story-npc/SKILL.md?raw';
import storyNpcAddDoc from './story-npc-add/SKILL.md?raw';
import storySceneAddDoc from './story-scene-add/SKILL.md?raw';
import storyWorldEditDoc from './story-world-edit/SKILL.md?raw';
import storyNpcEditDoc from './story-npc-edit/SKILL.md?raw';
import envImageDoc from './environment-image/SKILL.md?raw';
import envImageEditDoc from './environment-image-edit/SKILL.md?raw';
import npcImageDoc from './npc-image/SKILL.md?raw';
import npcImageEditDoc from './npc-image-edit/SKILL.md?raw';
import worldmapImageDoc from './worldmap-image/SKILL.md?raw';
import worldmapImageEditDoc from './worldmap-image-edit/SKILL.md?raw';
import worldmapLayoutDoc from './worldmap-layout/SKILL.md?raw';
import worldmapLayoutEditDoc from './worldmap-layout-edit/SKILL.md?raw';
import mysteryWorldDoc from './mystery-world/SKILL.md?raw';
import mysteryNpcDoc from './mystery-npc/SKILL.md?raw';
import mysteryPlayerViewDoc from './mystery-player-view/SKILL.md?raw';
import storySummaryDoc from './story-summary/SKILL.md?raw';
import { execute as storyWorldExecute } from './story-world';
import { execute as storyNpcExecute } from './story-npc';
import { execute as storyNpcAddExecute } from './story-npc-add';
import { execute as storySceneAddExecute } from './story-scene-add';
import { execute as storyWorldEditExecute } from './story-world-edit';
import { execute as storyNpcEditExecute } from './story-npc-edit';
import { execute as envImageExecute } from './environment-image';
import { execute as envImageEditExecute } from './environment-image-edit';
import { execute as npcImageExecute } from './npc-image';
import { execute as npcImageEditExecute } from './npc-image-edit';
import { execute as worldmapImageExecute } from './worldmap-image';
import { execute as worldmapImageEditExecute } from './worldmap-image-edit';
import { execute as worldmapLayoutExecute } from './worldmap-layout';
import { execute as worldmapLayoutEditExecute } from './worldmap-layout-edit';
import { execute as mysteryWorldExecute } from './mystery-world';
import { execute as mysteryNpcExecute } from './mystery-npc';
import { execute as mysteryPlayerViewExecute } from './mystery-player-view';
import { execute as storySummaryExecute } from './story-summary';

const parseSkillDoc = (doc) => {
  if (!doc || !doc.startsWith('---')) {
    return { meta: {}, body: doc };
  }
  const lines = doc.split('\n');
  let i = 1;
  const meta = {};
  let inMultilineValue = false;

  for (; i < lines.length; i++) {
    const line = lines[i];

    // 结束 frontmatter
    if (line.trim() === '---') {
      i++;
      break;
    }

    // 跳过空行
    if (!line.trim()) continue;

    // 如果行以空格开头，说明是多行值的一部分（如 JSON schema），跳过
    if (line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }

    // 检测是否是 "key: value" 格式的简单行
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    // 只接受简单的 key（不包含特殊字符，如 { 或 [）
    // 并且只接受简单的 value（不是 JSON 对象开头）
    if (key && !key.includes('{') && !key.includes('[') && !key.includes('"')) {
      // 如果 value 是 | 或 > 开头的多行值，标记并跳过后续行
      if (value === '|' || value === '>' || value.startsWith('{') || value.startsWith('[')) {
        inMultilineValue = true;
        // 对于简单的 JSON，不存储（schema 太大）
        continue;
      }
      meta[key] = value;
    }
  }

  const body = lines.slice(i).join('\n');
  return { meta, body };
};


const withDoc = (doc, execute) => {
  const parsed = parseSkillDoc(doc);
  const id = parsed.meta.name || parsed.meta.id;
  if (!id) {
    throw new Error('Skill manifest must include name');
  }
  return {
    id,
    meta: parsed.meta,
    instructions: parsed.body,
    execute
  };
};

const skillList = [
  withDoc(storyWorldDoc, storyWorldExecute),
  withDoc(storyNpcDoc, storyNpcExecute),
  withDoc(storyNpcAddDoc, storyNpcAddExecute),
  withDoc(storySceneAddDoc, storySceneAddExecute),
  withDoc(storyWorldEditDoc, storyWorldEditExecute),
  withDoc(storyNpcEditDoc, storyNpcEditExecute),
  withDoc(envImageDoc, envImageExecute),
  withDoc(envImageEditDoc, envImageEditExecute),
  withDoc(npcImageDoc, npcImageExecute),
  withDoc(npcImageEditDoc, npcImageEditExecute),
  withDoc(worldmapImageDoc, worldmapImageExecute),
  withDoc(worldmapImageEditDoc, worldmapImageEditExecute),
  withDoc(worldmapLayoutDoc, worldmapLayoutExecute),
  withDoc(worldmapLayoutEditDoc, worldmapLayoutEditExecute),
  withDoc(mysteryWorldDoc, mysteryWorldExecute),
  withDoc(mysteryNpcDoc, mysteryNpcExecute),
  withDoc(mysteryPlayerViewDoc, mysteryPlayerViewExecute),
  withDoc(storySummaryDoc, storySummaryExecute)
];

export const skillRegistry = skillList.reduce((acc, skill) => {
  acc[skill.id] = skill;
  return acc;
}, {});

export async function runSkill(skillId, args) {
  const skill = skillRegistry[skillId];
  if (!skill) throw new Error(`Skill ${skillId} not found`);
  return skill.execute(args);
}
