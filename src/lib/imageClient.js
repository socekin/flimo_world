import { generateGeminiImages } from './geminiImageClient';

const providerConfig = {
  gemini: {
    fn: generateGeminiImages,
    concurrency: 100,
    kinds: {
      environment: { resolution: '1k' },
      npc: { resolution: '1k' },
      worldmap: { resolution: '1k' },
      generic: { resolution: '1k' }
    }
  }
};

export function getImageProvider() {
  return 'gemini';
}

export function getImageConcurrencyLimit(fallback = 3) {
  return providerConfig.gemini.concurrency ?? fallback;
}

export async function generateImages({ prompt, type = 'generic', n = 1, ...rest }) {
  if (!prompt) {
    throw new Error('prompt is required');
  }
  const kindDefaults = providerConfig.gemini.kinds?.[type] || providerConfig.gemini.kinds?.generic || {};
  const payload = { prompt, n, ...kindDefaults, ...rest };
  return providerConfig.gemini.fn(payload);
}
