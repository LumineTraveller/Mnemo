import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Animated, Dimensions, Platform, PanResponder,
} from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { useFocusEffect } from '@react-navigation/native';
import {
  loadWords, loadGroups, saveWords, addGroup, deleteGroup,
  loadLang, getWordDef, getWordSenses,
} from '../utils/storage';
import { colors } from '../utils/theme';
import { useInactivityBars } from '../utils/useInactivityBars';

const GENDER_COLOR = { m: colors.genderM, f: colors.genderF, n: colors.genderN };

// 语言在自身语言里的名称
const LANG_NATIVE = {
  German:     'Deutsch',
  French:     'Français',
  Spanish:    'Español',
  Italian:    'Italiano',
  Japanese:   '日本語',
  Korean:     '한국어',
  Portuguese: 'Português',
  Russian:    'Русский',
  English:    'English',
};

// 词数本地化
const WORD_LABELS = {
  German:     n => `${n} Wörter`,
  French:     n => `${n} mot${n !== 1 ? 's' : ''}`,
  Spanish:    n => `${n} palabra${n !== 1 ? 's' : ''}`,
  Italian:    n => `${n} parola${n !== 1 ? 'e' : ''}`,
  Japanese:   n => `${n} 語`,
  Korean:     n => `${n} 단어`,
  Portuguese: n => `${n} palavra${n !== 1 ? 's' : ''}`,
  Russian:    n => `${n} слов`,
  English:    n => `${n} word${n !== 1 ? 's' : ''}`,
};
function wordCountLabel(n, lang) {
  return (WORD_LABELS[lang] ?? (c => `${c} words`))(n);
}

// ── Carousel 常量 ──────────────────────────────────────────────────────────
const SCREEN_W  = Dimensions.get('window').width;
const TAB_GAP   = 10;    // 相邻 tab 文字边缘之间的最小间距（px）
const TAB_PAD_H = 10;    // 每个 tab 水平内边距（左右各一份）
const DEFAULT_TAB_W = 52; // 未测量前的估算宽度

// 当台前是 tab j 时，tab i 相对中心的 translateX
// 使用各 tab 实测宽度（含 padding）逐段累加，保证边缘不重叠
function getCumulativeOffset(i, j, widths) {
  if (i === j) return 0;
  let offset = 0;
  if (i > j) {
    for (let k = j; k < i; k++) {
      const wk  = widths[k]   || DEFAULT_TAB_W;
      const wk1 = widths[k+1] || DEFAULT_TAB_W;
      offset += wk / 2 + TAB_GAP + wk1 / 2;
    }
  } else {
    for (let k = j; k > i; k--) {
      const wk  = widths[k]   || DEFAULT_TAB_W;
      const wk1 = widths[k-1] || DEFAULT_TAB_W;
      offset -= wk / 2 + TAB_GAP + wk1 / 2;
    }
  }
  return offset;
}

