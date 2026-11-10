import { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';
import { useFontSize } from '@/hooks/useFontSize';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface AppVersionNoticeProps {
  title?: string;
}

export const AppVersionNotice = memo(function AppVersionNotice({ title = '版本提示' }: AppVersionNoticeProps) {
  const { installedVersion, latestVersion, dismiss } = useAppVersionCheck();
  const { fs } = useFontSize();
  const bodySize = fs(Typography.base);
  const bodyStyle = { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) };

  return (
    <Modal
      visible={latestVersion !== null}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card} accessibilityViewIsModal>
              <View style={styles.header}>
                <MaterialIcons name="system-update" size={Typography.xxxl} color={Colors.primaryDark} />
                <Text accessibilityRole="header" style={[styles.title, { fontSize: fs(Typography.xl) }]}>
                  {title}
                </Text>
                <Pressable
                  onPress={dismiss}
                  style={({ pressed }) => [styles.closeButton, pressed ? styles.secondaryPressed : null]}
                  accessibilityRole="button"
                  accessibilityLabel="關閉版本提示"
                >
                  <MaterialIcons name="close" size={Typography.xxl} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.body, bodyStyle]}>
                您的應用程式版本與伺服器提供的版本不同。您可以更新應用程式，或繼續使用目前版本。
              </Text>

              <View style={styles.versions}>
                <View style={styles.versionRow}>
                  <Text style={[styles.versionLabel, bodyStyle]}>目前版本</Text>
                  <Text style={[styles.versionValue, bodyStyle]}>{installedVersion}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.versionRow}>
                  <Text style={[styles.versionLabel, bodyStyle]}>伺服器版本</Text>
                  <Text style={[styles.versionValue, bodyStyle]}>{latestVersion ?? ''}</Text>
                </View>
              </View>

              <Pressable
                onPress={dismiss}
                style={({ pressed }) => [styles.continueButton, pressed ? styles.primaryPressed : null]}
                accessibilityRole="button"
                accessibilityLabel="關閉提示並繼續使用目前版本"
              >
                <Text style={[styles.continueText, { fontSize: fs(Typography.base) }]}>
                  繼續使用目前版本
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
    includeFontPadding: false,
  },
  closeButton: {
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { color: Colors.textSecondary, includeFontPadding: false },
  versions: {
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  versionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  versionLabel: { flex: 1, color: Colors.textSecondary, includeFontPadding: false },
  versionValue: {
    flex: 1,
    textAlign: 'right',
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
    includeFontPadding: false,
  },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder },
  continueButton: {
    minHeight: Spacing.xxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  secondaryPressed: { opacity: 0.65 },
  primaryPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
