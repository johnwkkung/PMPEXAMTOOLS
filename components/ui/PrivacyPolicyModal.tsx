import { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { privacyPolicyText } from '@/constants/privacyPolicy';
import { useFontSize } from '@/hooks/useFontSize';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal = memo(function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  const insets = useSafeAreaInsets();
  const { fs } = useFontSize();
  const bodySize = fs(Typography.base);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.md }]}>
        <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.md }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="lock" size={Typography.xl} color={Colors.primary} />
              <Text style={[styles.title, { fontSize: fs(Typography.lg) }]} accessibilityRole="header">私隱條款</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="關閉私隱條款"
              hitSlop={{ top: Spacing.sm, bottom: Spacing.sm, left: Spacing.sm, right: Spacing.sm }}
            >
              <MaterialIcons name="close" size={Typography.xxl} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Text style={[styles.body, { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) }]}>
              {privacyPolicyText}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '85%',
    width: '100%',
    flexShrink: 0,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { flexShrink: 1, fontWeight: Typography.bold, color: Colors.textPrimary, includeFontPadding: false },
  closeButton: {
    flexShrink: 0,
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pressed: { opacity: 0.6 },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: Spacing.lg },
  body: { color: Colors.textSecondary, includeFontPadding: false, flexShrink: 0 },
});
