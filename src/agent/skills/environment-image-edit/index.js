import { generateImages } from '../../../lib/imageClient';

const makeId = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export async function execute(args = {}) {
  const { instruction, currentImages = [], targetImageIndex } = args;

  if (!instruction) {
    throw new Error('Environment Image Edit requires edit instruction');
  }

  // Get image to edit
  const referenceImage = typeof targetImageIndex === 'number' && currentImages[targetImageIndex]
    ? currentImages[targetImageIndex].url
    : null;

  if (!referenceImage) {
    throw new Error('Image to edit not found');
  }

  // Lightly expand user instruction with basic constraints
  const editPrompt = `${instruction}. Maintain 2:1 ratio and Disney/Pixar 3D style.`;

  // Generate image directly
  const generated = await generateImages({
    prompt: editPrompt,
    type: 'environment',
    referenceImage,
    aspectRatio: '2:1',
    n: 1
  });

  // Replace image at specified index, keep other images unchanged
  const images = [...currentImages];
  images[targetImageIndex] = {
    id: `env-${makeId()}`,
    url: generated[0].url,
    callId: generated[0].taskId,
    title: currentImages[targetImageIndex].title,
    description: currentImages[targetImageIndex].description,  // Keep original description
    ratio: '2:1',  // Explicitly set ratio
    prompt: editPrompt
  };

  return {
    images,
    reasoning: `Edited environment image ${targetImageIndex + 1} based on instruction "${instruction}".`
  };
}

