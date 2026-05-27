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
  const [sortBy,      setSortBy]      = useState('alpha'); // 'alpha' | 'familiarity'
  // Carousel 容器实测宽度，初始用屏宽估算

  const toastRef     = useRef();
  const prevLangRef  = useRef(null);
  // 代表"当前台前位置"的动画值：0 = 第一个 tab，1 = 第二个，以此类推
  const positionAnim = useRef(new Animated.Value(0)).current;
  // 每个 tab 的实测宽度（含 padding），onLayout 回调后更新
  const [tabWidths, setTabWidths] = useState({});

  const { onActivity } = useInactivityBars();

  // ── 手势 overlay 所需 ref（PanResponder.create 只调用一次，需 ref 避免闭包陈旧）──
  const carouselWidthRef   = useRef(200);
  const grantTimeRef       = useRef(0);
  const activeGrpRef       = useRef(null);
  const allTabsRef         = useRef([]);
  const switchGrpRef       = useRef(null);
  const groupsRef          = useRef([]);
  const refreshRef         = useRef(null);
  const gestureStartIdxRef = useRef(0);   // 手势起始时的 tab 索引
  const tabWidthsRef       = useRef({});  // 各 tab 实测宽度，供 move 计算步长

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
  // 每次 render 同步 ref（PanResponder 闭包里永远读最新值）
  activeGrpRef.current = activeGrp;
  allTabsRef.current   = allTabs;
  switchGrpRef.current = switchGroup;
  groupsRef.current    = groups;
  tabWidthsRef.current = tabWidths;

  // ── 手势 overlay PanResponder ──────────────────────────────────────────────
  // 放在 carouselContainer 内，用 absoluteFillObject 覆盖整个 carousel 区域。
  // 因为 overlay 自身没有任何子节点，onStartShouldSetPanResponder:true 可以
  // 无竞争地立即获得 responder，彻底规避新架构下的 capture/terminate 问题。
  // 点击、滑动、长按全部在此处理，底层 Animated.View tab 仅负责视觉渲染。
  const tabSwipePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,

    onPanResponderGrant: () => {
      grantTimeRef.current     = Date.now();
      gestureStartIdxRef.current = allTabsRef.current.findIndex(
        t => t.id === activeGrpRef.current
      );
      // 停止可能正在跑的 spring，让后续 setValue 立即生效
      positionAnim.stopAnimation();
    },

    // ── 实时跟手：把像素位移换算成 index 偏移，直接 setValue ─────────────
    onPanResponderMove: (_, g) => {
      const tabs     = allTabsRef.current;
      const startIdx = gestureStartIdxRef.current;
      const widths   = tabWidthsRef.current;
      if (tabs.length <= 1) return;

      // 一个 tab 步长 ≈ 当前 tab 半宽 + 间距 + 相邻 tab 半宽
      const neighborIdx = g.dx < 0
        ? Math.min(startIdx + 1, tabs.length - 1)
        : Math.max(startIdx - 1, 0);
      const stepPx = (widths[startIdx]    || DEFAULT_TAB_W) / 2
                   + TAB_GAP
                   + (widths[neighborIdx] || DEFAULT_TAB_W) / 2;

      // dx < 0（左划）→ index 增大；超出边界时施加 0.25 阻尼
      let raw = startIdx + (-g.dx / stepPx);
      if (raw < 0)               raw = raw * 0.25;
      if (raw > tabs.length - 1) raw = tabs.length - 1 + (raw - tabs.length + 1) * 0.25;

      positionAnim.setValue(raw);
    },

    onPanResponderRelease: (e, g) => {
      const absDx    = Math.abs(g.dx);
      const absDy    = Math.abs(g.dy);
      const dur      = Date.now() - grantTimeRef.current;
      const tabs     = allTabsRef.current;
      const startIdx = gestureStartIdxRef.current;

      // 弹到指定 index（从当前拖动位置平滑 spring 过去）
      const springTo = (idx) => Animated.spring(positionAnim, {
        toValue: idx, useNativeDriver: true, tension: 120, friction: 14,
      }).start();

      if (absDx >= 20 && absDx > absDy * 1.5) {
        // ── 横向滑动：切换相邻 tab ────────────────────────────────────────
        let targetIdx = startIdx;
        if (g.dx < 0 && startIdx < tabs.length - 1) targetIdx = startIdx + 1;
        else if (g.dx > 0 && startIdx > 0)          targetIdx = startIdx - 1;
        springTo(targetIdx);
        setActiveGrp(tabs[targetIdx].id);

      } else if (absDx < 10 && absDy < 10) {
        // ── 点击 / 长按 ───────────────────────────────────────────────────
        const x      = e.nativeEvent.locationX;
        // 活跃标签始终锚定在 SCREEN_W/2 处（tab 的 left 值），以此为中心判断左右
        const center  = SCREEN_W / 2;
        const isLeft  = x < center - 15;
        const isRight = x > center + 15;

        if (dur >= 500) {
          // 长按 → 弹回原位后弹出删除确认
          springTo(startIdx);
          let targetIdx = startIdx;
          if (isLeft  && startIdx > 0)               targetIdx = startIdx - 1;
          if (isRight && startIdx < tabs.length - 1) targetIdx = startIdx + 1;
          const target = tabs[targetIdx];
          if (target?.id !== null) {
            const grp = groupsRef.current.find(gr => gr.id === target.id);
            if (grp) {
              setModal({
                title: '删除分组',
                message: `删除「${grp.name}」？该组单词将移回未分组。`,
                confirmLabel: '删除', destructive: true,
                onConfirm: async () => {
                  await deleteGroup(grp.id);
                  if (activeGrpRef.current === grp.id) switchGrpRef.current?.(null);
                  refreshRef.current?.();
                  toastRef.current?.show(`已删除分组「${grp.name}」`, 'info');
                },
              });
            }
          }
        } else {
          // 短按（点击）→ 切换到目标 tab
          let targetIdx = startIdx;
          if (isLeft  && startIdx > 0)               targetIdx = startIdx - 1;
          else if (isRight && startIdx < tabs.length - 1) targetIdx = startIdx + 1;
          springTo(targetIdx);
          if (targetIdx !== startIdx) setActiveGrp(tabs[targetIdx].id);
        }

      } else {
        // 划了一点但不够 → 弹回原位
        springTo(startIdx);
      }
    },

    // 被系统打断（来电、系统手势等）→ 弹回原位
    onPanResponderTerminate: () => {
      Animated.spring(positionAnim, {
        toValue: gestureStartIdxRef.current,
        useNativeDriver: true, tension: 120, friction: 14,
      }).start();
    },
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
  refreshRef.current = refresh;

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

  // 熟悉度得分：ease 越低 + lapses 越多 = 越不熟（分越低）
  const displayed = useMemo(() => {
    if (sortBy === 'familiarity') {
      return [...filtered].sort((a, b) => {
        const sa = (a.ease || 2.5) - (a.lapses || 0) * 0.15;
        const sb = (b.ease || 2.5) - (b.lapses || 0) * 0.15;
        return sa - sb; // 从低到高
      });
    }
    return filtered;
  }, [filtered, sortBy]);

  const showInlineTitle = initGroupId === null && !route.params?.groupName;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]} onTouchStart={onActivity}>

      {/* ── 顶部区域 ── */}
      <View>

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
              style={s.sortBtn}
              onPress={() => setSortBy(v => v === 'alpha' ? 'familiarity' : 'alpha')}
              activeOpacity={0.6}
            >
              <Text style={[s.sortBtnText, sortBy === 'familiarity' && s.sortBtnActive]}>
                {sortBy === 'familiarity' ? '熟↑' : '熟'}
              </Text>
            </TouchableOpacity>
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
          <View
            style={s.carouselContainer}
            onLayout={e => { carouselWidthRef.current = e.nativeEvent.layout.width; }}
          >
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
                  {/* 仅负责布局测量和文字渲染，交互由下方 overlay 统一处理 */}
                  <View
                    style={s.tabTouchable}
                    onLayout={e => {
                      const w = Math.ceil(e.nativeEvent.layout.width);
                      setTabWidths(prev => prev[i] === w ? prev : { ...prev, [i]: w });
                    }}
                  >
                    <Text style={[s.filterText, activeGrp === tab.id && s.filterTextActive]}>
                      {tab.label}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}

            {/* 手势覆盖层：无子节点 → onStartShouldSetPanResponder:true 无竞争地接管触摸 */}
            <View style={StyleSheet.absoluteFillObject} {...tabSwipePan.panHandlers} />
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

      </View>{/* ── /顶部区域 ── */}

      {/* ── 单词列表 ── */}
      <FlatList
        data={displayed}
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

    // ── 排序按钮 ──────────────────────────────────────────────────────────
    sortBtn:       { padding: 10, marginTop: 2 },
    sortBtnText:   { fontSize: 12, color: colors.text3, letterSpacing: 0.3 },
    sortBtnActive: { color: colors.accent, fontWeight: '600' },

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
