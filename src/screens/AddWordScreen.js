import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { addWord, loadGroups, deleteGroup, loadLang } from '../utils/storage';
import { generateExample } from '../utils/api';
import { colors } from '../utils/theme';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

const GENDERED = ['German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Russian'];
const POS_LIST = ['名词', '动词', '形容词', '副词', '介词', '连词', '代词', '其他'];

const GENDER_OPTIONS = [
  { val: 'none', label: '—' },
  { val: 'm',    label: '阳' },
  { val: 'f',    label: '阴' },
  { val: 'n',    label: '中' },
];

function emptySense() {
  return { pos: '', definition: '', example: '' };
}

export default function AddWordScreen({ navigation, route }) {
  const s = useMemo(makeStyles, []);
  const [lang,         setLang]         = useState('German');
  const [word,         setWord]         = useState('');
  const [gender,       setGender]       = useState('none');
  const [groupId,      setGroupId]      = useState(route.params?.groupId ?? null);
  const [groups,       setGroups]       = useState([]);
  const [senses,       setSenses]       = useState([emptySense()]);
  const [aiLoading,    setAiLoading]    = useState([false]);
  const [aiSuggest,    setAiSuggest]    = useState(['']);
  const [aiDifficulty, setAiDifficulty] = useState([2]);

  const toastRef      = useRef();
  const [modal, setModal] = useState(null);
  const handleSaveRef = useRef(null);

  useEffect(() => {
    Promise.all([loadGroups(), loadLang()]).then(([grps, l]) => {
      setGroups(grps);
      setLang(l);
    });
  }, []);

  // 性别选项只在有名词义项时显示
  const showGender = GENDERED.includes(lang) && senses.some(s => s.pos === '名词');
  // 当没有名词义项时自动重置性别
  useEffect(() => { if (!showGender) setGender('none'); }, [showGender]);

  // ── Sense helpers ────────────────────────────────────────────────────────

  function updateSense(idx, field, value) {
    setSenses(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    // 德语选名词时自动首字母大写
    if (field === 'pos' && value === '名词' && lang === 'German') {
      setWord(prev => prev ? prev.charAt(0).toUpperCase() + prev.slice(1) : prev);
    }
  }
  function addSense() {
    setSenses(prev => [...prev, emptySense()]);
    setAiLoading(prev => [...prev, false]);
    setAiSuggest(prev => [...prev, '']);
    setAiDifficulty(prev => [...prev, 2]);
  }
  function removeSense(idx) {
    setSenses(prev => prev.filter((_, i) => i !== idx));
    setAiLoading(prev => prev.filter((_, i) => i !== idx));
    setAiSuggest(prev => prev.filter((_, i) => i !== idx));
    setAiDifficulty(prev => prev.filter((_, i) => i !== idx));
  }

  // ── AI example ───────────────────────────────────────────────────────────

  async function handleAiExample(idx, mode = 'normal') {
    if (!word.trim()) { toastRef.current?.show('请先输入单词', 'error'); return; }
    const sense = senses[idx];
    if (!sense.definition.trim()) { toastRef.current?.show('请先填写释义', 'error'); return; }

    let level = aiDifficulty[idx] ?? 2;
    const newTopic = mode === 'retopic';
    if (mode === 'harder')  { level = Math.min(5, level + 1); setAiDifficulty(prev => { const n=[...prev]; n[idx]=level; return n; }); }
    if (mode === 'simpler') { level = Math.max(0, level - 1); setAiDifficulty(prev => { const n=[...prev]; n[idx]=level; return n; }); }

    setAiLoading(prev => { const n=[...prev]; n[idx]=true;  return n; });
    setAiSuggest(prev => { const n=[...prev]; n[idx]='';    return n; });
    try {
      const sentence = await generateExample(word.trim(), lang, sense.definition.trim(), sense.pos, level, newTopic);
      setAiSuggest(prev => { const n=[...prev]; n[idx]=sentence; return n; });
    } catch (e) {
      toastRef.current?.show('生成失败：' + e.message, 'error');
    } finally {
      setAiLoading(prev => { const n=[...prev]; n[idx]=false; return n; });
    }
  }
  function acceptAiSuggest(idx) {
    updateSense(idx, 'example', aiSuggest[idx]);
    setAiSuggest(prev => { const n=[...prev]; n[idx]=''; return n; });
  }
  function dismissAiSuggest(idx) {
    setAiSuggest(prev => { const n=[...prev]; n[idx]=''; return n; });
  }

  // ── Groups ───────────────────────────────────────────────────────────────

  function handleDeleteGroup(g) {
    setModal({
      title: '删除分组', message: `删除「${g.name}」？该组单词将移回未分组。`,
      confirmLabel: '删除', destructive: true,
      onConfirm: async () => {
        await deleteGroup(g.id);
        if (groupId === g.id) setGroupId(null);
        loadGroups().then(setGroups);
      },
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!word.trim()) { toastRef.current?.show('请输入单词', 'error'); return; }
    const validSenses = senses.filter(item => item.definition.trim());
    if (validSenses.length === 0) { toastRef.current?.show('至少需要填写一条释义', 'error'); return; }
    if (validSenses.some(item => !item.pos)) { toastRef.current?.show('每个义项都需要选择词性', 'error'); return; }
    const posValues = validSenses.map(item => item.pos);
    if (new Set(posValues).size !== posValues.length) { toastRef.current?.show('义项之间的词性不能重复', 'error'); return; }

    const ok = await addWord({ word: word.trim(), lang, gender, groupId, senses: validSenses });
    if (ok) {
      setModal({
        title: '已添加', message: `「${word.trim()}」已加入单词本`,
        confirmLabel: '继续添加',
        onConfirm: () => {
          setWord(''); setGender('none');
          setSenses([emptySense()]); setAiLoading([false]);
          setAiSuggest(['']); setAiDifficulty([2]);
        },
        cancelLabel: '返回',
        onCancel: () => navigation.goBack(),
      });
    } else {
      toastRef.current?.show(`「${word.trim()}」（${lang}）已存在`, 'error');
    }
  }
  // 每次 render 同步 ref，让 headerRight 始终调用最新版本的 handleSave
  handleSaveRef.current = handleSave;
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => handleSaveRef.current?.()}
          style={{ paddingRight: 16, paddingVertical: 8 }}
        >
          <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '500' }}>保存</Text>
        </TouchableOpacity>
      ),
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* 语言提示 */}
        <Text style={s.langHint}>{lang}  ·  在设置中切换</Text>

        {/* 单词 — 视觉中心 */}
        <TextInput
          style={s.wordInput}
          value={word}
          onChangeText={setWord}
          placeholder="单词…"
          placeholderTextColor={colors.text3}
          autoCapitalize="none"
          autoFocus
        />

        {/* 语法性别 — 在单词下方，义项前 */}
        {showGender && (
          <View style={s.metaRow}>
            <Text style={s.metaKey}>性别</Text>
            <View style={s.metaOptions}>
              {GENDER_OPTIONS.map((g, i) => (
                <React.Fragment key={g.val}>
                  <TouchableOpacity onPress={() => setGender(g.val)}>
                    <Text style={[s.metaOpt, gender === g.val && s.metaOptActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                  {i < GENDER_OPTIONS.length - 1 && <Text style={s.metaSep}>·</Text>}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* 义项 */}
        {senses.map((sense, idx) => (
          <SenseCard
            key={idx}
            index={idx}
            total={senses.length}
            sense={sense}
            aiLoading={aiLoading[idx] || false}
            aiSuggest={aiSuggest[idx] || ''}
            onChange={(field, value) => updateSense(idx, field, value)}
            onRemove={() => removeSense(idx)}
            onAiGenerate={() => handleAiExample(idx)}
            onAiAccept={() => acceptAiSuggest(idx)}
            onAiDismiss={() => dismissAiSuggest(idx)}
            onAiHarder={() => handleAiExample(idx, 'harder')}
            onAiSimpler={() => handleAiExample(idx, 'simpler')}
            onAiRetopic={() => handleAiExample(idx, 'retopic')}
          />
        ))}

        <TouchableOpacity style={s.addSenseBtn} onPress={addSense}>
          <Text style={s.addSenseBtnText}>＋ 添加义项</Text>
        </TouchableOpacity>

        {/* 分组 — inline 文字切换（长按删除） */}
        <View style={s.metaRow}>
          <Text style={s.metaKey}>分组</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.metaOptions}>
            <TouchableOpacity onPress={() => setGroupId(null)}>
              <Text style={[s.metaOpt, groupId === null && s.metaOptActive]}>未分组</Text>
            </TouchableOpacity>
            {groups.filter(g => g.lang === lang).map((g, i) => (
              <React.Fragment key={g.id}>
                <Text style={s.metaSep}>·</Text>
                <TouchableOpacity
                  onPress={() => setGroupId(g.id)}
                  onLongPress={() => handleDeleteGroup(g)}
                >
                  <Text style={[s.metaOpt, groupId === g.id && s.metaOptActive]}>{g.name}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>
        </View>

      </ScrollView>

      <ConfirmModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel}
        cancelLabel={modal?.cancelLabel}
        onConfirm={() => { modal?.onConfirm?.(); setModal(null); }}
        onCancel={() => { modal?.onCancel?.(); setModal(null); }}
      />
      <Toast ref={toastRef} />
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// ── SenseCard — 例句优先，POS 内联收起 ──────────────────────────────────────

function SenseCard({
  index, total, sense, aiLoading, aiSuggest,
  onChange, onRemove,
  onAiGenerate, onAiAccept, onAiDismiss, onAiHarder, onAiSimpler, onAiRetopic,
}) {
  const s = useMemo(makeStyles, []);
  const [showPos, setShowPos] = useState(false);

  return (
    <View style={[s.senseSection, index > 0 && s.senseSectionGap]}>

      {/* 义项序号（多义项时才显示） */}
      {total > 1 && (
        <View style={s.senseHeader}>
          <Text style={s.senseNum}>义项 {index + 1}</Text>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={s.senseRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ① 词性 — 内联折叠 */}
      <TouchableOpacity style={[s.posToggleRow, { marginBottom: 10 }]} onPress={() => setShowPos(v => !v)}>
        <Text style={s.posToggleText}>
          词性{sense.pos ? `  ·  ${sense.pos}` : ''}
          {'  '}{showPos ? '▴' : '▾'}
        </Text>
      </TouchableOpacity>

      {showPos && (
        <View style={s.posOptions}>
          {POS_LIST.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <Text style={s.posOptSep}>·</Text>}
              <TouchableOpacity
                onPress={() => { onChange('pos', sense.pos === p ? '' : p); setShowPos(false); }}
              >
                <Text style={[s.posOpt, sense.pos === p && s.posOptActive]}>{p}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ② 释义 */}
      <TextInput
        style={s.inputDef}
        value={sense.definition}
        onChangeText={v => onChange('definition', v)}
        placeholder="释义…"
        placeholderTextColor={colors.text3}
        multiline
      />

      {/* ③ 例句 */}
      <View style={s.exampleLabelRow}>
        <Text style={s.fieldHint}>例句</Text>
        <TouchableOpacity onPress={onAiGenerate} disabled={aiLoading} style={s.aiTrigger}>
          {aiLoading
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={s.aiTriggerText}>✦ 生成</Text>
          }
        </TouchableOpacity>
      </View>

      {/* AI 建议 — blockquote */}
      {aiSuggest ? (
        <View style={s.aiBlock}>
          <Text style={s.aiSuggestText}>{aiSuggest}</Text>
          <View style={s.aiActions}>
            <TouchableOpacity onPress={onAiAccept}>
              <Text style={s.aiAccept}>使用</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAiDismiss}>
              <Text style={s.aiAction}>忽略</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAiSimpler}>
              <Text style={s.aiAction}>简单些</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAiHarder}>
              <Text style={s.aiAction}>难些</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAiRetopic}>
              <Text style={s.aiAction}>换一个</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <TextInput
        style={s.inputExample}
        value={sense.example}
        onChangeText={v => onChange('example', v)}
        placeholder="一个例句…"
        placeholderTextColor={colors.text3}
        multiline
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles() {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 56 },

    // ── 语言提示 ──────────────────────────────────────────────────────────
    langHint: {
      fontSize:      12,
      color:         colors.text3,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      marginBottom:  22,
    },

    // ── 单词大输入 ────────────────────────────────────────────────────────
    wordInput: {
      backgroundColor:   'transparent',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border2,
      paddingVertical:   8,
      paddingHorizontal: 0,
      color:             colors.text,
      fontSize:          34,
      fontWeight:        '300',
      letterSpacing:     -0.5,
      marginBottom:      32,
    },

    // ── 义项区块 ──────────────────────────────────────────────────────────
    senseSection: {
      paddingBottom:     24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    senseSectionGap: { marginTop: 24 },
    senseHeader: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   16,
    },
    senseNum:    { fontSize: 11, color: colors.text3, letterSpacing: 0.8, textTransform: 'uppercase' },
    senseRemove: { fontSize: 13, color: colors.text3, opacity: 0.6 },

    // ── 例句行标签 + AI 按钮 ──────────────────────────────────────────────
    exampleLabelRow: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   8,
    },
    fieldHint: {
      fontSize:      11,
      color:         colors.text3,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    aiTrigger:     { paddingVertical: 4, paddingLeft: 8 },
    aiTriggerText: { fontSize: 12, color: colors.accent, letterSpacing: 0.3 },

    // ── AI 建议 — blockquote ──────────────────────────────────────────────
    aiBlock: {
      borderLeftWidth: 2,
      borderLeftColor: colors.accent + '50',
      paddingLeft:     14,
      paddingVertical: 10,
      marginBottom:    10,
    },
    aiSuggestText: {
      fontSize:     16,
      color:        colors.text2,
      lineHeight:   24,
      fontFamily:   'Lora_400Regular_Italic',
      marginBottom: 10,
    },
    aiActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    aiAccept:  { fontSize: 13, color: colors.accent, fontWeight: '500' },
    aiAction:  { fontSize: 13, color: colors.text3 },

    // ── 例句输入 — blockquote 左线 + 斜体 ────────────────────────────────
    inputExample: {
      borderLeftWidth:   2,
      borderLeftColor:   colors.border2,
      paddingLeft:       14,
      paddingVertical:   10,
      paddingRight:      0,
      backgroundColor:   'transparent',
      color:             colors.text2,
      fontSize:          17,
      fontFamily:        'Lora_400Regular_Italic',
      lineHeight:        26,
      marginBottom:      18,
    },

    // ── 释义输入 ──────────────────────────────────────────────────────────
    inputDef: {
      backgroundColor:   'transparent',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical:   10,
      paddingHorizontal: 0,
      color:             colors.text2,
      fontSize:          15,
      lineHeight:        23,
      marginBottom:      16,
    },

    // ── 词性 内联收起 ─────────────────────────────────────────────────────
    posToggleRow: { paddingVertical: 6 },
    posToggleText: {
      fontSize:      13,
      color:         colors.text3,
      letterSpacing: 0.3,
    },
    posOptions: {
      flexDirection:  'row',
      flexWrap:       'wrap',
      gap:            6,
      paddingVertical:10,
      rowGap:         10,
    },
    posOptSep: { fontSize: 13, color: colors.border2, alignSelf: 'center' },
    posOpt:    { fontSize: 14, color: colors.text3, paddingHorizontal: 4, paddingVertical: 4 },
    posOptActive: { color: colors.accent, fontWeight: '500' },

    // ── 添加义项 ──────────────────────────────────────────────────────────
    addSenseBtn:     { paddingVertical: 20, alignItems: 'center' },
    addSenseBtnText: { color: colors.text3, fontSize: 14, letterSpacing: 0.5 },

    // ── 元数据行（性别、分组） ────────────────────────────────────────────
    metaRow: {
      flexDirection:  'row',
      alignItems:     'center',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    metaKey:  { fontSize: 12, color: colors.text3, letterSpacing: 0.5, width: 36 },
    metaOptions: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    metaOpt:  { fontSize: 15, color: colors.text4, paddingHorizontal: 6, paddingVertical: 2 },
    metaOptActive: { color: colors.text, fontWeight: '500' },
    metaSep:  { fontSize: 14, color: colors.text4 },

    // ── 保存 ──────────────────────────────────────────────────────────────
    saveBtn: {
      paddingVertical: 22,
      alignItems:      'center',
      marginTop:       28,
      borderTopWidth:  StyleSheet.hairlineWidth,
      borderTopColor:  colors.border,
    },
    saveBtnText: {
      color:         colors.text2,
      fontSize:      13,
      letterSpacing: 2.0,
      textTransform: 'uppercase',
    },
  });
}
