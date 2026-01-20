import { generateImages } from '../../../lib/imageClient';

const makeId = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const PORTRAIT_RATIO = '1:2';
const PROMPT_SUFFIX = 'Keep the same character identity, outfit, pose, and composition; only apply the requested changes. Disney Pixar style 3D animation, high-fidelity CGI, full body portrait standing facing the viewer, detailed expressive facial features, cinematic soft studio lighting, subsurface scattering skin, rich fabric textures, volumetric lighting, solid pure white background, clean isolated background, 8k resolution, Unreal Engine 5 render style, masterpiece. --ar 1:2';

const buildNpcPrompt = (instruction) => {
  const instructionText = instruction ? `${instruction}. ` : '';
  return `${instructionText}${PROMPT_SUFFIX}`.trim();
};

const mapImage = (result, base, prompt) => ({
  id: `${base.name || 'npc'}-${makeId()}`,
  url: result.url,
  callId: result.taskId,
  ratio: PORTRAIT_RATIO,
  prompt
});

export async function execute(args = {}) {
  const { npc, instruction = '', currentImages = [] } = args;
  if (!npc) {
    throw new Error('NPC Image Edit requires target NPC');
  }

  // Get image to edit
  const referenceImage = currentImages && currentImages.length > 0 ? currentImages[0].url : null;

  if (!referenceImage) {
    throw new Error('NPC image to edit not found');
  }

  const trimmedInstruction = instruction.trim();
  const editPrompt = buildNpcPrompt(trimmedInstruction);

  const generated = await generateImages({
    prompt: editPrompt,
    type: 'npc',
    referenceImage,
    aspectRatio: PORTRAIT_RATIO,
    n: 1
  });

  const images = generated.map((res) => mapImage(res, npc, editPrompt));
  return { name: npc.name, images };
}

