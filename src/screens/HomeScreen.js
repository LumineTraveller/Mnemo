import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDueWords, loadLang, loadSettings } from '../utils/storage';
import { useInactivityBars } from '../utils/useInactivityBars';
import { colors, spacing } from '../utils/theme';
import { getGreeting } from '../utils/greetings';

const LANG_NATIVE = {
  German: 'Deutsch', French: 'Français', Spanish: 'Español',
  Italian: 'Italiano', Japanese: '日本語', Korean: '한국어',
  Portuguese: 'Português', Russian: 'Русский', English: 'English',
};

export default function HomeScreen({ navigation }) {
  const [due, setDue] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [lang, setLang] = useState('German');

  const dueRef = useRef(0);
  const langRef = useRef('German');

  const greetAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  const { onActivity } = useInactivityBars();

  useFocusEffect(useCallback(() => {
    refresh();
    return () => { setGreeting(''); };
  }, []));

  useEffect(() => {
    if (!greeting) return;
    greetAnim.setValue(0);
    ctaAnim.setValue(0);
    Animated.sequence([
      Animated.timing(greetAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(ctaAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [greeting]);

  async function refresh() {
    const [currentLang, settings] = await Promise.all([loadLang(), loadSettings()]);
    const dueWords = await getDueWords(currentLang, settings.dailyLimit);
    setLang(currentLang);
    setDue(dueWords.length);
    setGreeting(getGreeting(currentLang));
    dueRef.current = dueWords.length;
    langRef.current = currentLang;
  }

  function handleTap() {
    if (dueRef.current > 0) {
      navigation.navigate('Study', { lang: langRef.current });
    }
  }

  const s = useMemo(makeStyles, []);

  const isCJK = lang === 'Japanese' || lang === 'Korean';

  // 拆分引用正文和出处（格式：「quote」\n— Author）
  const greetParts = greeting.split('\n');
  const mainLine   = greetParts[0] || '';
  const sourceLine = greetParts.length > 1 ? greetParts.slice(1).join('\n') : null;

  const mainStyle = isCJK
    ? { fontSize: 26, color: colors.text, textAlign: 'center', lineHeight: 40, fontWeight: '300', letterSpacing: 0 }
    : s.greeting;

  const animStyle = {
    opacity:   greetAnim,
    transform: [{ translateY: greetAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    <Pressable style={s.root} onPress={handleTap} onTouchStart={onActivity}>

      <Animated.Text style={[s.langLabel, { opacity: greetAnim }]}>
        {LANG_NATIVE[lang] || lang}
      </Animated.Text>

      <View style={s.greetingZone}>
        <Animated.Text style={[mainStyle, animStyle]}>
          {mainLine}
        </Animated.Text>
        {sourceLine ? (
          <Animated.Text style={[s.source, animStyle]}>
            {sourceLine}
          </Animated.Text>
        ) : null}
      </View>

      <Animated.View style={[s.ctaZone, { opacity: ctaAnim }]}>
        {due > 0 ? (
          <>
            <Text style={s.ctaText}>开始今天的学习</Text>
            <Text style={s.ctaCount}>{due} 个单词等待复习</Text>
            <View style={s.ctaRule} />
          </>
        ) : (
          <Text style={s.ctaDone}>今日已全部复习完成</Text>
        )}
      </Animated.View>

    </Pressable>
  );
}

function makeStyles() { return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  langLabel: {
    position: 'absolute',
    top: spacing.xl + 8,
    alignSelf: 'center',
    fontSize: 11,
    color: colors.text3,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  greetingZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    gap: 10,
  },
  greeting: {
    fontSize: 30,
    fontFamily: 'Lora_400Regular_Italic',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 44,
  },
  source: {
    fontSize: 12,
    color: colors.text3,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  ctaZone: {
    alignItems: 'center',
    paddingBottom: spacing.xxl + spacing.lg,
  },
  ctaText: { fontSize: 14, color: colors.text3, letterSpacing: 0.6 },
  ctaCount: { fontSize: 11, color: colors.text3, opacity: 0.5, marginTop: 4 },
  ctaRule: { marginTop: 10, width: 32, height: 1, backgroundColor: colors.text3, opacity: 0.25 },
  ctaDone: { fontSize: 13, color: colors.text3, opacity: 0.4 },
}); }
