import { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { chineseTermsOfServiceText, englishTermsOfServiceText } from '@/constants/termsOfService';
import { useFontSize } from '@/hooks/useFontSize';

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal = memo(function TermsOfServiceModal({ visible, onClose }: TermsOfServiceModalProps) {
  const { fs } = useFontSize();
  const bodySize = fs(Typography.base);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <MaterialIcons name="description" size={Typography.xxl} color={Colors.textOnPrimary} />
            <Text style={[styles.title, { fontSize: fs(Typography.lg) }]} accessibilityRole="header">服務條款</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="關閉服務條款"
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <MaterialIcons name="close" size={Typography.xxl} color={Colors.textOnPrimary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Text selectable style={[styles.body, { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) }]}>
              {chineseTermsOfServiceText}
            </Text>
            <View style={styles.divider} accessible={false} />
            <Text selectable style={[styles.body, { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) }]}>
              {englishTermsOfServiceText}
            </Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  panel: {
    height: '94%',
    width: '100%',
    maxWidth: Spacing.xxl * 16,
    flexShrink: 0,
    borderRadius: Radius.xl,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryDark,
  },
  title: {
    flex: 1,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  closeButton: {
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.65 },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: Spacing.md },
  divider: {
    alignSelf: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.textSecondary,
    marginVertical: Spacing.lg,
  },
  body: {
    color: Colors.textSecondary,
    fontWeight: Typography.regular,
    includeFontPadding: false,
    flexShrink: 0,
  },
});
