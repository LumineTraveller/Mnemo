/**
 * useInactivityBars
 *
 * 3.5 秒无操作后自动隐藏系统状态栏和底部导航栏，
 * 任意触摸时恢复并重置计时。
 *
 * 返回值：
 *   onActivity  — 绑到根视图的 onTouchStart
 */

import { useRef, useCallback } from 'react';
import { StatusBar, Platform, DeviceEventEmitter } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useFocusEffect } from '@react-navigation/native';

const HIDE_DELAY = 3500;

export function useInactivityBars() {
  const timerRef = useRef(null);

  function hideBars() {
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('hidden');
  }

  function showBars() {
    StatusBar.setHidden(false, 'fade');
    if (Platform.OS === 'android') NavigationBar.setVisibilityAsync('visible');
  }

  function startTimer() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(hideBars, HIDE_DELAY);
  }

  function onActivity() {
    showBars();
    DeviceEventEmitter.emit('tabActivity');
    startTimer();
  }

  useFocusEffect(useCallback(() => {
    startTimer();
    return () => {
      clearTimeout(timerRef.current);
      showBars();
    };
  }, []));

  return { onActivity };
}
