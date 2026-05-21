import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { getDueWords, reviewWord } from '../utils/storage';
import { colors, radius } from '../utils/theme';

const { width } = Dimensions.get('window');
const GENDER_LABEL = { m: '阳性', f: '阴性', n: '中性' };

export default function ReviewScreen({ navigation, route }) {
  const groupId   = route.params?.groupId ?? null;
  const [queue, setQueue]     = useState([]);
  const [index, setIndex]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone]       = useState(false);
  const [correct, setCorrect] = useState(0);
  const s = useMemo(makeStyles, []);
  const GENDER_COLOR = { m: colors.genderM, f: colors.genderF, n: colors.genderN };
  const flipAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getDueWords(groupId).then(words => {
      setQueue([...words].sort(() => Math.random() - 0.5));
      if (words.length === 0) setDone(true);
    });
  }, []);

  function flip() {
    if (flipped) return;
    Animated.spring(flipAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    setFlipped(true);
  }

  async function handleRating(rating) {
    if (rating === 2) setCorrect(c => c + 1);
    await reviewWord(queue[index], rating);

    // 淡出再切换
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      flipAnim.setValue(0);
      setFlipped(false);
      if (index + 1 >= queue.length) {
        setDone(true);
      } else {
        setIndex(i => i + 1);
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  if (done) {
    const pct = queue.length ? Math.round(correct / queue.length * 100) : 0;
    return (
      <View style={s.center}>
        <View style={s.doneCard}>
          <Text style={s.doneIcon}>{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</Text>
          <Text style={s.doneTitle}>本轮完成</Text>
          <Text style={s.doneStat}>{correct} / {queue.length} 认识</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.donePct}>{pct}%</Text>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (queue.length === 0) return <View style={s.center}><Text style={s.loadingText}>加载中…</Text></View>;

  const card   = queue[index];
  const pctDone = (index / queue.length) * 100;
  const gColor  = GENDER_COLOR[card.gender] || null;

  return (
    <View style={s.container}>
      {/* 进度条 */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${pctDone}%` }]} />
      </View>
      <Text style={s.progressText}>{index + 1} / {queue.length}</Text>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
        {/* 正面 */}
        <Animated.View style={[s.card, { transform: [{ rotateY: frontRotate }] }, flipped && s.hidden]}>
          <Text style={s.cardLang}>{card.lang}</Text>
          {card.pos ? <Text style={s.cardPos}>{card.pos}</Text> : null}
          <Text style={s.cardWord}>{card.word}</Text>
          {gColor && (
            <View style={[s.genderBadge, { backgroundColor: gColor + '22' }]}>
              <Text style={[s.genderText, { color: gColor }]}>
                {GENDER_LABEL[card.gender]}
              </Text>
            </View>
          )}
          <Text style={s.tapHint}>点击翻转</Text>
        </Animated.View>

        {/* 背面 */}
        <Animated.View style={[s.card, s.cardBack, { transform: [{ rotateY: backRotate }] }, !flipped && s.hidden]}>
          <Text style={s.cardWord}>{card.word}</Text>
          {card.pos ? <Text style={s.cardPos}>{card.pos}</Text> : null}
          <Text style={s.cardDef}>{card.definition}</Text>
          {card.example ? <Text style={s.cardExample}>例：{card.example}</Text> : null}
        </Animated.View>
      </Animated.View>

      {!flipped ? (
        <TouchableOpacity style={s.flipBtn} onPress={flip}>
          <Text style={s.flipBtnText}>翻转查看</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.ratingRow}>
          <TouchableOpacity style={[s.ratingBtn, { backgroundColor: colors.errorBg, borderColor: colors.error + '44' }]} onPress={() => handleRating(0)}>
            <Text style={[s.ratingIcon, { color: colors.error }]}>✕</Text>
            <Text style={[s.ratingLabel, { color: colors.error }]}>不认识</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.ratingBtn, { backgroundColor: colors.amberBg, borderColor: colors.amber + '44' }]} onPress={() => handleRating(1)}>
            <Text style={[s.ratingIcon, { color: colors.amber }]}>△</Text>
            <Text style={[s.ratingLabel, { color: colors.amber }]}>模糊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.ratingBtn, { backgroundColor: colors.greenBg, borderColor: colors.green + '44' }]} onPress={() => handleRating(2)}>
            <Text style={[s.ratingIcon, { color: colors.green }]}>○</Text>
            <Text style={[s.ratingLabel, { color: colors.green }]}>认识</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const CARD_W = width - 48;

function makeStyles() { return StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg, alignItems: 'center', paddingTop: 12, paddingHorizontal: 24 },
  center:        { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  progressTrack: { width: '100%', height: 3, backgroundColor: colors.surface, borderRadius: 2, marginBottom: 8 },
  progressFill:  { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  progressText:  { color: colors.text3, fontSize: 12, marginBottom: 20 },

  card:          {
    width: CARD_W, minHeight: 280,
    backgroundColor: colors.bg3,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border2,
    alignItems: 'center', justifyContent: 'center',
    padding: 28,
    backfaceVisibility: 'hidden',
  },
  cardBack:      { backgroundColor: '#1a2d4a', borderColor: colors.accent + '33', position: 'absolute' },
  hidden:        { opacity: 0 },
  cardLang:      { position: 'absolute', top: 14, right: 16, color: colors.text3, fontSize: 11 },
  cardPos:       { color: colors.text3, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  cardWord:      { fontSize: 38, fontWeight: '700', color: colors.accent, textAlign: 'center', marginBottom: 10 },
  genderBadge:   { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 3 },
  genderText:    { fontSize: 12, fontWeight: '600' },
  tapHint:       { position: 'absolute', bottom: 14, color: colors.text3, fontSize: 11 },
  cardDef:       { fontSize: 22, color: colors.text, textAlign: 'center', lineHeight: 30, marginBottom: 10 },
  cardExample:   { fontSize: 13, color: colors.text3, fontStyle: 'italic', textAlign: 'center' },

  flipBtn:       { marginTop: 24, backgroundColor: colors.primaryContainer, borderRadius: radius.lg, paddingHorizontal: 48, paddingVertical: 14 },
  flipBtnText:   { color: colors.onPrimaryContainer, fontSize: 16, fontWeight: '600' },

  ratingRow:     { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  ratingBtn:     { flex: 1, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: 1 },
  ratingIcon:    { fontSize: 18, fontWeight: '700' },
  ratingLabel:   { fontSize: 12, fontWeight: '600' },

  doneCard:      { backgroundColor: colors.bg3, borderRadius: radius.xl, padding: 32, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: colors.border2, marginBottom: 20 },
  doneIcon:      { fontSize: 48, marginBottom: 12 },
  doneTitle:     { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
  doneStat:      { fontSize: 15, color: colors.text2, marginBottom: 16 },
  donePct:       { fontSize: 28, fontWeight: '700', color: colors.accent, marginTop: 8 },
  backBtn:       { backgroundColor: colors.primaryContainer, borderRadius: radius.lg, paddingHorizontal: 40, paddingVertical: 13 },
  backBtnText:   { color: colors.onPrimaryContainer, fontSize: 15, fontWeight: '600' },
  loadingText:   { color: colors.text3, fontSize: 14 },
}); }
