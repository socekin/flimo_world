const DEFAULT_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const BASE_URL = import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_REASONING_TOKENS =
  Number(import.meta.env.VITE_OPENROUTER_REASONING_TOKENS) || 2000;
const DEFAULT_REASONING = {
  max_tokens: DEFAULT_REASONING_TOKENS,
  exclude: false
};

const getReferer = () => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || 'https://flimo-world.example';
};

const formatContent = (content) => {
  if (!content) return '';
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (chunk && typeof chunk === 'object') {
          return chunk.text || chunk.content || '';
        }
        return '';
      })
      .join('\n')
      .trim();
  }
  if (typeof content === 'string') {
    return content.trim();
  }
  if (typeof content === 'object') {
    return content.text || '';
  }
  return '';
};

const formatReasoning = (reasoning) => {
  if (!reasoning) return '';
  if (typeof reasoning === 'string') return reasoning.trim();
  if (Array.isArray(reasoning)) {
    return reasoning
      .map((item) => formatReasoning(item))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof reasoning === 'object') {
    if (reasoning.text) return reasoning.text.trim();
    if (reasoning.content) return formatReasoning(reasoning.content);
    const values = Object.values(reasoning)
      .map((item) => formatReasoning(item))
      .filter(Boolean);
    if (values.length) {
      return values.join('\n');
    }
    return JSON.stringify(reasoning, null, 2);
  }
  return '';
};

export async function callLLM({
  messages,
  model = DEFAULT_MODEL,
  temperature = 0.6,
  reasoning = DEFAULT_REASONING
}) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenRouter API Key, please configure VITE_OPENROUTER_API_KEY in environment variables');
  }

  const body = {
    model,
    temperature,
    messages,
    stream: false
  };

  if (reasoning) {
    body.reasoning = reasoning;
  }

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': getReferer(),
      'X-Title': 'Flimo World Create'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter call failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const choice = payload?.choices?.[0];
  const content = formatContent(choice?.message?.content);
  if (!content) {
    throw new Error('OpenRouter returned empty response');
  }

  const reasoningText = formatReasoning(
    choice?.message?.reasoning || choice?.reasoning || payload?.reasoning
  );

  return {
    content,
    reasoning: reasoningText
  };
}
