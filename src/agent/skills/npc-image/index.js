import { generateImages, getImageConcurrencyLimit } from '../../../lib/imageClient';

const makeId = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const PORTRAIT_RATIO = '1:2';
const PROMPT_SUFFIX = 'on a pure white background, white seamless backdrop, no shadows on background, Disney Pixar style 3D animation, high-fidelity CGI, full body portrait standing facing the viewer, detailed expressive facial features, soft diffused lighting, rich fabric textures, clean isolated character, 8k resolution, masterpiece. --ar 1:2';

const buildNpcPrompt = (npc) => {
  const fields = [npc.name, npc.role, npc.personality, npc.shortTermGoal, npc.longTermGoal]
    .filter(Boolean)
    .join(', ');
  const descriptor = fields ? `${fields}, ` : '';
  return `${descriptor}${PROMPT_SUFFIX}`.trim();
};

const mapImage = (result, npc, prompt) => ({
  id: `${npc.name || 'npc'}-${makeId()}`,
  url: result.url,
  callId: result.taskId,
  ratio: PORTRAIT_RATIO,
  prompt
});

const mapWithConcurrency = async (items, limit, task) => {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await task(items[current], current);
      } catch (error) {
        console.error('NPC image generation failed', error);
        results[current] = null;
      }
    }
  });
  await Promise.all(workers);
  return results.filter(Boolean);
};

export async function execute(args = {}) {
  const { npcs = [] } = args;
  const limit = getImageConcurrencyLimit(3);
  const results = await mapWithConcurrency(npcs, limit, async (npc) => {
    const prompt = buildNpcPrompt(npc);
    const [res] = await generateImages({
      prompt,
      type: 'npc',
      n: 1
    });
    return { name: npc.name, images: [mapImage(res, npc, prompt)] };
  });

  return { results };
}
