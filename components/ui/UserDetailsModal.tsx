import { memo } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useFontSize } from '@/hooks/useFontSize';
import type { UserDetails } from '@/services/userManagerService';

interface UserDetailsModalProps {
  visible: boolean;
  loading: boolean;
  details: UserDetails | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

interface UserInfoFieldProps {
  label: string;
  value: string | null;
  prominent?: boolean;
  icon: 'person-outline' | 'mail-outline' | 'verified-user' | 'event' | 'event-available';
}

const UserInfoField = memo(function UserInfoField({ label, value, prominent = false, icon }: UserInfoFieldProps) {
  const { fs } = useFontSize();
  const size = Math.max(Typography.base, fs(prominent ? Typography.xl : Typography.base));
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <MaterialIcons name={icon} size={Typography.lg} color={Colors.primaryDark} />
        <Text style={[styles.label, { fontSize: fs(Typography.sm) }]}>{label}</Text>
      </View>
      <Text selectable style={[styles.value, prominent ? styles.prominentValue : null, { fontSize: size, lineHeight: Math.ceil(size * 1.6) }]}>
        {value || '未提供'}
      </Text>
    </View>
  );
});

export const UserDetailsModal = memo(function UserDetailsModal({
  visible, loading, details, error, onClose, onRetry,
}: UserDetailsModalProps) {
  const { fs } = useFontSize();
  const bodySize = Math.max(Typography.base, fs(Typography.base));
  const bodyStyle = { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <MaterialIcons name="account-circle" size={Typography.xxl} color={Colors.textOnPrimary} />
            <Text style={[styles.title, { fontSize: fs(Typography.lg) }]} accessibilityRole="header">會員資料</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="關閉會員資料"
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <MaterialIcons name="close" size={Typography.xxl} color={Colors.textOnPrimary} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {loading ? (
              <View style={styles.state} accessibilityLiveRegion="polite">
                <ActivityIndicator size="large" color={Colors.primaryDark} />
                <Text style={[styles.body, bodyStyle]}>正在讀取會員資料...</Text>
              </View>
            ) : error ? (
              <View style={styles.state}>
                <MaterialIcons name="error-outline" size={Spacing.xxl} color={Colors.error} />
                <Text style={[styles.error, bodyStyle]} accessibilityRole="alert">{error}</Text>
                <Pressable
                  onPress={onRetry}
                  accessibilityRole="button"
                  accessibilityLabel="重新讀取會員資料"
                  style={({ pressed }) => [styles.retryButton, pressed ? styles.primaryPressed : null]}
                >
                  <MaterialIcons name="refresh" size={Typography.xl} color={Colors.textOnPrimary} />
                  <Text style={[styles.retryText, { fontSize: bodySize }]}>重試</Text>
                </Pressable>
              </View>
            ) : details ? (
              <>
                <View style={styles.summary}>
                  <MaterialIcons name={details.isVip ? 'star' : 'person-outline'} size={Typography.xxl} color={Colors.primaryDark} />
                  <Text style={[styles.summaryText, bodyStyle]}>以下為您的最新會員資料</Text>
                </View>
                <UserInfoField label="用戶名稱" value={details.username} icon="person-outline" prominent />
                <UserInfoField label="電郵地址" value={details.userEmail} icon="mail-outline" />
                <UserInfoField label="會員級別" value={details.userLevel} icon="verified-user" />
                {details.isVip ? (
                  <>
                    <UserInfoField label="註冊日期" value={details.registerDate} icon="event" />
                    <UserInfoField label="到期日期" value={details.expiryDate} icon="event-available" />
                  </>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  panel: { height: '96%', width: '100%', maxWidth: Spacing.xxl * 16, borderRadius: Radius.xl, backgroundColor: Colors.background, overflow: 'hidden', ...Shadows.elevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.primaryDark, flexShrink: 0 },
  title: { flex: 1, fontWeight: Typography.bold, color: Colors.textOnPrimary, includeFontPadding: false },
  closeButton: { width: Spacing.xxl, height: Spacing.xxl, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated },
  summaryText: { flex: 1, color: Colors.textSecondary, fontWeight: Typography.medium, includeFontPadding: false },
  field: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { color: Colors.textSecondary, fontWeight: Typography.medium, includeFontPadding: false },
  value: { color: Colors.textPrimary, fontWeight: Typography.medium, includeFontPadding: false },
  prominentValue: { fontWeight: Typography.bold },
  state: { minHeight: Spacing.xxl * 4, paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  body: { color: Colors.textSecondary, includeFontPadding: false },
  error: { color: Colors.error, textAlign: 'center', includeFontPadding: false },
  retryButton: { width: '100%', minHeight: Spacing.xxl, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primaryDark },
  retryText: { color: Colors.textOnPrimary, fontWeight: Typography.semibold, includeFontPadding: false },
  pressed: { opacity: 0.65 },
  primaryPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
