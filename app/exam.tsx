import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAlert } from '@/template';
import { EXAM_FAIL_THRESHOLD } from '@/constants/exam';
import { ScaledText as Text } from '@/components/ui/ScaledText';

const PART_A_COUNT = 30;
const PART_B_COUNT = 35;
const TOTAL_QUESTIONS = PART_A_COUNT + PART_B_COUNT;
const TIME_LIMIT_MINUTES = 45;

const EXAM_RULES = [
  { icon: 'timer' as const, text: `考試限時 ${TIME_LIMIT_MINUTES} 分鐘` },
  { icon: 'format-list-numbered' as const, text: `共 ${TOTAL_QUESTIONS} 題（甲部 ${PART_A_COUNT} 題 + 乙部 ${PART_B_COUNT} 題）` },
  { icon: 'arrow-back' as const, text: '可返回及跳過任何題目' },
  { icon: 'block' as const, text: '提交前不顯示答案正誤' },
  { icon: 'cancel' as const, text: `任何一部分錯誤達 ${EXAM_FAIL_THRESHOLD} 題或以上即為不合格；甲部及乙部均須合格` },
];

export default function ExamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const handleStartExam = () => {
    showAlert(
      '確認開始考試？',
      `考試開始後計時器將立即啟動，限時 ${TIME_LIMIT_MINUTES} 分鐘。\n\n共 ${TOTAL_QUESTIONS} 題，提交後不可更改。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '開始考試',
          onPress: () => {
            router.push({
              pathname: '/quiz',
              params: {
                quizMode: 'EXAM',
                title: '模擬考試',
                timeLimitMinutes: String(TIME_LIMIT_MINUTES),
                isExam: '1',
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>模擬考試</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialIcons name="assignment" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>模擬考試</Text>
          <Text style={styles.heroSubtitle}>
            包含 {PART_A_COUNT} 題 甲部：的士及網約車營運{'\n'}
            和 {PART_B_COUNT} 題 乙部：道路使用者守則
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{TOTAL_QUESTIONS}</Text>
              <Text style={styles.statLabel}>總題數</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{TIME_LIMIT_MINUTES}</Text>
              <Text style={styles.statLabel}>分鐘限時</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>考試部份</Text>
            </View>
          </View>
        </View>

        {/* Section breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>考試結構</Text>

          <View style={styles.partRow}>
            <View style={[styles.partBadge, { backgroundColor: `${Colors.primary}18`, borderColor: `${Colors.primary}35` }]}>
              <Text style={[styles.partBadgeLabel, { color: Colors.primary }]}>甲部</Text>
            </View>
            <View style={styles.partInfo}>
              <Text style={styles.partTitle}>的士及網約車營運</Text>
              <Text style={styles.partCount}>{PART_A_COUNT} 題</Text>
            </View>
          </View>

          <View style={styles.partSeparator}>
            <View style={styles.partSeparatorLine} />
            <Text style={styles.partSeparatorText}>+</Text>
            <View style={styles.partSeparatorLine} />
          </View>

          <View style={styles.partRow}>
            <View style={[styles.partBadge, { backgroundColor: `${Colors.accent}18`, borderColor: `${Colors.accent}35` }]}>
              <Text style={[styles.partBadgeLabel, { color: Colors.accent }]}>乙部</Text>
            </View>
            <View style={styles.partInfo}>
              <Text style={styles.partTitle}>道路使用者守則</Text>
              <Text style={styles.partCount}>{PART_B_COUNT} 題</Text>
            </View>
          </View>
        </View>

        {/* Rules */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <MaterialIcons name="rule" size={18} color={Colors.textSecondary} />
            <Text style={styles.rulesTitle}>考試規則</Text>
          </View>
          {EXAM_RULES.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={styles.ruleIconWrap}>
                <MaterialIcons name={rule.icon} size={16} color={Colors.textMuted} />
              </View>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        {/* Pass/Fail rule highlight */}
        <View style={styles.passFailCard}>
          <MaterialIcons name="info" size={20} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.passFailTitle}>合格標準</Text>
            <Text style={styles.passFailDesc}>
              甲部及乙部各自錯誤 {EXAM_FAIL_THRESHOLD - 1} 題或以下為合格。{'\n'}
              任何一部分錯誤達 {EXAM_FAIL_THRESHOLD} 題或以上即為不合格。{'\n'}
              兩部分均合格，整體考試才算合格。
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
          ]}
          onPress={handleStartExam}
        >
          <MaterialIcons name="play-arrow" size={24} color={Colors.textOnPrimary} />
          <Text style={styles.startBtnText}>開始模擬考試</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  headerRight: { width: 40 },

  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  heroCard: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}35`,
    ...Shadows.card,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
    includeFontPadding: false,
  },
  heroSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.primary,
    includeFontPadding: false,
  },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 0.3 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.surfaceBorder },

  sectionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.card,
  },
  sectionCardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  partBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  partBadgeLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  partInfo: { flex: 1 },
  partTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  partCount: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  partSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  partSeparatorLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
  partSeparatorText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
  },

  rulesCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.card,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  rulesTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ruleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ruleText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  passFailCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: `${Colors.warning}12`,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.warning}30`,
  },
  passFailTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.warning,
    marginBottom: 4,
  },
  passFailDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadows.elevated,
  },
  startBtnText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
