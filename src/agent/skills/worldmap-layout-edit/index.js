import { generateImages } from '../../../lib/imageClient';

export async function execute(args = {}) {
    const { currentLayout, instruction = '' } = args;

    if (!currentLayout) {
        throw new Error('WorldMap Layout Edit requires currentLayout parameter');
    }

    if (!instruction) {
        throw new Error('WorldMap Layout Edit requires instruction parameter');
    }

    // Extract image URL from currentLayout object
    const layoutImageUrl = currentLayout.layoutImage || currentLayout.layoutUrl;
    if (!layoutImageUrl) {
        throw new Error('currentLayout is missing valid layoutImage or layoutUrl');
    }

    // Build prompt
    const prompt = `Based on the image, modify the layout according to the following instruction:

User Instruction: ${instruction}

Edit Requirements:
1. Maintain original layout style (solid blue rectangles #0000FF = locations, thick red lines #FF0000 = roads)
2. Only modify parts explicitly requested by user
3. If adding buildings/locations, mark with blue rectangles and English names
4. If modifying roads, draw with red lines, all blue location rectangles must connect to nearest red line
5. Keep background white or light gray
6. Maintain 16:9 aspect ratio
7. Clean schematic style`;

    const generated = await generateImages({
        prompt,
        type: 'worldmap',
        referenceImage: layoutImageUrl,  // Pass layout image URL
        aspectRatio: '16:9',
        n: 1
    });

    return {
        layoutImage: generated[0].url,
        callId: generated[0].taskId,
        prompt,
        ratio: '16:9',
        reasoning: `Edited map layout based on "${instruction}"\n\nPrompt used:\n${prompt}`
    };
}

