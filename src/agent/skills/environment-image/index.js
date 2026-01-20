import { generateImages, getImageConcurrencyLimit } from '../../../lib/imageClient';

const makeId = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const STYLE = 'Style: Disney/Pixar-style 3D, vibrant colors, exquisite details.';
const ENV_RATIO = '2:1';

const fallbackSceneNames = ['Key Location One', 'Key Location Two', 'Key Location Three', 'Key Location Four'];

const buildScenes = (world = '', situation = '', truth = '', instruction = '', scenes = []) => {
  const base = world || 'Current story world';
  const trimmedInstruction = instruction?.trim() || '';
  const list = Array.isArray(scenes) && scenes.length
    ? scenes.slice(0, 4)
    : fallbackSceneNames.map((name, idx) => ({
      name: `${base} - ${name}`,
      description: `Representative area ${idx + 1} of ${base}`
    }));

  return list.map((scene, idx) => {
    const sceneName = scene?.name || `${base} - Location ${idx + 1}`;
    const userDesc = scene?.description?.trim();
    const descClause = userDesc ? ` | ${userDesc}` : '';
    const ratioHint = trimmedInstruction ? `${trimmedInstruction} ratio ${ENV_RATIO}` : `ratio ${ENV_RATIO}`;
    const promptCore = `${base} | Scene: ${sceneName}${descClause} | ${situation || ''} | ${truth || ''}. ${STYLE}, camera focuses on environment and buildings, characters only as distant accents.`;
    return {
      title: sceneName,
      ratio: ENV_RATIO,
      sceneDescription: userDesc || `Key environment of ${sceneName}.`,
      prompt: `${promptCore} ${ratioHint}`.trim()
    };
  });
};

const mapWithConcurrency = async (items, limit, task) => {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await task(items[current], current);
      } catch (error) {
        console.error('Environment image generation failed', error);
        results[current] = null;
      }
    }
  });
  await Promise.all(workers);
  return results.filter(Boolean);
};

const mapImageResult = (result, descriptor) => ({
  id: `env-${makeId()}`,
  title: descriptor.title,
  prompt: descriptor.prompt,
  description: descriptor.sceneDescription,
  ratio: descriptor.ratio,
  url: result.url,
  callId: result.taskId
});

export async function execute(args = {}) {
  const { world, situation, truth, scenes = [], instruction = '' } = args;
  const descriptors = buildScenes(world, situation, truth, instruction, scenes);
  const limit = getImageConcurrencyLimit(3);
  const images = await mapWithConcurrency(descriptors, limit, async (descriptor) => {
    const [res] = await generateImages({
      prompt: descriptor.prompt,
      type: 'environment',
      n: 1
    });
    return mapImageResult(res, descriptor);
  });
  return { images };
}

