import { generateImages } from '../../../lib/imageClient';
import { callLLM } from '../../../lib/llmClient';

const MAP_RATIO = '1920x1080';

const BASE_CONSTRAINTS = [
  'Top-down orthographic 2.5D map (overhead 90°, zero vanishing point, no tilt/perspective).',
  'Roads/grid: horizontal + vertical streets; allow rivers/rails/alleys if needed for narrative; avoid diagonal camera tilt.',
  'Place key POIs with clear labels/visual cues; keep layout readable for a game map.',
  'Style: cinematic but readable; roofs visible; short/downward shadows; no modern objects.'
].join(' ');

const formatScenes = (scenes = []) => {
  if (!Array.isArray(scenes) || scenes.length === 0) return '';
  return scenes
    .slice(0, 4)
    .map((s, idx) => {
      const name = s.title || s.name || s.scene || `Scene${idx + 1}`;
      const desc = s.description || s.sceneDescription || s.prompt || '';
      return `${name}: ${desc}`;
    })
    .join(' | ');
};

const normalizePrompt = (prompt) => {
  if (!prompt) return '';
  let finalPrompt = prompt.trim();
  if (!finalPrompt.toLowerCase().includes('ratio')) {
    finalPrompt = `${finalPrompt} | ratio ${MAP_RATIO}`;
  }
  return finalPrompt;
};

const buildPromptWithLLM = async ({ contextLine, sceneLine, instruction }) => {
  const userParts = [contextLine, sceneLine, instruction].filter(Boolean);
  const userContent = userParts.join(' | ').trim();

  const system = [
    'You are a prompt crafter for image generation. Task: rewrite the provided context and key locations into a SINGLE English prompt to generate a top-down orthographic 2.5D map.',
    'Requirements:',
    '- Keep overhead 90°, zero vanishing point, no tilt/perspective.',
    '- Lay out key POIs with clear spatial hints (center/west/east/north/south etc.) and allow rivers/rails/alleys if implied by context.',
    '- Style should reflect the story tone (e.g., noir/gritty if implied) while staying readable as a game map.',
    '- Return ONLY the prompt text. Do NOT add explanations.',
    `- Include 'ratio ${MAP_RATIO}' at the end.`,
    '- Preserve important proper nouns from context.',
    '- All location names must be in English.'
  ].join('\n');

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userContent || 'Generate a 2.5D top-down town map prompt.' }
  ];

  const { content } = await callLLM({
    messages,
    temperature: 0.4
  });
  return normalizePrompt(content);
};

export async function execute(args = {}) {
  const {
    world = '',
    situation = '',
    truth = '',
    scenes = [],
    instruction = '',
    layoutImage = null  // From Stage 1 layout
  } = args;

  const sceneSummary = formatScenes(scenes);
  const context = [world, situation, truth].filter(Boolean).join(', ');
  const contextLine = context ? `Context: ${context}` : '';
  const sceneLine = sceneSummary ? `Key locations: ${sceneSummary}` : '';

  let prompt = '';

  if (layoutImage) {
    // Stage 2: Generate final map based on layout
    const locationMapping = scenes.slice(0, 4).map((s, i) =>
      `Blue Rectangle ${i + 1}: ${s.title || s.name || `Scene${i + 1}`}`
    ).join('\n');

    prompt = `Based on the following story setting, transform the layout image into a 2.5D game map for this story background.

Requirements:
1. Roads must strictly follow the red line paths and directions from the layout, but do not keep red lines in the final image
2. Transform blue rectangles from layout into properly styled buildings (matching the scene correspondences below)
3. [IMPORTANT] Preserve English location name labels from the layout image:
   - Names must be clearly readable, using dark text or labeled backgrounds
   - Keep names positioned above or centered on buildings
   - Ensure text remains human-readable after stylization
4. Maintain all location positions and layout
5. Pixar-style 2.5D overhead map, 90° orthographic view
6. Aspect ratio 16:9
7. Can add environmental decorations (trees, rivers, etc.) but do not obscure building names

Story Setting:
World: ${world}
Situation: ${situation || ''}

Scene Correspondences:
${locationMapping}

ratio 1920x1080`;
  } else {
    // Stage 1 or original logic: generate map directly
    try {
      prompt = await buildPromptWithLLM({ contextLine, sceneLine, instruction });
    } catch (err) {
      console.error('WorldMap LLM prompt build failed, fallback to base constraints', err);
      const promptParts = [contextLine, sceneLine, BASE_CONSTRAINTS, instruction, `ratio ${MAP_RATIO}`].filter(Boolean);
      prompt = normalizePrompt(promptParts.join(' | ').trim());
    }
  }

  const [result] = await generateImages({
    prompt,
    type: 'worldmap',
    referenceImage: layoutImage,  // Pass layout if available
    n: 1
  });

  const description = sceneSummary || context || '2.5D overhead map';

  return {
    map: {
      url: result.url,
      prompt,
      description,
      ratio: MAP_RATIO
    }
  };
}

