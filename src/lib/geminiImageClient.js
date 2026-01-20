const API_BASE =
  (import.meta.env.VITE_GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(
    /\/$/,
    ''
  );
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const DEFAULT_MODEL = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';

const imageToBase64 = async (imageUrl) => {
  if (!imageUrl) return null;

  // 如果已经是 data URL，提取 base64 部分
  if (imageUrl.startsWith('data:image')) {
    const parts = imageUrl.split(',');
    return parts.length > 1 ? parts[1] : null;
  }

  // 从 URL 加载图片并转换为 base64
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return null;
  }
};

const normalizeSize = (resolution) => {
  if (!resolution) return '1K';
  const match = String(resolution).trim().toUpperCase();
  if (match === '2K') return '2K';
  if (match === '1K' || match === '1024X1024') return '1K';
  return match;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || res.statusText || 'Gemini Image API call failed';
    throw new Error(message);
  }
  return data;
};

const extractImages = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const responseId = data?.responseId || null;
  return parts
    .map((part, index) => {
      if (part?.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return {
          url: `data:${mime};base64,${part.inlineData.data}`,
          index,
          taskId: responseId
        };
      }
      return null;
    })
    .filter(Boolean);
};

const callGemini = async ({ prompt, referenceImage, referenceImages, resolution, temperature = 0.7, safetySettings, tools }) => {
  if (!API_KEY) {
    throw new Error('Gemini Image API Key is required');
  }
  if (!prompt) {
    throw new Error('prompt is required');
  }

  const parts = [];

  // 🆕 支持多张参考图片
  const imagesToProcess = referenceImages || (referenceImage ? [referenceImage] : []);

  for (const img of imagesToProcess) {
    const imageBytes = await imageToBase64(img);
    if (imageBytes) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageBytes
        }
      });
    }
  }

  // 添加文本提示
  parts.push({ text: prompt });

  const body = {
    contents: [
      {
        role: 'user',
        parts
      }
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      temperature,
      imageConfig: {
        imageSize: normalizeSize(resolution) || '1K'
      }
    }
  };

  if (Array.isArray(safetySettings)) {
    body.safetySettings = safetySettings;
  }
  if (Array.isArray(tools) && tools.length) {
    body.tools = tools;
  }

  const endpoint = `${API_BASE}/models/${DEFAULT_MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await handleResponse(res);
  const images = extractImages(data);
  if (!images.length) {
    throw new Error('Gemini API returned no image data');
  }
  return images;
};

export async function generateGeminiImages(params = {}) {
  const iterations = Math.max(1, params.n || 1);
  const outputs = [];
  for (let i = 0; i < iterations; i += 1) {
    const batch = await callGemini(params);
    outputs.push(...batch);
    if (outputs.length >= iterations) break;
  }
  return outputs.slice(0, iterations);
}
