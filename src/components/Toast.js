/**
 * MD3-style bottom snackbar toast.
 *
 * Usage (in any screen):
 *
 *   const toastRef = useRef();
 *   <Toast ref={toastRef} />
 *   toastRef.current?.show('保存成功', 'success');
 *
 * Types: 'success' | 'error' | 'info'
 *
 * Error toasts automatically copy the full message to clipboard
 * and show a "已复制" badge.
 */

import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, spacing } from '../utils/theme';
import { loadSettings } from '../utils/storage';

const DURATION = 3200; // slightly longer for errors so user can read

const TYPE_STYLE = () => ({
  success: { bg: colors.overlay, border: colors.green,  icon: '✓', iconColor: colors.green },
  error:   { bg: colors.overlay, border: colors.red,    icon: '✕', iconColor: colors.red   },
  info:    { bg: colors.overlay, border: colors.accent, icon: '·', iconColor: colors.accent },
});

const Toast = forwardRef(function Toast(_, ref) {
  const styles = useMemo(makeStyles, []);
  const [message,  setMessage]  = useState('');
  const [type,     setType]     = useState('info');
  const [copied,   setCopied]   = useState(false);
  const anim     = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    show(msg, t = 'info') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(msg);
      setType(t);
      setCopied(false);

      // Auto-copy error messages to clipboard (if enabled in settings)
      if (t === 'error') {
        loadSettings().then(s => {
          if (s.copyErrorToClipboard !== false) {
            Clipboard.setStringAsync(msg).then(() => setCopied(true));
          }
        });
      }

      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      }, DURATION);
    },
  }));

  const ts = TYPE_STYLE()[type] || TYPE_STYLE()['info'];
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: ts.bg,
          borderColor:     ts.border,
          opacity:         anim,
          transform:       [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.icon, { color: ts.iconColor }]}>{ts.icon}</Text>
      <Text style={styles.msg}>{message}</Text>
      {type === 'error' && copied && (
        <View style={styles.copiedBadge}>
          <Text style={styles.copiedText}>已复制</Text>
        </View>
      )}
    </Animated.View>
  );
});

export default Toast;

function makeStyles() { return StyleSheet.create({
  wrap: {
    position:          'absolute',
    bottom:            spacing.xl,
    left:              spacing.lg,
    right:             spacing.lg,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderRadius:      radius.lg,
    borderWidth:       1,
    zIndex:            9999,
    elevation:         16,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 6 },
    shadowOpacity:     0.25,
    shadowRadius:      8,
  },
  icon: { fontSize: 16, fontWeight: '700', width: 20, textAlign: 'center' },
  msg:  { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },

  copiedBadge: {
    backgroundColor: colors.red + '33',
    borderRadius:    radius.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:     1,
    borderColor:     colors.red + '55',
  },
  copiedText: { fontSize: 11, color: colors.red, fontWeight: '600' },
}); }
