import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing    from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { loadLang, saveLang, loadSettings, saveSettings, exportBackup, importBackup } from '../utils/storage';
import { useTheme } from '../utils/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../utils/theme';
import { useInactivityBars } from '../utils/useInactivityBars';
import Toast from '../components/Toast';

const LANGUAGES = [
  'German', 'French', 'Spanish', 'Italian',
  'Japanese', 'Korean', 'Portuguese', 'Russian', 'English',
];

const LANG_LABEL = {
  German: '德语', French: '法语', Spanish: '西班牙语', Italian: '意大利语',
  Japanese: '日语', Korean: '韩语', Portuguese: '葡萄牙语',
  Russian: '俄语', English: '英语',
};

// 每日词量预设值
const DAILY_PRESETS = [5, 10, 20, 30, 50];

export default function SettingsScreen() {
  const s = useMemo(makeStyles, []);
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const toastRef = useRef();
  const { onActivity } = useInactivityBars();

  const [lang,        setLangState]  = useState('German');
  const [dailyLimit,  setDailyLimit] = useState(20);
  const [apiKey,      setApiKey]     = useState('');
  const [copyOnError, setCopyOnError]= useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // 自定义词量
  const [showCustom,  setShowCustom]  = useState(false);
  const [customInput, setCustomInput] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [l, cfg] = await Promise.all([loadLang(), loadSettings()]);
    setLangState(l);
    const limit = cfg.dailyLimit ?? 20;
    setDailyLimit(limit);
    setApiKey(cfg.apiKey ?? '');
    setCopyOnError(cfg.copyErrorToClipboard !== false);
    // 若当前值不在预设里，展开自定义
    if (!DAILY_PRESETS.includes(limit)) {
      setCustomInput(String(limit));
      setShowCustom(true);
    }
  }

  // ── 语言 ────────────────────────────────────────────────────────────────
  async function handleLangChange(l) {
    setLangState(l);
    await saveLang(l);
    toastRef.current?.show(`已切换至 ${l}`, 'success');
  }

  // ── 每日词量（预设直接保存） ─────────────────────────────────────────────
  async function selectLimit(preset) {
    setDailyLimit(preset);
    setShowCustom(false);
    setCustomInput('');
    const cfg = await loadSettings();
    await saveSettings({ ...cfg, dailyLimit: preset, apiKey: apiKey.trim(), copyErrorToClipboard: copyOnError });
  }

  async function saveCustomLimit() {
    const val = parseInt(customInput, 10);
    if (isNaN(val) || val < 1 || val > 999) {
      toastRef.current?.show('请输入 1–999 之间的数字', 'error');
      return;
    }
    setDailyLimit(val);
    const cfg = await loadSettings();
    await saveSettings({ ...cfg, dailyLimit: val, apiKey: apiKey.trim(), copyErrorToClipboard: copyOnError });
    toastRef.current?.show(`每日词量已设为 ${val}`, 'success');
  }

  // ── API Key（失焦保存） ──────────────────────────────────────────────────
  async function saveApiKey() {
    const cfg = await loadSettings();
    await saveSettings({ ...cfg, dailyLimit, apiKey: apiKey.trim(), copyErrorToClipboard: copyOnError });
  }

  // ── 数据备份 ─────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const { json, wordCount } = await exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      const path = `${FileSystem.cacheDirectory}mnemo_backup_${date}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: 'utf8' });
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: '保存 Mnemo 备份' });
      toastRef.current?.show(`已导出 ${wordCount} 个单词`, 'success');
    } catch (e) {
      toastRef.current?.show('导出失败：' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      const raw  = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const json = JSON.parse(raw);
      const added = await importBackup(json);
      toastRef.current?.show(`导入成功，新增 ${added} 个单词`, 'success');
    } catch (e) {
      toastRef.current?.show('导入失败：' + e.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  // ── 偏好（即时保存） ─────────────────────────────────────────────────────
  async function toggleCopyOnError() {
    const next = !copyOnError;
    setCopyOnError(next);
    const cfg = await loadSettings();
    await saveSettings({ ...cfg, copyErrorToClipboard: next });
  }

  const isCustomActive = !DAILY_PRESETS.includes(dailyLimit);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
        onTouchStart={onActivity}
      >

        {/* ── 学习语言 ───────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>学习语言</Text>

        <View style={s.langList}>
          {LANGUAGES.map((l, i) => (
            <TouchableOpacity
              key={l}
              style={[s.langRow, i === LANGUAGES.length - 1 && s.langRowLast]}
              onPress={() => handleLangChange(l)}
              activeOpacity={0.6}
            >
              <View style={[s.langDot, lang === l && s.langDotActive]} />
              <Text style={[s.langName, lang === l && s.langNameActive]}>{l}</Text>
              <Text style={[s.langZh,   lang === l && s.langZhActive]}>{LANG_LABEL[l]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 每日词量 — 文字型预设 + 自定义 ───────────────────── */}
        <View style={s.sectionGap} />
        <Text style={s.sectionLabel}>每日词量</Text>

        <View style={s.presetRow}>
          {DAILY_PRESETS.map((preset, i) => (
            <React.Fragment key={preset}>
              <TouchableOpacity onPress={() => selectLimit(preset)}>
                <Text style={[s.preset, dailyLimit === preset && s.presetActive]}>
                  {preset}
                </Text>
              </TouchableOpacity>
              {i < DAILY_PRESETS.length - 1 && (
                <Text style={s.presetSep}>·</Text>
              )}
            </React.Fragment>
          ))}

          {/* 自定义选项 */}
          <Text style={s.presetSep}>·</Text>
          <TouchableOpacity onPress={() => setShowCustom(v => !v)}>
            <Text style={[s.preset, isCustomActive && s.presetActive]}>
              {isCustomActive ? `${dailyLimit}` : '自定义'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 自定义输入行 */}
        {showCustom && (
          <View style={s.customRow}>
            <TextInput
              style={s.customInput}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="1–999"
              placeholderTextColor={colors.text3}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={saveCustomLimit}
              autoFocus={!isCustomActive}
            />
            <Text style={s.customUnit}>词 / 天</Text>
            <TouchableOpacity onPress={saveCustomLimit} style={s.customSaveBtn}>
              <Text style={s.customSaveBtnText}>确定</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── AI 连接 ────────────────────────────────────────────── */}
        <View style={s.sectionGap} />
        <Text style={s.sectionLabel}>AI 连接</Text>
        <Text style={s.sectionSub}>DeepSeek API Key，用于生成例句</Text>

        <TextInput
          style={s.apiInput}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-…"
          placeholderTextColor={colors.text3}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          onBlur={saveApiKey}
        />

        {/* ── 数据 ───────────────────────────────────────────────── */}
        <View style={s.sectionGap} />
        <Text style={s.sectionLabel}>数据</Text>

        <TouchableOpacity style={s.actionRow} onPress={handleExport} disabled={exporting} activeOpacity={0.6}>
          <Text style={[s.actionLabel, exporting && s.actionDim]}>导出备份</Text>
          {exporting
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={s.actionIcon}>↑</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionRow, s.actionRowLast]} onPress={handleImport} disabled={importing} activeOpacity={0.6}>
          <Text style={[s.actionLabel, importing && s.actionDim]}>导入备份</Text>
          {importing
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={s.actionIcon}>↓</Text>
          }
        </TouchableOpacity>

        {/* ── 偏好 ───────────────────────────────────────────────── */}
        <View style={s.sectionGap} />
        <Text style={s.sectionLabel}>偏好</Text>

        <TouchableOpacity style={s.settingRow} onPress={toggleTheme} activeOpacity={0.6}>
          <View style={s.settingText}>
            <Text style={s.settingLabel}>{isDark ? '深色模式' : '浅色模式'}</Text>
            <Text style={s.settingSub}>点击切换</Text>
          </View>
          <View style={[s.toggle, !isDark && s.toggleOn]}>
            <View style={[s.toggleThumb, !isDark && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[s.settingRow, s.settingRowLast]} onPress={toggleCopyOnError} activeOpacity={0.6}>
          <View style={s.settingText}>
            <Text style={s.settingLabel}>报错内容自动复制</Text>
            <Text style={s.settingSub}>出错时将错误信息复制到剪切板</Text>
          </View>
          <View style={[s.toggle, copyOnError && s.toggleOn]}>
            <View style={[s.toggleThumb, copyOnError && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
        <Toast ref={toastRef} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 24, paddingBottom: 56 },

    // ── Section 标签 ──────────────────────────────────────────────────────
    sectionLabel: {
      fontSize:      11,
      color:         colors.text4,
      fontWeight:    '500',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      marginBottom:  14,
    },
    sectionSub: {
      fontSize:     13,
      color:        colors.text3,
      lineHeight:   18,
      marginBottom: 12,
      marginTop:    -8,
    },
    sectionGap: { height: 40 },

    // ── 语言列表 ──────────────────────────────────────────────────────────
    langList: {
      borderTopWidth:  StyleSheet.hairlineWidth,
      borderTopColor:  colors.border,
    },
    langRow: {
      flexDirection:     'row',
      alignItems:        'center',
      paddingVertical:   16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    langRowLast: { borderBottomWidth: 0 },
    langDot: {
      width: 5, height: 5, borderRadius: 2.5,
      backgroundColor: 'transparent',
      borderWidth: 1, borderColor: colors.border2,
      marginRight: 14,
    },
    langDotActive:  { backgroundColor: colors.accent, borderColor: colors.accent },
    langName:       { flex: 1, fontSize: 16, color: colors.text3, letterSpacing: 0.1 },
    langNameActive: { color: colors.text, fontWeight: '400' },
    langZh:         { fontSize: 13, color: colors.text3 },
    langZhActive:   { color: colors.accent },

    // ── 每日词量 — 文字预设 ───────────────────────────────────────────────
    presetRow: {
      flexDirection:  'row',
      alignItems:     'center',
      paddingVertical: 12,
      flexWrap:       'wrap',
      gap: 0,
    },
    preset: {
      fontSize:          20,
      fontWeight:        '300',
      color:             colors.text4,
      paddingHorizontal: 10,
      paddingVertical:    6,
      letterSpacing:     0.2,
    },
    presetActive: {
      color:      colors.text,
      fontWeight: '400',
    },
    presetSep: {
      fontSize:  16,
      color:     colors.text4,
    },

    // ── 自定义词量输入 ────────────────────────────────────────────────────
    customRow: {
      flexDirection: 'row',
      alignItems:    'center',
      paddingTop:    8,
      paddingBottom: 4,
      gap:           10,
    },
    customInput: {
      backgroundColor:   'transparent',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border2,
      paddingVertical:   8,
      paddingHorizontal: 0,
      color:             colors.text,
      fontSize:          20,
      fontWeight:        '300',
      width:             64,
      letterSpacing:     0.2,
    },
    customUnit: {
      fontSize:  13,
      color:     colors.text3,
      flex:      1,
    },
    customSaveBtn:     { paddingHorizontal: 4, paddingVertical: 6 },
    customSaveBtnText: { fontSize: 13, color: colors.accent, fontWeight: '500' },

    // ── API Key ───────────────────────────────────────────────────────────
    apiInput: {
      backgroundColor:   'transparent',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border2,
      paddingVertical:   12,
      paddingHorizontal: 0,
      color:             colors.text,
      fontSize:          14,
      letterSpacing:     0.3,
    },

    // ── 操作行（备份）────────────────────────────────────────────────────
    actionRow: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingVertical:   15,
      borderTopWidth:    StyleSheet.hairlineWidth,
      borderTopColor:    colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    actionRowLast: { borderTopWidth: 0 },
    actionLabel:   { fontSize: 14, color: colors.text2 },
    actionDim:     { opacity: 0.4 },
    actionIcon:    { fontSize: 15, color: colors.text3 },

    // ── 开关行 ────────────────────────────────────────────────────────────
    settingRow: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingVertical:   15,
      borderTopWidth:    StyleSheet.hairlineWidth,
      borderTopColor:    colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    settingRowLast: { borderTopWidth: 0 },
    settingText:    { flex: 1, marginRight: 16 },
    settingLabel:   { fontSize: 14, color: colors.text2 },
    settingSub:     { fontSize: 12, color: colors.text3, marginTop: 2 },

    toggle: {
      width: 44, height: 24, borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border2,
      justifyContent: 'center', paddingHorizontal: 2,
    },
    toggleOn:       { backgroundColor: colors.primaryContainer, borderColor: 'transparent' },
    toggleThumb:    { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.text3 },
    toggleThumbOn:  { backgroundColor: colors.accent, transform: [{ translateX: 20 }] },
  });
}
