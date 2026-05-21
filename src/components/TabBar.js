/**
 * Custom animated tab bar — works with createMaterialTopTabNavigator.
 * Receives: state, descriptors, navigation, position (Animated.Value, 0→1→2…)
 *
 * All tabs: slides in on focus, auto-sinks after 3.5 s on inactivity.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, Easing, DeviceEventEmitter } from 'react-native';
import { colors, radius } from '../utils/theme';

const TAB_ICONS   = { '首页': '⌂', '单词本': '≡', '设置': '⚙' };
const TAB_HEIGHT  = 58;
const SINK_DELAY  = 3500;   // 与 HomeScreen 状态栏收起时间保持一致

export default function TabBar({ state, navigation }) {
  const s = useMemo(makeStyles, []);
  const translateY = useRef(new Animated.Value(TAB_HEIGHT)).current;
  const timerRef   = useRef(null);

  const currentRoute = state.routes[state.index]?.name;
  const isHome       = currentRoute === '首页';

  // 滑入并启动收起倒计时
  function showAndScheduleSink() {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(translateY, {
      toValue:  0,
      duration: 220,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(translateY, {
        toValue:  TAB_HEIGHT + 8,
        duration: 380,
        easing:   Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, SINK_DELAY);
  }

  // 路由切换时：进入首页重新计时，其他页面保持可见
  useEffect(() => {
    showAndScheduleSink();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentRoute]);

  // 任意 tab 有触摸活动时（各屏幕发出事件）：恢复显示并重置倒计时
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabActivity', () => {
      showAndScheduleSink();
    });
    return () => sub.remove();
  }, []);

  return (
    <Animated.View style={[s.bar, { transform: [{ translateY }] }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={s.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={[s.icon, focused && s.iconFocused]}>
              {TAB_ICONS[route.name] || '·'}
            </Text>
            <Text style={[s.label, focused && s.labelFocused]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

function makeStyles() { return StyleSheet.create({
  bar: {
    flexDirection:   'row',
    backgroundColor: colors.bg,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  colors.border,
    height:          TAB_HEIGHT,
    paddingBottom:   8,
  },
  tab:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon:         { fontSize: 18, color: colors.text3, opacity: 0.7 },
  iconFocused:  { color: colors.accent, opacity: 1 },
  label:        { fontSize: 10, color: colors.text3, fontWeight: '400', letterSpacing: 0.4, opacity: 0.7 },
  labelFocused: { color: colors.accent, fontWeight: '500', opacity: 1 },
}); }
