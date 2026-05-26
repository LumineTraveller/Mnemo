import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import { getDueWords, reviewWord, markMastered, loadLang, loadSettings, getWordSenses } from '../utils/storage';
import { colors, radius, spacing } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');

function HighlightedSentence({ sentence, word }) {
  const sentenceStyle = { fontSize: 16, color: colors.text2, lineHeight: 26, textAlign: 'center', fontStyle: 'italic' };
  const hlStyle = { color: colors.accentFg, fontWeight: '600', fontStyle: 'normal' };
  if (!sentence || !word) return <Text style={sentenceStyle}>{sentence || ''}</Text>;
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
  const parts = sentence.split(regex);
  return (
    <Text style={sentenceStyle}>
      {parts.map((p, i) =>
        regex.test(p)
          ? <Text key={i} style={hlStyle}>{p}</Text>
          : <Text key={i}>{p}</Text>
      )}
    </Text>
  );
}

export default function StudyScreen({ navigation, route }) {
  const st = useMemo(makeSt, []);
  const insets = useSafeAreaInsets();
  const RATING = [
    { key: 0, label: '不认识', color: colors.red,   bg: colors.redBg },
    { key: 1, label: '有印象', color: colors.amber,  bg: colors.amberBg },
    { key: 2, label: '认识',   color: colors.green,  bg: colors.greenBg },
  ];
  const langParam = route.params?.lang ?? null;

  const [queue,          setQueue]          = useState([]);
  const [cardIndex,      setCardIndex]      = useState(0);
  const [senseIndex,     setSenseIndex]     = useState(0);
  const [ratedSenses,    setRatedSenses]    = useState({}); // { idx: 0|1|2 }
  const [isMastered,     setIsMastered]     = useState(false);
  const [correct,        setCorrect]        = useState(0);
  const [done,           setDone]           = useState(false);

  // Animations
  const revealAnim     = useRef(new Animated.Value(0)).current;
  const cardAnim       = useRef(new Animated.Value(1)).current;
  const swipeHint      = useRef(new Animated.Value(0)).current;
  const swipeAnim      = useRef(new Animated.Value(0)).current;
  const senseSlideAnim = useRef(new Animated.Value(0)).current;

  // Stable refs for PanResponder callbacks
  const advanceRef        = useRef(null);
  const nextSenseRef      = useRef(null);
  const prevSenseRef      = useRef(null);
  const senseIdxRef       = useRef(0);
  const senseLenRef       = useRef(1);
  const ratedSensesRef    = useRef({});
  const isMasteredRef     = useRef(false);

  useEffect(() => {
    (async () => {
      const lang     = langParam || (await loadLang());
      const settings = await loadSettings();
      const words    = await getDueWords(lang, settings.dailyLimit);
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      if (shuffled.length === 0) setDone(true);
      else animateCardIn();
    })();
  }, []);

  function animateCardIn() {
    cardAnim.setValue(1);          // 保持不透明，靠位置遮蔽
    swipeAnim.setValue(SH);        // 从屏幕下方开始，彻底避免闪烁
    senseSlideAnim.setValue(0);
    Animated.spring(swipeAnim, {
      toValue:  0,
      friction: 9,
      tension:  60,
      useNativeDriver: true,
    }).start();
  }

  async function handleRating(ratingKey) {
    const idx = senseIdxRef.current;
    if (ratedSensesRef.current[idx] !== undefined) return; // 该义项已评过

    // 评分后才显示释义
    Animated.timing(revealAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();

    const newRated = { ...ratedSensesRef.current, [idx]: ratingKey };
    setRatedSenses(newRated);

    // 检查是否所有义项都已评分
    if (Object.keys(newRated).length === senseLenRef.current) {
      // 取最低分作为整词评分（最弱的义项决定复习优先级）
      const overallRating = Math.min(...Object.values(newRated));
      if (overallRating === 2) setCorrect(c => c + 1);
      await reviewWord(queue[cardIndex], overallRating);

      // 触发上滑提示动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(swipeHint, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(swipeHint, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      ).start();
    }
  }

  function switchSense(targetIdx) {
    setSenseIndex(targetIdx);
    // 若目标义项已评过则显示释义，否则隐藏
    revealAnim.setValue(ratedSensesRef.current[targetIdx] !== undefined ? 1 : 0);
  }

  function advanceToNextSense() {
    const nextIdx = senseIdxRef.current + 1;
    if (nextIdx >= senseLenRef.current) {
      Animated.spring(senseSlideAnim, { toValue: 0, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(senseSlideAnim, { toValue: -SW, duration: 220, useNativeDriver: true }).start(() => {
      switchSense(nextIdx);
      senseSlideAnim.setValue(SW * 0.45);
      Animated.spring(senseSlideAnim, { toValue: 0, friction: 9, useNativeDriver: true }).start();
    });
  }

  function retreatToPrevSense() {
    const prevIdx = senseIdxRef.current - 1;
    if (prevIdx < 0) {
      Animated.spring(senseSlideAnim, { toValue: 0, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(senseSlideAnim, { toValue: SW, duration: 220, useNativeDriver: true }).start(() => {
      switchSense(prevIdx);
      senseSlideAnim.setValue(-SW * 0.45);
      Animated.spring(senseSlideAnim, { toValue: 0, friction: 9, useNativeDriver: true }).start();
    });
  }

  function advanceCard() {
    const allDone = isMasteredRef.current ||
                    Object.keys(ratedSensesRef.current).length === senseLenRef.current;
    if (!allDone) {
      // 未完成评分时上滑 → 弹回原位（修复卡片消失 bug）
      Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true }).start();
      return;
    }

    // "太简单"路径：记录已掌握，并计入正确数
    if (isMasteredRef.current) {
      markMastered(queue[cardIndex]); // fire & forget
      setCorrect(c => c + 1);
    }

    Animated.timing(swipeAnim, { toValue: -SH, duration: 280, useNativeDriver: true }).start(() => {
      const next = cardIndex + 1;
      if (next >= queue.length) {
        setDone(true);
      } else {
        setCardIndex(next);
        setSenseIndex(0);
        setRatedSenses({});
        setIsMastered(false);
        revealAnim.setValue(0);
        swipeHint.setValue(0);
        animateCardIn();
      }
    });
  }

  function handleMastered() {
    const next = !isMasteredRef.current;
    setIsMastered(next);
    if (next) {
      // 触发上滑提示动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(swipeHint, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(swipeHint, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      ).start();
    } else {
      swipeHint.setValue(0);
    }
  }

  function handleReRateWrong() {
    const idx = senseIdxRef.current;
    if (ratedSensesRef.current[idx] === 0) return; // 已经是不认识，无需操作

    const prevAllRated = Object.keys(ratedSensesRef.current).length === senseLenRef.current;
    const prevOverall  = prevAllRated ? Math.min(...Object.values(ratedSensesRef.current)) : null;

    const newRated = { ...ratedSensesRef.current, [idx]: 0 };
    setRatedSenses(newRated);

    // 如果所有义项都已评过，重新提交评分
    if (prevAllRated) {
      reviewWord(queue[cardIndex], 0);
      // 之前如果全部正确计了分，现在要撤回
      if (prevOverall === 2) setCorrect(c => c - 1);
    }
  }

  // Sync refs every render
  useEffect(() => {
    advanceRef.current   = advanceCard;
    nextSenseRef.current = advanceToNextSense;
    prevSenseRef.current = retreatToPrevSense;
  });
  senseIdxRef.current    = senseIndex;
  ratedSensesRef.current = ratedSenses;
  isMasteredRef.current  = isMastered;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const ax = Math.abs(g.dx), ay = Math.abs(g.dy);
        return (ay > 8 && g.dy < 0 && ay > ax) ||
               (ax > 10 && ax > ay && senseLenRef.current > 1);
      },
      onPanResponderMove: (_, g) => {
        const ax = Math.abs(g.dx), ay = Math.abs(g.dy);
        if (ay > ax && g.dy < 0) swipeAnim.setValue(g.dy * 0.5);
        else if (ax > ay)        senseSlideAnim.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const ax = Math.abs(g.dx), ay = Math.abs(g.dy);
        if (ay > ax) {
          if (g.dy < -30) advanceRef.current?.();
          else Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true }).start();
        } else {
          if (g.dx < -30)     nextSenseRef.current?.();
          else if (g.dx > 30) prevSenseRef.current?.();
          else Animated.spring(senseSlideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    const total  = queue.length;
    const pct    = total ? Math.round((correct / total) * 100) : 0;
    const missed = total - correct;
    return (
      <View style={[st.doneRoot, { paddingTop: insets.top }]}>
        <View style={st.doneTopRule} />
        <Text style={st.doneLabel}>本轮完成</Text>
        <Text style={st.donePct}>{pct}</Text>
        <Text style={st.donePctUnit}>%</Text>
        <View style={st.doneMidRule} />
        <View style={st.doneStatRow}>
          <View style={st.doneStatItem}>
            <Text style={st.doneStatNum}>{correct}</Text>
            <Text style={st.doneStatLabel}>认识</Text>
          </View>
          <View style={st.doneStatDivider} />
          <View style={st.doneStatItem}>
            <Text style={[st.doneStatNum, missed > 0 && { color: colors.red }]}>{missed}</Text>
            <Text style={st.doneStatLabel}>待加强</Text>
          </View>
          <View style={st.doneStatDivider} />
          <View style={st.doneStatItem}>
            <Text style={st.doneStatNum}>{total}</Text>
            <Text style={st.doneStatLabel}>共计</Text>
          </View>
        </View>
        <TouchableOpacity style={st.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={st.doneBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (queue.length === 0) {
    return <View style={[st.doneRoot, { paddingTop: insets.top }]}><Text style={st.loadingText}>加载中…</Text></View>;
  }

  const card         = queue[cardIndex];
  const progress     = cardIndex / queue.length;
  const senses       = getWordSenses(card);
  const currentSense = senses[senseIndex] || senses[0];
  const multiSense   = senses.length > 1;
  const isRated      = ratedSenses[senseIndex] !== undefined;
  const allRated     = Object.keys(ratedSenses).length === senses.length;
  const pendingCount = senses.length - Object.keys(ratedSenses).length;

  senseLenRef.current = senses.length;

  const GENDER_COLOR = { m: colors.genderM, f: colors.genderF, n: colors.genderN };
  const GENDER_LABEL = { m: '阳性', f: '阴性', n: '中性' };
  const gColor = card.gender && card.gender !== 'none' ? GENDER_COLOR[card.gender] : null;

  return (
    <View style={[st.root, { paddingTop: insets.top }]} {...panResponder.panHandlers}>

      {/* 自定义返回键 */}
      <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
        <Text style={st.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* 进度条 */}
      <View style={st.progressTrack}>
        <Animated.View style={[st.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={st.progressText}>{cardIndex + 1} / {queue.length}</Text>

      {/* Card */}
      <Animated.View style={[st.cardArea, {
        opacity: cardAnim,
        transform: [
          { translateY: swipeAnim },
          { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          { translateX: senseSlideAnim },
        ],
      }]}>

        <View style={st.metaRow}>
          <Text style={st.metaLang}>{card.lang}</Text>
          {currentSense.pos ? <Text style={st.metaPos}>{currentSense.pos}</Text> : null}
          {gColor && (
            <View style={[st.genderBadge, { backgroundColor: gColor + '22' }]}>
              <Text style={[st.genderText, { color: gColor }]}>{GENDER_LABEL[card.gender]}</Text>
            </View>
          )}
          {multiSense && (
            <Text style={st.senseIndicator}>{senseIndex + 1} / {senses.length}</Text>
          )}
        </View>

        {currentSense.example ? (
          <View style={st.sentenceWrap}>
            <HighlightedSentence sentence={currentSense.example} word={card.word} />
          </View>
        ) : (
          <View style={st.sentenceWrap}>
            <Text style={st.sentencePlaceholder}>暂无例句</Text>
          </View>
        )}

        <Text style={st.word}>{card.word}</Text>

        <Animated.View style={[st.defWrap, {
          opacity:   revealAnim,
          transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}>
          <Text style={st.def}>{currentSense.definition}</Text>
        </Animated.View>

      </Animated.View>

      {/* Bottom zone */}
      <View style={st.ratingZone}>

        {/* Dots — multi-sense only */}
        {multiSense && (
          <View style={st.dotsRow}>
            {senses.map((_, i) => {
              const r = ratedSenses[i];
              const isCurrent = i === senseIndex;
              const dotColor = r !== undefined ? RATING[r].color : colors.border2;
              return (
                <View key={i} style={[
                  st.dot,
                  isCurrent && st.dotActive,
                  { backgroundColor: isCurrent ? colors.accent : dotColor },
                ]} />
              );
            })}
          </View>
        )}

        {isMastered ? (
          // 已标记太简单 → 直接上滑（✕取消 在下方，点它即可撤销）
          <Animated.View style={[st.swipeHintWrap, {
            opacity: swipeHint.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          }]}>
            <TouchableOpacity style={st.nextBtn} onPress={advanceCard}>
              <Text style={st.nextArrow}>↑</Text>
              <Text style={st.nextLabel}>上滑 / 下一个</Text>
            </TouchableOpacity>
          </Animated.View>

        ) : allRated ? (
          // 全部义项已评 → 上滑翻页
          <Animated.View style={[st.swipeHintWrap, {
            opacity: swipeHint.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          }]}>
            <TouchableOpacity style={st.nextBtn} onPress={advanceCard}>
              <Text style={st.nextArrow}>↑</Text>
              <Text style={st.nextLabel}>上滑 / 下一个</Text>
            </TouchableOpacity>
          </Animated.View>

        ) : isRated ? (
          // 当前义项已评，还有其他义项未评
          <View style={st.ratedBadgeWrap}>
            <View style={[st.ratedBadge, { borderColor: RATING[ratedSenses[senseIndex]].color + '66' }]}>
              <Text style={[st.ratedBadgeText, { color: RATING[ratedSenses[senseIndex]].color }]}>
                {RATING[ratedSenses[senseIndex]].label}
              </Text>
            </View>
            <Text style={st.ratedHint}>还有 {pendingCount} 个义项待评价，左右滑动切换</Text>
          </View>

        ) : (
          // 当前义项未评 → 评分按钮
          <View style={st.ratingRow}>
            {RATING.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[st.ratingBtn, { backgroundColor: r.bg, borderColor: r.color + '44' }]}
                onPress={() => handleRating(r.key)}
                activeOpacity={0.75}
              >
                <Text style={[st.ratingLabel, { color: r.color }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 误判修正 — 已评且评分 > 0 时才显示 */}
        {isRated && !isMastered && ratedSenses[senseIndex] > 0 && (
          <TouchableOpacity
            style={st.reRateBtn}
            onPress={handleReRateWrong}
            activeOpacity={0.7}
          >
            <Text style={st.reRateBtnText}>不认识</Text>
          </TouchableOpacity>
        )}

        {/* 太简单 / 取消 toggle */}
        <TouchableOpacity
          style={[st.tooEasyBtn, isMastered && st.tooEasyBtnOn]}
          onPress={handleMastered}
          activeOpacity={0.7}
        >
          <Text style={[st.tooEasyText, isMastered && st.tooEasyTextOn]}>
            {isMastered ? '✕  取消' : '太简单'}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

function makeSt() { return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  backBtn:     { paddingHorizontal: spacing.lg, paddingVertical: 6, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 26, color: colors.text2, lineHeight: 32 },

  progressTrack: { height: 7, backgroundColor: colors.surface, marginHorizontal: spacing.lg, borderRadius: 4, marginTop: 4 },
  progressFill:  { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  progressText:  { color: colors.text2, fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 10, marginBottom: 2 },

  cardArea:       { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: 20 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg, justifyContent: 'center' },
  metaLang:       { fontSize: 11, color: colors.text3, letterSpacing: 0.8, textTransform: 'uppercase' },
  metaPos:        { fontSize: 11, color: colors.text3, fontStyle: 'italic' },
  genderBadge:    { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  genderText:     { fontSize: 11, fontWeight: '600' },
  senseIndicator: { fontSize: 11, color: colors.text3, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },

  sentenceWrap:        { marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  sentence:            { fontSize: 16, color: colors.text2, lineHeight: 26, textAlign: 'center', fontStyle: 'italic' },
  sentenceHL:          { color: colors.accentFg, fontWeight: '600', fontStyle: 'normal' },
  sentencePlaceholder: { fontSize: 14, color: colors.text3, textAlign: 'center', fontStyle: 'italic' },

  word:          { fontSize: 48, fontWeight: '300', color: colors.text, textAlign: 'center', marginBottom: spacing.xl, letterSpacing: 1, fontFamily: 'Georgia' },
  defWrap:       { alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.sm, width: '100%' },
  def:           { fontSize: 20, color: colors.accentFg, textAlign: 'center', lineHeight: 30, fontWeight: '300' },
  // Bottom
  ratingZone:  { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl + 8, paddingTop: spacing.sm },
  ratingRow:   { flexDirection: 'row', gap: 10 },
  ratingBtn:   { flex: 1, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  ratingLabel: { fontSize: 14, fontWeight: '600' },

  // Already-rated state for current sense
  ratedBadgeWrap: { alignItems: 'center', gap: 8 },
  ratedBadge:     { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 18, paddingVertical: 8 },
  ratedBadgeText: { fontSize: 14, fontWeight: '600' },
  ratedHint:      { fontSize: 12, color: colors.text3, opacity: 0.6 },

  // Dots
  dotsRow:   { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 14 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border2 },
  dotActive: { width: 18, borderRadius: 3 },

  // Post-all-rated swipe hint
  swipeHintWrap: { alignItems: 'center' },
  nextBtn:       { alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  nextArrow:     { fontSize: 22, color: colors.text3, marginBottom: 4 },
  nextLabel:     { fontSize: 13, color: colors.text3 },

  // 误判修正
  reRateBtn:     { alignSelf: 'center', marginTop: 12, paddingHorizontal: 22, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.red + '55', backgroundColor: colors.redBg },
  reRateBtnText: { fontSize: 12, color: colors.red, fontWeight: '500' },

  // 太简单 toggle
  tooEasyBtn:    { alignSelf: 'center', marginTop: 10, paddingHorizontal: 22, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border2 },
  tooEasyBtnOn:  { borderColor: colors.amber + '88', backgroundColor: colors.amberBg },
  tooEasyText:   { fontSize: 12, color: colors.text3 },
  tooEasyTextOn: { color: colors.amber, fontWeight: '600' },

  // Done screen
  doneRoot:        { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  doneTopRule:     { width: 40, height: 1, backgroundColor: colors.border2, marginBottom: spacing.xl },
  doneLabel:       { fontSize: 11, color: colors.text3, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: spacing.lg },
  donePct:         { fontSize: 88, fontWeight: '200', color: colors.text, lineHeight: 96, letterSpacing: -2 },
  donePctUnit:     { fontSize: 18, color: colors.text3, fontWeight: '300', marginTop: -spacing.sm, marginBottom: spacing.lg },
  doneMidRule:     { width: '60%', height: 1, backgroundColor: colors.border2, marginBottom: spacing.lg },
  doneStatRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxl },
  doneStatItem:    { alignItems: 'center', paddingHorizontal: spacing.lg },
  doneStatNum:     { fontSize: 26, fontWeight: '300', color: colors.text, marginBottom: 4 },
  doneStatLabel:   { fontSize: 11, color: colors.text3, letterSpacing: 0.6 },
  doneStatDivider: { width: 1, height: 32, backgroundColor: colors.border2 },
  doneBtn:         { borderWidth: 1, borderColor: colors.border2, borderRadius: radius.full, paddingHorizontal: spacing.xl + 8, paddingVertical: 12 },
  doneBtnText:     { color: colors.text2, fontSize: 14, fontWeight: '500', letterSpacing: 0.4 },
  loadingText:     { color: colors.text3, fontSize: 14 },
}); }
