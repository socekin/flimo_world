import { generateImages } from '../../../lib/imageClient';

const MAP_RATIO = '16:9';

export async function execute(args = {}) {
  const {
    currentWorldmap,
    layoutImage = null,
    instruction = '',
    editType = 'style'  // 'layout' | 'style'
  } = args;

  if (!currentWorldmap) {
    throw new Error('WorldMap Edit requires currentWorldmap parameter');
  }

  if (!instruction) {
    throw new Error('WorldMap Edit requires instruction parameter');
  }

  // Extract URL from parameter (supports object or string format)
  const worldmapUrl = typeof currentWorldmap === 'string'
    ? currentWorldmap
    : (currentWorldmap.url || currentWorldmap.layoutUrl);

  const layoutImageUrl = typeof layoutImage === 'string'
    ? layoutImage
    : (layoutImage?.layoutImage || layoutImage?.layoutUrl || layoutImage?.url);

  if (!worldmapUrl) {
    throw new Error('currentWorldmap is missing valid url');
  }

  let prompt = '';

  if (editType === 'layout' && layoutImageUrl) {
    // Layout edit path: partial update of original map based on new layout
    prompt = `Based on the layout image and 2.5D game map, reference the layout image to partially update the 2.5D game map.

Requirements:
1. Only update parts where layout differs from 2.5D game map, typically blue rectangle buildings and red line roads
2. Roads must strictly follow layout red line paths and directions, but do not keep red lines in final image
3. Transform blue rectangles into properly styled buildings, no need to keep blue borders, can preserve English names
4. Maintain overall style of original image
5. Aspect ratio 16:9
6. Final check: ensure no red road lines and blue rectangle buildings remain on map`;

  } else {
    // Style edit path: only modify style/visual effects
    prompt = `Based on the image, make the following modifications:

User Instruction: ${instruction}

Edit Requirements:
1. Maintain original layout and structure unchanged
2. Only modify parts explicitly requested by user (style, colors, text, visual effects, etc.)
3. Maintain 2.5D overhead map style, 90° orthographic view
4. Maintain 16:9 aspect ratio`;
  }

  // Prepare reference images (using extracted URLs)
  let referenceImages = null;
  let referenceImage = null;

  if (editType === 'layout' && layoutImageUrl) {
    // Layout edit path: pass both new layout and old worldmap
    referenceImages = [layoutImageUrl, worldmapUrl];
  } else {
    // Style edit path: only pass current worldmap
    referenceImage = worldmapUrl;
  }

  const generated = await generateImages({
    prompt,
    type: 'worldmap',
    referenceImages,  // Multiple images (layout path)
    referenceImage,   // Single image (style path)
    aspectRatio: MAP_RATIO,
    n: 1
  });

  const description = editType === 'layout'
    ? '2.5D overhead map regenerated based on new layout'
    : '2.5D overhead map after style edit';

  const reasoning = `${description}\n\nPrompt used:\n${prompt}`;

  return {
    map: {
      url: generated[0].url,
      prompt,
      description,
      ratio: MAP_RATIO,
      callId: generated[0].taskId,
      reasoning
    }
  };
}

