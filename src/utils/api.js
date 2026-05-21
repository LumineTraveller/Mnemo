import { loadSettings } from './storage';

const API_BASE = 'https://api.deepseek.com/v1';

// 0=A1  1=A2  2=B1(default)  3=B2  4=C1  5=C2
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// 中文词性 → 英文，供 prompt 使用
const POS_EN = {
  '名词': 'noun', '动词': 'verb', '形容词': 'adjective',
  '副词': 'adverb', '介词': 'preposition', '连词': 'conjunction',
  '代词': 'pronoun', '其他': '',
};

/**
 * word       – 目标单词
 * lang       – 语言
 * definition – 释义（中文）
 * pos        – 词性（中文，可为空）
 * level      – 难度等级 0-5，默认 2(B1)
 * newTopic   – true = 换一个话题，保持当前难度
 */
export async function generateExample(word, lang, definition, pos = '', level = 2, newTopic = false) {
  const { apiKey } = await loadSettings();
  if (!apiKey?.trim()) {
    throw new Error('请先在「设置」中填写 DeepSeek API Key');
  }

  const levelLabel = LEVELS[Math.max(0, Math.min(5, level))];
  const posEn      = POS_EN[pos] ?? '';
  const posHint    = posEn ? `, used as a ${posEn}` : '';
  const topicHint  = newTopic
    ? ' Choose a completely different topic or scenario than you would normally pick.'
    : '';

  const prompt =
    `You are a language teacher. Write ONE natural example sentence in ${lang} ` +
    `that uses the word "${word}"${posHint} with the meaning "${definition}". ` +
    `The sentence should be at CEFR ${levelLabel} level.${topicHint} ` +
    `Return ONLY the sentence itself — no explanation, no translation, no quotes, no punctuation outside the sentence.`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model:       'deepseek-v4-flash',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  1000,
        temperature: newTopic ? 0.9 : 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API 错误 ${res.status}`);
    }

    const data   = await res.json();
    const choice = data.choices?.[0];

    // finish_reason === 'length' 表示被 token 上限截断
    if (choice?.finish_reason === 'length') {
      throw new Error('生成内容被截断，请重试');
    }

    const sentence = choice?.message?.content?.trim() || '';
    if (!sentence) throw new Error('未返回内容，请重试');
    return sentence;

  } catch (e) {
    if (e.name === 'AbortError') throw new Error('请求超时，请检查网络后重试');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