export default function WordListScreen({ navigation, route }) {
  const s           = useMemo(makeStyles, []);
  const insets      = useSafeAreaInsets();
  const initGroupId = route.params?.groupId ?? null;

  const [words,       setWords]       = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [query,       setQuery]       = useState('');
  const [showSearch,  setShowSearch]  = useState(false);
  const [activeGrp,   setActiveGrp]   = useState(initGroupId);
  const [newGrpName,  setNewGrpName]  = useState('');
  const [showNewGrp,  setShowNewGrp]  = useState(false);
  const [currentLang, setCurrentLang] = useState(null);
  const [modal,       setModal]       = useState(null);
  // Carousel 容器实测宽度，初始用屏宽估算

  const toastRef     = useRef();
  const prevLangRef  = useRef(null);
  // 代表"当前台前位置"的动画值：0 = 第一个 tab，1 = 第二个，以此类推
  const positionAnim = useRef(new Animated.Value(0)).current;
  // 每个 tab 的实测宽度（含 padding），onLayout 回调后更新
  const [tabWidths, setTabWidths] = useState({});

  const { onActivity } = useInactivityBars();

  // 供 PanResponder 回调读取最新状态（避免闭包陷阱）
  const activeGrpRef  = useRef(null);
  const allTabsRef    = useRef([]);
  const switchGrpRef  = useRef(null);
  activeGrpRef.current = activeGrp;

  // ── 分组 tab 列表 ─────────────────────────────────────────────────────────

  const visibleGroups = useMemo(
    () => currentLang ? groups.filter(g => g.lang === currentLang) : groups,
    [groups, currentLang]
  );

  const allTabs = useMemo(() => [
    { id: null, label: '全部' },
    ...visibleGroups.map(g => ({ id: g.id, label: g.name })),
  ], [visibleGroups]);

  // 当 tab 列表变化（新增/删除分组、切换语言），同步重置位置
  useEffect(() => {
    const idx = allTabs.findIndex(t => t.id === activeGrp);
    positionAnim.setValue(idx >= 0 ? idx : 0);
  }, [allTabs]);

  // ── 为每个 tab 预计算动画插值 ─────────────────────────────────────────────
  // 当 positionAnim = k（台前是第 k 个 tab）：
  //   tab i 的 translateX 由各 tab 实测宽度逐段累加得出，保证边缘不重叠
  //   scale / opacity 随距离衰减，营造景深感
  const tabTransforms = useMemo(() => {
    if (allTabs.length === 0) return [];
    // interpolate 要求 outputRange 至少 2 个点；只有一个 tab 时补一个哑点
    const inputRange = allTabs.length >= 2
      ? allTabs.map((_, j) => j)
      : [0, 1];
    return allTabs.map((_, i) => ({
      translateX: positionAnim.interpolate({
        inputRange,
        // left: SCREEN_W/2 把左边缘锚定在屏幕中心；再减去自身宽度的一半就把中心
        // 对齐到屏幕中心，最后加上相对台前的偏移量
        outputRange: inputRange.map(j =>
          -(tabWidths[i] || DEFAULT_TAB_W) / 2 + getCumulativeOffset(i, j, tabWidths)
        ),
        extrapolate: 'extend',   // 边缘 tab 继续线性平移出视野
      }),
      scale: positionAnim.interpolate({
        inputRange,
        outputRange: inputRange.map(j => {
          const d = Math.abs(i - j);
          if (d === 0) return 1.00;
          if (d === 1) return 0.85;
          return 0.72;
        }),
        extrapolate: 'clamp',
      }),
      opacity: positionAnim.interpolate({
        inputRange,
        outputRange: inputRange.map(j => {
          const d = Math.abs(i - j);
          if (d === 0) return 1.00;
          if (d === 1) return 0.55;
          return 0.32;
        }),
        extrapolate: 'clamp',
      }),
    }));
  }, [allTabs, tabWidths]);

  // ── 切换台前 tab（整排联动滑动） ─────────────────────────────────────────
  function switchGroup(newId) {
    const newIdx = allTabs.findIndex(t => t.id === newId);
    if (newIdx < 0) return;
    Animated.spring(positionAnim, {
      toValue:         newIdx,
      useNativeDriver: true,
      tension:         120,
      friction:        14,
    }).start();
    setActiveGrp(newId);
  }
  // 同步 ref，供 PanResponder 使用
  allTabsRef.current   = allTabs;
  switchGrpRef.current = switchGroup;

  // ── 横划手势切换 tab ──────────────────────────────────────────────────────
  // PanResponder 挂在 root View，利用 onMoveShouldSetPanResponder（非 capture）
  // 让 FlatList 先处理垂直滚动；只有明显横向手势才接管。
  // 第一个 tab 向右滑时不拦截，避免与 React Navigation 的返回手势冲突。
  const tabSwipePan = useRef(PanResponder.create({
    // 不在 touch 开始时抢夺，只在移动中根据方向判断
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => {
      const absDx = Math.abs(g.dx);
      const absDy = Math.abs(g.dy);
      // 必须足够水平（dx:dy 比 > 2.5），否则交给 FlatList 处理垂直滚动
      if (absDx < 12 || absDx < absDy * 2.5) return false;
      const tabs = allTabsRef.current;
      if (tabs.length <= 1) return false;
      const cur = tabs.findIndex(t => t.id === activeGrpRef.current);
      // 在第一个 tab 往右划 → 不拦截，让 React Navigation back-swipe 正常工作
      if (g.dx > 0 && cur === 0) return false;
      // 在最后一个 tab 往左划 → 无处可去，不拦截
      if (g.dx < 0 && cur === tabs.length - 1) return false;
      return true;
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 40) return;
      const tabs = allTabsRef.current;
      const cur  = tabs.findIndex(t => t.id === activeGrpRef.current);
      if (g.dx < 0 && cur < tabs.length - 1) switchGrpRef.current?.(tabs[cur + 1].id);
      else if (g.dx > 0 && cur > 0)          switchGrpRef.current?.(tabs[cur - 1].id);
    },
    // 被其他手势打断时不做任何操作（保留当前 tab）
    onPanResponderTerminate: () => {},
  })).current;

  // ── 数据加载 ──────────────────────────────────────────────────────────────

  useFocusEffect(useCallback(() => { refresh(); }, []));

  async function refresh() {
    const [w, g, lang] = await Promise.all([loadWords(), loadGroups(), loadLang()]);
    setWords([...w].sort((a, b) => a.word.localeCompare(b.word)));
    setGroups(g);
    if (initGroupId === null) {
      if (prevLangRef.current !== null && prevLangRef.current !== lang) {
        setActiveGrp(null);
      }
      prevLangRef.current = lang;
      setCurrentLang(lang);
    }
  }

  // ── 删除 ──────────────────────────────────────────────────────────────────

  function handleDeleteWord(item) {
    setModal({
      title: '删除单词', message: `确认删除「${item.word}」？`,
      confirmLabel: '删除', destructive: true,
      onConfirm: async () => {
        const updated = words.filter(w => !(w.word === item.word && w.lang === item.lang));
        await saveWords(updated);
        setWords(updated);
        toastRef.current?.show(`已删除「${item.word}」`, 'info');
      },
    });
  }

  function handleDeleteGroup(g) {
    setModal({
      title: '删除分组', message: `删除「${g.name}」？该组单词将移回未分组。`,
      confirmLabel: '删除', destructive: true,
      onConfirm: async () => {
        await deleteGroup(g.id);
        if (activeGrp === g.id) switchGroup(null);
        refresh();
        toastRef.current?.show(`已删除分组「${g.name}」`, 'info');
      },
    });
  }

  async function handleCreateGroup() {
    const name = newGrpName.trim();
    if (!name) return;
    await addGroup(name, currentLang);
    setNewGrpName('');
    setShowNewGrp(false);
    refresh();
  }

  // ── 过滤 ──────────────────────────────────────────────────────────────────

  const filtered = words.filter(w => {
    const matchLang  = initGroupId !== null || !currentLang || w.lang === currentLang;
    const matchGroup = activeGrp === null || w.groupId === activeGrp;
    const matchQuery = !query.trim() ||
      w.word.toLowerCase().includes(query.toLowerCase()) ||
      getWordDef(w).includes(query);
    return matchLang && matchGroup && matchQuery;
  });

  const showInlineTitle = initGroupId === null && !route.params?.groupName;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]} onTouchStart={onActivity} {...tabSwipePan.panHandlers}>

      {/* ── 页眉：语言自称 + 词数副标题 + 搜索按钮 ── */}
      {showInlineTitle && (
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.title}>
              {LANG_NATIVE[currentLang] ?? currentLang ?? '…'}
            </Text>
            <Text style={s.countSubtitle}>
              {wordCountLabel(filtered.length, currentLang)}
            </Text>
          </View>
          <TouchableOpacity
            style={s.searchBtn}
            onPress={() => { setShowSearch(v => !v); if (showSearch) setQuery(''); }}
            activeOpacity={0.6}
          >
            <View style={s.magnifierIcon}>
              <View style={[s.magnifierCircle, showSearch && s.magnifierActive]} />
              <View style={[s.magnifierHandle, showSearch && s.magnifierHandleActive]} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 搜索输入栏 ── */}
      {showSearch && (
        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            placeholder="在语言中寻找…"
            placeholderTextColor={colors.text3}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <TouchableOpacity
            style={s.searchClose}
            onPress={() => { setShowSearch(false); setQuery(''); }}
          >
            <Text style={s.searchCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 分组 Carousel + 加号 ── */}
      <View style={s.filterRow}>

        {/* 走马灯区域：所有 tab 绝对定位，以容器中心为原点，按 positionAnim 整体联动 */}
        <View style={s.carouselContainer}>
          {allTabs.map((tab, i) => {
            const tf = tabTransforms[i];
            if (!tf) return null;
            return (
              <Animated.View
                key={tab.id === null ? '__all__' : String(tab.id)}
                style={[s.tabItem, {
                  transform: [{ translateX: tf.translateX }, { scale: tf.scale }],
                  opacity:   tf.opacity,
                }]}
              >
                <TouchableOpacity
                  style={s.tabTouchable}
                  onPress={() => switchGroup(tab.id)}
                  onLongPress={tab.id !== null ? () => {
                    const g = groups.find(gr => gr.id === tab.id);
                    if (g) handleDeleteGroup(g);
                  } : undefined}
                  activeOpacity={0.7}
                  onLayout={e => {
                    const w = Math.ceil(e.nativeEvent.layout.width);
                    setTabWidths(prev => prev[i] === w ? prev : { ...prev, [i]: w });
                  }}
                >
                  <Text style={[s.filterText, activeGrp === tab.id && s.filterTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* 加号 — 固定右端，略比 tab 名醒目 */}
        <TouchableOpacity
          style={s.filterAddBtn}
          onPress={() => setShowNewGrp(v => !v)}
          activeOpacity={0.5}
        >
          <Text style={s.filterAddText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* ── 新建分组输入 ── */}
      {showNewGrp && (
        <View style={s.newGrpRow}>
          <TextInput
            style={[s.search, { flex: 1 }]}
            value={newGrpName}
            onChangeText={setNewGrpName}
            placeholder="新分组名称…"
            placeholderTextColor={colors.text3}
            onSubmitEditing={handleCreateGroup}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity onPress={handleCreateGroup}>
            <Text style={s.newGrpBtn}>创建</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 单词列表 ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => `${item.lang}::${item.word}`}
        renderItem={({ item }) => {
          const senses  = getWordSenses(item);
          const example = senses[0]?.example?.trim();
          const def     = getWordDef(item);
          const gc      = GENDER_COLOR[item.gender];
          return (
            <TouchableOpacity
              style={s.item}
              onPress={() => navigation.navigate('EditWord', { word: item })}
              onLongPress={() => handleDeleteWord(item)}
              activeOpacity={0.5}
            >
              <View style={s.wordRow}>
                <Text style={s.word}>{item.word}</Text>
                {gc && item.gender !== 'none' && (
                  <View style={[s.genderDot, { backgroundColor: gc }]} />
                )}
              </View>
              {example ? (
                <View style={s.exampleBlock}>
                  <Text style={s.example} numberOfLines={2}>{`"${example}"`}</Text>
                </View>
              ) : null}
              {def ? (
                <Text style={s.def} numberOfLines={1}>{def}</Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddWord', { groupId: activeGrp })}>
        <View style={s.fabCross}>
          <View style={s.fabBarH} />
          <View style={s.fabBarV} />
        </View>
      </TouchableOpacity>

      <ConfirmModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel}
        destructive={modal?.destructive}
        onConfirm={() => { modal?.onConfirm(); setModal(null); }}
        onCancel={() => setModal(null)}
      />
      <Toast ref={toastRef} />
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    // ── 页眉 ──────────────────────────────────────────────────────────────
    header: {
      flexDirection:     'row',
      alignItems:        'flex-start',
      justifyContent:    'space-between',
      paddingHorizontal: 22,
      paddingTop:        24,
      paddingBottom:     6,
    },
    headerLeft: { flex: 1 },

    // 语言自称：换用 Georgia（秀气衬线），字距收窄
    title: {
      fontSize:      28,
      fontWeight:    '300',
      color:         colors.text,
      letterSpacing: 0.4,
      fontFamily:    Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    },
    countSubtitle: {
      fontSize:      12,
      fontWeight:    '400',
      color:         colors.text3,
      letterSpacing: 0.3,
      marginTop:     5,
    },

    // ── 放大镜按钮 ────────────────────────────────────────────────────────
    searchBtn: { padding: 10, marginRight: -6, marginTop: 2 },
    magnifierIcon: { width: 20, height: 20 },
    magnifierCircle: {
      position: 'absolute', top: 0, left: 0,
      width: 13, height: 13, borderRadius: 7,
      borderWidth: 1.5, borderColor: colors.text3,
    },
    magnifierHandle: {
      position: 'absolute', bottom: 0, right: 1,
      width: 1.5, height: 8, borderRadius: 1,
      backgroundColor: colors.text3,
      transform: [{ rotate: '-45deg' }],
    },
    magnifierActive:       { borderColor: colors.accent },
    magnifierHandleActive: { backgroundColor: colors.accent },

    // ── 搜索输入 ──────────────────────────────────────────────────────────
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 22, paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    search: {
      flex: 1, backgroundColor: 'transparent',
      paddingVertical: 8, paddingHorizontal: 0,
      color: colors.text, fontSize: 15,
    },
    searchClose:     { paddingLeft: 14, paddingVertical: 4 },
    searchCloseText: { fontSize: 13, color: colors.text3 },

    // ── 分组 Carousel ─────────────────────────────────────────────────────
    filterRow: {
      flexDirection: 'row',
      alignItems:    'center',
      height:        44,
      marginTop:     6,
      marginBottom:  4,
    },
    // Carousel 容器：overflow: hidden 把滑出去的 tab 裁掉
    carouselContainer: {
      flex:     1,
      height:   44,
      overflow: 'hidden',
    },
    // 每个 tab 绝对定位；left 锚定屏幕中心，translateX 再减去自身宽度的一半 = 视觉居中
    tabItem: {
      position:       'absolute',
      top:            0,
      bottom:         0,
      left:           SCREEN_W / 2,
      alignItems:     'center',
      justifyContent: 'center',
    },
    tabTouchable: {
      paddingHorizontal: TAB_PAD_H,
      paddingVertical:   12,
      alignItems:        'center',
      justifyContent:    'center',
    },
    filterText:       { fontSize: 14, color: colors.text3, letterSpacing: 0.2 },
    filterTextActive: { fontSize: 14, color: colors.text,  fontWeight: '500', letterSpacing: 0.2 },

    // 加号：固定右端，比 tab 名略微醒目（text3 vs tab inactive 动画到 ~0.14 opacity）
    filterAddBtn:  { paddingHorizontal: 16, paddingVertical: 12 },
    filterAddText: { fontSize: 17, color: colors.text3, fontWeight: '300', lineHeight: 20 },

    // ── 新建分组 ──────────────────────────────────────────────────────────
    newGrpRow: {
      flexDirection: 'row', gap: 14,
      paddingHorizontal: 22, paddingBottom: 8,
      alignItems: 'center',
    },
    newGrpBtn: { color: colors.accent, fontWeight: '500', fontSize: 13 },

    // ── 词条 ──────────────────────────────────────────────────────────────
    item: {
      paddingHorizontal: 20, paddingVertical: 24,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
      alignItems: 'center',
    },
    wordRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginBottom: 10,
    },
    genderDot: { width: 5, height: 5, borderRadius: 2.5, marginLeft: 8, marginTop: 2 },
    word: {
      color: colors.text, fontSize: 22, fontWeight: '400',
      fontFamily: 'serif', letterSpacing: 0.2, textAlign: 'center',
    },
    exampleBlock: { paddingHorizontal: 16, alignSelf: 'stretch', marginBottom: 6 },
    example: {
      color: colors.text2, fontSize: 14, fontFamily: 'Lora_400Regular_Italic',
      lineHeight: 22, letterSpacing: 0.05, textAlign: 'center',
    },
    def: { color: colors.text3, fontSize: 12, lineHeight: 17, textAlign: 'center' },

    // ── FAB ───────────────────────────────────────────────────────────────
    fab: {
      position: 'absolute', right: 20, bottom: 24,
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: colors.overlay,
      alignItems: 'center', justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2, shadowRadius: 3,
    },
    fabCross: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    fabBarH:  { position: 'absolute', width: 18, height: 1.5, borderRadius: 1, backgroundColor: colors.text2 },
    fabBarV:  { position: 'absolute', width: 1.5, height: 18, borderRadius: 1, backgroundColor: colors.text2 },
  });
}
