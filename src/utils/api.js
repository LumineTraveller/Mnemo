import { loadSettings } from './storage';

const API_BASE = 'https://api.deepseek.com/v1';

// 0=A1  1=A2  2=B1(default)  3=B2  4=C1  5=C2
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * word      – 目标单词
 * lang      – 语言
 * definition– 释义（中文）
 * pos       – 词性（可为空）
 * level     – 难度等级 0-5，默认 2(B1)
 * newTopic  – true = 换一个话题，保持当前难度
 */
export async function generateExample(word, lang, definition, pos = '', level = 2, newTopic = false) {
  const { apiKey } = await loadSettings();
  if (!apiKey || !apiKey.trim()) {
    throw new Error('请先在「设置」中填写 DeepSeek API Key');
  }

  const levelLabel = LEVELS[Math.max(0, Math.min(5, level))];
  const posHint = pos ? `, used as a ${pos}` : '';
  const topicHint = newTopic
    ? 'Choose a completely different topic or scenario than you would normally pick.'
    : '';

  const prompt =
    `You are a language teacher. Write ONE natural example sentence in ${lang} ` +
    `that uses the word "${word}"${posHint} with the meaning "${definition}". ` +
    `The sentence should be at CEFR ${levelLabel} level. ` +
    `${topicHint} ` +
    `Return ONLY the sentence itself, no explanation, no translation, no quotes.`;

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: newTopic ? 0.9 : 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API 错误 ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
