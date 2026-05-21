import AsyncStorage from '@react-native-async-storage/async-storage';

const VOCAB_KEY    = 'vocabmemo_words';
const GROUPS_KEY   = 'vocabmemo_groups';
const LANG_KEY     = 'vocabmemo_lang';
const SETTINGS_KEY = 'vocabmemo_settings';

// ─── 语言设置 ──────────────────────────────────────────────────────────────

export async function loadLang() {
  try {
    const raw = await AsyncStorage.getItem(LANG_KEY);
    return raw || 'German';
  } catch { return 'German'; }
}

export async function saveLang(lang) {
  await AsyncStorage.setItem(LANG_KEY, lang);
}

// ─── 全局设置（每日上限、API Key） ────────────────────────────────────────

const DEFAULT_SETTINGS = { dailyLimit: 20, apiKey: '', copyErrorToClipboard: false };

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── 分组 ──────────────────────────────────────────────────────────────────

export async function loadGroups() {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveGroups(groups) {
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export async function addGroup(name, lang = null) {
  const groups = await loadGroups();
  // 同语言下不允许同名分组
  if (groups.find(g => g.name === name && g.lang === lang)) return null;
  const group = { id: Date.now().toString(), name, lang, createdAt: Date.now() };
  groups.push(group);
  await saveGroups(groups);
  return group;
}

export async function deleteGroup(groupId) {
  const [groups, words] = await Promise.all([loadGroups(), loadWords()]);
  const updated = groups.filter(g => g.id !== groupId);
  const updatedWords = words.map(w =>
    w.groupId === groupId ? { ...w, groupId: null } : w
  );
  await Promise.all([saveGroups(updated), saveWords(updatedWords)]);
}

// ─── 单词 ──────────────────────────────────────────────────────────────────

export async function loadWords() {
  try {
    const raw = await AsyncStorage.getItem(VOCAB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveWords(words) {
  await AsyncStorage.setItem(VOCAB_KEY, JSON.stringify(words));
}

/**
 * 取一个词的所有义项（兼容旧格式）。
 * 新格式：word.senses = [{pos, definition, example}, ...]
 * 旧格式：word.pos / word.definition / word.example（单义）
 */
export function getWordSenses(word) {
  if (Array.isArray(word.senses) && word.senses.length > 0) return word.senses;
  return [{ pos: word.pos || '', definition: word.definition || '', example: word.example || '' }];
}

/** 取首条定义文本，供列表缩略显示 */
export function getWordDef(word) {
  const senses = getWordSenses(word);
  if (senses.length === 1) return senses[0].definition;
  return senses.map((s, i) => `${i + 1}. ${s.definition}`).join('  ');
}

export async function addWord(entry) {
  const words = await loadWords();
  const exists = words.some(w => w.word === entry.word && w.lang === entry.lang);
  if (exists) return false;

  // 规范化义项：优先用新格式 senses，兼容旧字段
  const senses = (Array.isArray(entry.senses) && entry.senses.length > 0)
    ? entry.senses
    : [{ pos: entry.pos || '', definition: entry.definition || '', example: entry.example || '' }];

  words.push({
    word:       entry.word,
    lang:       entry.lang,
    gender:     entry.gender  || 'none',
    groupId:    entry.groupId || null,
    senses,
    addedAt:    Date.now(),
    nextReview: Date.now(),
    interval:   1,
    ease:       2.5,
    reviews:    0,
    lapses:     0,
  });
  await saveWords(words);
  return true;
}

export async function updateWord(updated) {
  const words = await loadWords();
  const idx = words.findIndex(w => w.word === updated.word && w.lang === updated.lang);
  if (idx === -1) return;
  words[idx] = { ...words[idx], ...updated };
  await saveWords(words);
}

/**
 * 编辑已有单词，并重置 SRS 进度（视为重新学习）。
 * originalWord/originalLang 用于定位，updated 包含新内容。
 * 语言不可更改。
 */
export async function editWord(originalWord, originalLang, updated) {
  const words = await loadWords();
  const idx = words.findIndex(w => w.word === originalWord && w.lang === originalLang);
  if (idx === -1) return false;

  const senses = (Array.isArray(updated.senses) && updated.senses.length > 0)
    ? updated.senses.filter(s => s.definition.trim())
    : [];
  if (senses.length === 0) return false;

  words[idx] = {
    word:       updated.word?.trim() || originalWord,
    lang:       originalLang,
    gender:     updated.gender || 'none',
    groupId:    updated.groupId !== undefined ? updated.groupId : words[idx].groupId,
    senses,
    addedAt:    words[idx].addedAt,   // 保留原始添加时间
    // 重置 SRS — 视为新词
    nextReview: Date.now(),
    interval:   1,
    ease:       2.5,
    reviews:    0,
    lapses:     0,
  };
  await saveWords(words);
  return true;
}

export async function deleteWord(word, lang) {
  const words = await loadWords();
  await saveWords(words.filter(w => !(w.word === word && w.lang === lang)));
}

// ─── 格式规范化（内部工具） ────────────────────────────────────────────────

/**
 * 将任意格式的单词对象统一规范为含 senses[] 的新格式。
 * - 新格式（已有 senses[]）：原样返回
 * - 旧格式（平铺 pos/definition/example）：构建 senses 数组，并移除旧字段
 */
function normalizeSenses(w) {
  if (Array.isArray(w.senses) && w.senses.length > 0) return w;
  const { pos, definition, example, ...rest } = w;
  return {
    ...rest,
    senses: [{ pos: pos || '', definition: definition || '', example: example || '' }],
  };
}

// ─── 备份 / 导出 ───────────────────────────────────────────────────────────

/**
 * 导出全部单词 + 分组为 JSON 字符串（备份格式）。
 * 返回 { json: string, wordCount: number }
 */
export async function exportBackup() {
  const [words, groups] = await Promise.all([loadWords(), loadGroups()]);
  const payload = {
    version:    2,
    exportedAt: Date.now(),
    words,
    groups,
  };
  return { json: JSON.stringify(payload, null, 2), wordCount: words.length };
}

/**
 * 从备份 JSON 对象导入，合并到现有数据（跳过已存在的词）。
 * 支持格式：
 *   - VocabMemo 备份（version:2，含 words/groups 数组）
 *   - LinguaAI 生词本（key: "lang::word"）
 */
export async function importBackup(jsonObj, defaultGroupId = null) {
  // VocabMemo 自身备份格式
  if (jsonObj.version === 2 && Array.isArray(jsonObj.words)) {
    const [existing, existingGroups] = await Promise.all([loadWords(), loadGroups()]);
    const existingKeys  = new Set(existing.map(w => `${w.lang}::${w.word}`));
    const existingGrpIds = new Set(existingGroups.map(g => g.id));

    // 合并分组（id 不冲突才插入）
    const newGroups = (jsonObj.groups || []).filter(g => !existingGrpIds.has(g.id));
    const mergedGroups = [...existingGroups, ...newGroups];

    // 合并单词（同时将备份中的旧格式词规范化为 senses[] 格式）
    let added = 0;
    const mergedWords = [...existing];
    for (const w of jsonObj.words) {
      const key = `${w.lang}::${w.word}`;
      if (!existingKeys.has(key)) {
        mergedWords.push(normalizeSenses(w));
        existingKeys.add(key);
        added++;
      }
    }

    await Promise.all([saveWords(mergedWords), saveGroups(mergedGroups)]);
    return added;
  }

  // 兼容 LinguaAI 生词本格式
  return importFromLinguaAI(jsonObj, defaultGroupId);
}

/** 批量导入 LinguaAI 生词本 JSON */
export async function importFromLinguaAI(jsonObj, groupId = null) {
  const words = await loadWords();
  const existing = new Set(words.map(w => `${w.lang}::${w.word}`));
  let added = 0;
  for (const [key, v] of Object.entries(jsonObj)) {
    const [lang, ...parts] = key.split('::');
    const word = parts.join('::');
    if (existing.has(`${lang}::${word}`)) continue;
    words.push({
      word:       v.word || word,
      lang:       v.lang || lang,
      gender:     v.gender || 'none',
      senses:     [{ pos: v.pos || '', definition: v.definition || '', example: v.example || '' }],
      addedAt:    v.addedAt || Date.now(),
      nextReview: Date.now(),
      interval:   1,
      ease:       2.5,
      reviews:    0,
      lapses:     0,
      groupId,
    });
    existing.add(`${lang}::${word}`);
    added++;
  }
  await saveWords(words);
  return added;
}

// ─── 数据迁移 ──────────────────────────────────────────────────────────────

const MIGRATION_KEY = 'vocabmemo_migration_v2senses';

/**
 * 一次性迁移：将本地存储中所有旧格式单词（平铺 pos/definition/example）
 * 升级为含 senses[] 的新格式。
 * - 幂等：已执行过则直接返回（靠 AsyncStorage 标志位保证）
 * - 失败不影响正常使用（getWordSenses 的 fallback 兜底）
 * 在 App 启动时调用一次。
 */
export async function runMigrations() {
  try {
    // v2：旧格式单词升级为 senses[]
    const v2done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!v2done) {
      const words = await loadWords();
      let changed = false;
      const migrated = words.map(w => {
        if (Array.isArray(w.senses) && w.senses.length > 0) return w;
        changed = true;
        return normalizeSenses(w);
      });
      if (changed) await saveWords(migrated);
      await AsyncStorage.setItem(MIGRATION_KEY, '1');
    }

    // v3：删除所有未绑定语言的旧分组（语言隔离功能上线前创建的分组）
    const v3done = await AsyncStorage.getItem('vocabmemo_migration_v3groups');
    if (!v3done) {
      const groups = await loadGroups();
      const cleaned = groups.filter(g => g.lang != null);
      await saveGroups(cleaned);
      await AsyncStorage.setItem('vocabmemo_migration_v3groups', '1');
    }
  } catch (_) {
    // 迁移失败不崩溃
  }
}

// ─── 标记"太简单"（永久跳过复习） ────────────────────────────────────────────

export async function markMastered(word) {
  const words = await loadWords();
  const idx = words.findIndex(w => w.word === word.word && w.lang === word.lang);
  if (idx === -1) return;
  words[idx] = {
    ...words[idx],
    mastered:   true,
    nextReview: Date.now() + 365 * 86400000, // 1 年后（实际上 getDueWords 会直接过滤）
  };
  await saveWords(words);
}

// ─── SM-2 间隔重复 ─────────────────────────────────────────────────────────

/** rating: 0=不认识, 1=有印象, 2=认识 */
export async function reviewWord(word, rating) {
  const words = await loadWords();
  const idx = words.findIndex(w => w.word === word.word && w.lang === word.lang);
  if (idx === -1) return;
  const w = { ...words[idx] };
  w.reviews = (w.reviews || 0) + 1;

  if (rating === 0) {
    // 完全不认识：重置间隔，降低 ease，记录 lapse
    w.interval = 1;
    w.ease     = Math.max(1.3, (w.ease || 2.5) - 0.3);
    w.lapses   = (w.lapses || 0) + 1;
  } else if (rating === 1) {
    // 有印象：不延长间隔，稍降 ease
    w.ease = Math.max(1.3, (w.ease || 2.5) - 0.15);
  } else {
    // 认识：正常 SM-2
    w.interval = w.reviews === 1 ? 1
               : w.reviews === 2 ? 3
               : Math.round((w.interval || 1) * (w.ease || 2.5));
    w.ease = Math.min(3.0, (w.ease || 2.5) + 0.1);
  }
  w.nextReview = Date.now() + w.interval * 86400000;
  words[idx] = w;
  await saveWords(words);
}

/**
 * 智能取出待复习单词
 * - lang: 当前语言（null = 全部）
 * - limit: 每日上限（null = 全部）
 * 优先级 = 逾期时长 + 错误惩罚（lapses × 1天）+ ease 惩罚
 */
export async function getDueWords(lang = null, limit = null) {
  const words = await loadWords();
  const now   = Date.now();
  const DAY   = 86400000;

  let due = words.filter(w =>
    !w.mastered &&
    (w.nextReview || 0) <= now &&
    (lang === null || w.lang === lang)
  );

  if (!limit || due.length <= limit) return due;

  // 评分排序，取 top N
  return due
    .map(w => ({
      ...w,
      _score:
        (now - (w.nextReview || 0)) +                    // 逾期加分
        (w.lapses || 0) * DAY +                          // 出错次数加分
        Math.max(0, (2.5 - (w.ease || 2.5))) * DAY * 3, // 低 ease 加分
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...w }) => w);
}
