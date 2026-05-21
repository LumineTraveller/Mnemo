/**
 * MD3-style confirmation modal — replaces Alert.alert for destructive actions.
 *
 * Usage:
 *   const [modal, setModal] = useState(null);
 *   <ConfirmModal
 *     visible={!!modal}
 *     title={modal?.title}
 *     message={modal?.message}
 *     confirmLabel={modal?.confirmLabel || '确认'}
 *     destructive={modal?.destructive}
 *     onConfirm={() => { modal?.onConfirm(); setModal(null); }}
 *     onCancel={() => setModal(null)}
 *   />
 */

import React, { useMemo } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, radius, spacing } from '../utils/theme';

export default function ConfirmModal({
  visible = false,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel  = '取消',
  destructive  = false,
  onConfirm,
  onCancel,
}) {
  const s = useMemo(makeStyles, []);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              {title   ? <Text style={s.title}>{title}</Text>     : null}
              {message ? <Text style={s.message}>{message}</Text> : null}
              <View style={s.btnRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
                  <Text style={s.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, destructive && s.confirmBtnDestructive]}
                  onPress={onConfirm}
                >
                  <Text style={[s.confirmText, destructive && s.confirmTextDestructive]}>
                    {confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function makeStyles() { return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    padding:         spacing.lg + 4,
    width:           '100%',
    maxWidth:        340,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     colors.border,
    elevation:       16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.4,
    shadowRadius:    16,
  },
  title:   { fontSize: 17, fontWeight: '500', color: colors.text,  marginBottom: 8, letterSpacing: -0.1 },
  message: { fontSize: 14, color: colors.text2, lineHeight: 21, marginBottom: spacing.lg },
  btnRow:  { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },

  cancelBtn:  { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.full },
  cancelText: { fontSize: 14, color: colors.text3, fontWeight: '500' },

  confirmBtn:             { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.full, backgroundColor: colors.primaryContainer },
  confirmBtnDestructive:  { backgroundColor: colors.redBg, borderWidth: 1, borderColor: colors.red + '44' },
  confirmText:            { fontSize: 14, color: colors.onPrimaryContainer, fontWeight: '600' },
  confirmTextDestructive: { color: colors.red },
}); }
