import { generateImages } from '../../../lib/imageClient';

const makeId = () =>
    typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

export async function execute(args = {}) {
    const { world, situation, scenes = [] } = args;

    if (!world) {
        throw new Error('WorldMap Layout requires world parameter');
    }

    // Build core locations list (from scenes)
    const coreLocations = scenes.slice(0, 4).map((s, i) =>
        `${i + 1}. ${s.title || s.name}: ${s.description || ''}`
    ).join('\n');

    // Build prompt
    const prompt = `Design a game map layout diagram.

Core Locations (must include, mark with solid blue rectangles):
${coreLocations}

World Setting: ${world}
Story Background: ${situation || ''}

Requirements:
1. Use solid blue rectangles (#0000FF) to mark all locations:
   - Must include the core locations above
   - Add several reasonable surrounding locations based on world setting, resulting in approximately 15-20 buildings total
2. [IMPORTANT] Each blue rectangle must have the location name centered inside:
   - Use concise English names (2-4 words, e.g., "Bank", "Tavern", "Blacksmith Shop")
   - Text color should be white to ensure readability on blue background
   - Only write location names inside blue rectangles, no text elsewhere
3. Use red lines (#FF0000, thick) to draw connecting roads
   - All blue location rectangles must connect to the nearest red line at their edges
4. Layout should be logical and match the ${world} world setting and geography
5. Background should be white (#FFFFFF) or light gray (#F5F5F5)
6. Clean schematic style, no borders, map titles or unnecessary elements
7. Aspect ratio 16:9`;

    const generated = await generateImages({
        prompt,
        type: 'worldmap',
        aspectRatio: '16:9',
        n: 1
    });

    return {
        id: `layout-${makeId()}`,
        layoutImage: generated[0].url,
        callId: generated[0].taskId,
        prompt,
        ratio: '16:9',
        reasoning: `Generated map layout with ${scenes.length} core locations\n\nPrompt used:\n${prompt}`
    };
}

