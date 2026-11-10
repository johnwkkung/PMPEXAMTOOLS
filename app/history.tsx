import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useFontSize } from '@/hooks/useFontSize';
import type { HistoryEntry } from '@/services/quizManagerService';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fs } = useFontSize();

  const params = useLocalSearchParams<{
    title: string;
    isExam: string;
    accentColor: string;
    entries: string;
  }>();

  const title = params.title ?? '記錄';
  const isExam = params.isExam === '1';
  const accentColor = params.accentColor ?? Colors.accent;

  const entries: HistoryEntry[] = useMemo(() => {
    try {
      return JSON.parse(params.entries ?? '[]') as HistoryEntry[];
    } catch {
      return [];
    }
  }, [params.entries]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const isPass = (e: HistoryEntry) => e.status === 'pass';

  const renderItem = ({ item, index }: { item: HistoryEntry; index: number }) => (
    <View style={[
      styles.card,
      index % 2 === 0 ? styles.cardEven : null,
      isExam
        ? (isPass(item) ? styles.cardPassBorder : styles.cardFailBorder)
        : styles.cardPracBorder,
    ]}>
      {/* Row 1: index, date, result badge */}
      <View style={styles.cardTop}>
        <View style={[styles.indexBadge, { backgroundColor: `${accentColor}15` }]}>
          <Text style={[styles.indexText, { color: accentColor, fontSize: fs(Typography.xs) }]}>
            #{entries.length - index}
          </Text>
        </View>
        <View style={styles.dateWrap}>
          <MaterialIcons name="access-time" size={13} color={Colors.textMuted} />
          <Text style={[styles.dateText, { fontSize: fs(Typography.xs) }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        {isExam ? (
          <View style={[styles.resultBadge, isPass(item) ? styles.passBadge : styles.failBadge]}>
            <Text style={[styles.resultBadgeText, isPass(item) ? styles.passText : styles.failText, { fontSize: fs(10) }]}>
              {isPass(item) ? '合格' : '不合格'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Row 2: score summary */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreBlock, styles.scoreBlockCorrect]}>
          <MaterialIcons name="check-circle" size={18} color={Colors.success} />
          <Text style={[styles.scoreValue, { color: Colors.success, fontSize: fs(Typography.lg) }]}>
            {item.correct}
          </Text>
          <Text style={[styles.scoreLabel, { fontSize: fs(Typography.xs) }]}>正確</Text>
        </View>

        <View style={styles.scoreDivider} />

        <View style={[styles.scoreBlock, styles.scoreBlockWrong]}>
          <MaterialIcons name="cancel" size={18} color={Colors.error} />
          <Text style={[styles.scoreValue, { color: Colors.error, fontSize: fs(Typography.lg) }]}>
            {item.wrong}
          </Text>
          <Text style={[styles.scoreLabel, { fontSize: fs(Typography.xs) }]}>錯誤</Text>
        </View>

        {(item.correct + item.wrong) > 0 ? (
          <>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreBlock}>
              <MaterialIcons name="percent" size={18} color={accentColor} />
              <Text style={[styles.scoreValue, { color: accentColor, fontSize: fs(Typography.lg) }]}>
                {Math.round((item.correct / (item.correct + item.wrong)) * 100)}%
              </Text>
              <Text style={[styles.scoreLabel, { fontSize: fs(Typography.xs) }]}>正確率</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Row 3 (EXAM only): Part A/B breakdown */}
      {isExam && (item.wronga !== undefined || item.wrongb !== undefined) ? (
        <View style={styles.breakdownRow}>
          <View style={[styles.partBlock, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }]}>
            <Text style={[styles.partLabel, { color: accentColor, fontSize: fs(10) }]}>甲部</Text>
            <View style={styles.partScores}>
              <Text style={[styles.partCorrect, { fontSize: fs(Typography.xs) }]}>✓ {item.correcta ?? 0}</Text>
              <Text style={[styles.partWrong, { fontSize: fs(Typography.xs) }]}>✗ {item.wronga ?? 0}</Text>
            </View>
          </View>
          <View style={[styles.partBlock, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }]}>
            <Text style={[styles.partLabel, { color: accentColor, fontSize: fs(10) }]}>乙部</Text>
            <View style={styles.partScores}>
              <Text style={[styles.partCorrect, { fontSize: fs(Typography.xs) }]}>✓ {item.correctb ?? 0}</Text>
              <Text style={[styles.partWrong, { fontSize: fs(Typography.xs) }]}>✗ {item.wrongb ?? 0}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: `${accentColor}25` }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed ? { opacity: 0.6 } : null]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <MaterialIcons
            name={isExam ? 'assignment' : 'menu-book'}
            size={20}
            color={accentColor}
          />
          <Text style={[styles.headerTitle, { color: accentColor, fontSize: fs(Typography.lg) }]}>
            {title}
          </Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: `${accentColor}15` }]}>
          <Text style={[styles.totalText, { color: accentColor, fontSize: fs(Typography.xs) }]}>
            共 {entries.length} 次
          </Text>
        </View>
      </View>

      {/* Stats summary bar — 平均正確率 / 平均錯誤率 / 平均合格率 */}
      {entries.length > 0 ? (() => {
        const avgCorrectRate = Math.round(
          entries.reduce((a, e) => {
            const tot = e.correct + e.wrong;
            return a + (tot > 0 ? e.correct / tot : 0);
          }, 0) / entries.length * 100
        );
        const avgWrongRate = Math.round(
          entries.reduce((a, e) => {
            const tot = e.correct + e.wrong;
            return a + (tot > 0 ? e.wrong / tot : 0);
          }, 0) / entries.length * 100
        );
        const avgPassRate = Math.round(
          (entries.filter((e) => e.status === 'pass').length / entries.length) * 100
        );
        return (
          <View style={[styles.summaryBar, { backgroundColor: `${accentColor}08`, borderBottomColor: `${accentColor}20` }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.success, fontSize: fs(Typography.xl) }]}>
                {avgCorrectRate}%
              </Text>
              <Text style={[styles.summaryLabel, { fontSize: fs(Typography.xs) }]}>平均正確率</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.error, fontSize: fs(Typography.xl) }]}>
                {avgWrongRate}%
              </Text>
              <Text style={[styles.summaryLabel, { fontSize: fs(Typography.xs) }]}>平均錯誤率</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor, fontSize: fs(Typography.xl) }]}>
                {avgPassRate}%
              </Text>
              <Text style={[styles.summaryLabel, { fontSize: fs(Typography.xs) }]}>平均合格率</Text>
            </View>
          </View>
        );
      })() : null}

      {entries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="inbox" size={48} color={Colors.surfaceBorder} />
          <Text style={[styles.emptyText, { fontSize: fs(Typography.base) }]}>暫無記錄</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    ...Shadows.card,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  totalText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },

  summaryBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 4,
  },
  summaryValue: {
    fontWeight: Typography.bold,
    lineHeight: 22,
  },
  summaryLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },

  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  separator: { height: Spacing.sm },

  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  cardEven: {
    backgroundColor: Colors.surface,
  },
  cardPracBorder: { borderLeftColor: Colors.accent },
  cardPassBorder: { borderLeftColor: Colors.success },
  cardFailBorder: { borderLeftColor: Colors.error },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  indexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  indexText: {
    fontWeight: Typography.bold,
  },
  dateWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  passBadge: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  failBadge: { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
  resultBadgeText: {
    fontWeight: Typography.bold,
  },
  passText: { color: '#2E7D32' },
  failText: { color: '#C62828' },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scoreBlockCorrect: {},
  scoreBlockWrong: {},
  scoreValue: {
    fontWeight: Typography.bold,
    lineHeight: 24,
  },
  scoreLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  scoreDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: 4,
  },

  breakdownRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  partBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  partLabel: {
    fontWeight: Typography.bold,
  },
  partScores: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  partCorrect: {
    fontWeight: Typography.semibold,
    color: Colors.success,
  },
  partWrong: {
    fontWeight: Typography.semibold,
    color: Colors.error,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
  },
});
