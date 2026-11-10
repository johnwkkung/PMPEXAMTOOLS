import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { QuizQuestion, getCorrectIndex, saveQuizResult } from '@/services/quizManagerService';
import { getSupabaseClient } from '@/template';

type FilterType = 'all' | 'correct' | 'wrong' | 'unanswered';

import { EXAM_FAIL_THRESHOLD } from '@/constants/exam';
import { ScaledText as Text } from '@/components/ui/ScaledText';

// ─── Pass/Fail logic for EXAM mode ───────────────────────────────────────────
// Up to 5 wrong answers passes a section; 6 or more fails.
// The overall exam passes only when both Part A and Part B pass.

function calcExamPassFail(
  questions: QuizQuestion[],
  userAnswers: (number | null)[],
  partACount: number
): { passed: boolean; partAWrong: number; partBWrong: number } {
  let partAWrong = 0;
  let partBWrong = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ua = userAnswers[i];
    const correctIdx = getCorrectIndex(q.CORRECT);
    const isWrong = ua === null || ua !== correctIdx;
    if (i < partACount) {
      if (isWrong) partAWrong++;
    } else {
      if (isWrong) partBWrong++;
    }
  }

  const passed = partAWrong < EXAM_FAIL_THRESHOLD && partBWrong < EXAM_FAIL_THRESHOLD;
  return { passed, partAWrong, partBWrong };
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({
  score, total, passed, isExam,
}: {
  score: number;
  total: number;
  passed?: boolean;
  isExam?: boolean;
}) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = isExam
    ? (passed ? Colors.success : Colors.error)
    : percent >= 80 ? Colors.success
    : percent >= 60 ? Colors.primary
    : percent >= 40 ? Colors.warning
    : Colors.error;

  return (
    <View style={scoreStyles.wrap}>
      <View style={[scoreStyles.ring, { borderColor: color }]}>
        <Text style={[scoreStyles.scoreNum, { color }]}>{score}</Text>
        <Text style={scoreStyles.scoreDivider}>/{total}</Text>
        <Text style={[scoreStyles.percent, { color }]}>{percent}%</Text>
      </View>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  scoreNum: { fontSize: 44, fontWeight: Typography.bold, includeFontPadding: false, lineHeight: 48 },
  scoreDivider: { fontSize: Typography.lg, color: Colors.textMuted, includeFontPadding: false },
  percent: { fontSize: Typography.sm, fontWeight: Typography.semibold },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [filter, setFilter] = useState<FilterType>('all');

  if (!params.questions) {
    router.replace('/home');
    return null;
  }

  const questions: QuizQuestion[] = JSON.parse(params.questions as string);
  const rawAnswers: (number | null | '')[] = JSON.parse((params.userAnswers as string) ?? '[]');
  const userAnswers: (number | null)[] = questions.map((_, index) => {
    const answer = rawAnswers[index];
    return typeof answer === 'number' ? answer : null;
  });
  const timeTakenSeconds = parseInt(params.timeTakenSeconds as string ?? '0', 10);
  const isExamMode = params.isExamMode === '1';
  const examPartACount = parseInt(params.examPartACount as string ?? '30', 10);

  const total = questions.length;
  let score = 0;
  for (let i = 0; i < total; i++) {
    const correctIdx = getCorrectIndex(questions[i].CORRECT);
    if (userAnswers[i] !== null && userAnswers[i] === correctIdx) score++;
  }
  const answeredWrongCount = userAnswers.filter((a, i) => {
    const ci = getCorrectIndex(questions[i].CORRECT);
    return a !== null && a !== ci;
  }).length;
  const unansweredCount = userAnswers.filter((a) => a === null).length;
  // Practice wrong totals include unanswered questions; keep the visual analysis disjoint.
  const wrongCount = answeredWrongCount + (isExamMode ? 0 : unansweredCount);

  // Save result to server once on mount
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    // Only save for actual practice/exam modes, not sample questions
    const quizMode = params.quizMode as string | undefined;
    if (!quizMode || quizMode === 'SAMP') return;

    (async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const isTimeout = params.isTimeout === '1';

      if (isExamMode) {
        // SAVEEX: split correct/wrong by Part A and Part B
        const examRes = calcExamPassFail(questions, userAnswers, examPartACount);
        const partATotal = examPartACount;
        let partACorrect = 0;
        for (let i = 0; i < partATotal; i++) {
          const ci = getCorrectIndex(questions[i].CORRECT);
          if (userAnswers[i] !== null && userAnswers[i] === ci) partACorrect++;
        }
        let partBCorrect = 0;
        for (let i = partATotal; i < questions.length; i++) {
          const ci = getCorrectIndex(questions[i].CORRECT);
          if (userAnswers[i] !== null && userAnswers[i] === ci) partBCorrect++;
        }
        await saveQuizResult({
          mode: 'SAVEEX',
          useremail: user.email,
          ncorrectA: partACorrect,
          nwrongA: examRes.partAWrong,
          ncorrectB: partBCorrect,
          nwrongB: examRes.partBWrong,
          qlist: questions.map((q) => q.QNO),
          anslist: userAnswers,
          istmo: isTimeout ? 1 : 0,
        });
      } else {
        // SAVEPR: unanswered questions count as wrong and are submitted as empty strings
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const rectime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        await saveQuizResult({
          mode: 'SAVEPR',
          useremail: user.email,
          rectime,
          ncorrect: score,
          nwrong: wrongCount,
          qlist: questions.map((q) => q.QNO),
          anslist: userAnswers.map((answer) => answer ?? ''),
          istmo: '',
        });
      }
    })();
  }, []);

  // Exam pass/fail
  const examResult = isExamMode
    ? calcExamPassFail(questions, userAnswers, examPartACount)
    : null;
  const examPassed = examResult?.passed ?? true;

  // Format time
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Filtered question indices
  const filteredIndices = questions.reduce<number[]>((acc, q, i) => {
    const ci = getCorrectIndex(q.CORRECT);
    const ua = userAnswers[i];
    if (filter === 'all') acc.push(i);
    else if (filter === 'correct' && ua !== null && ua === ci) acc.push(i);
    else if (filter === 'wrong' && ua !== ci && (!isExamMode || ua !== null)) acc.push(i);
    else if (filter === 'unanswered' && ua === null) acc.push(i);
    return acc;
  }, []);

  const filterOptions: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: 'all', label: '全部', count: total, color: Colors.textSecondary },
    { key: 'correct', label: '答對', count: score, color: Colors.success },
    { key: 'wrong', label: '答錯', count: wrongCount, color: Colors.error },
    { key: 'unanswered', label: '未答', count: unansweredCount, color: Colors.warning },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/home')}
          style={styles.homeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="home" size={22} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>考試成績</Text>
        <Pressable onPress={() => router.replace('/home')} style={styles.retryBtn}>
          <MaterialIcons name="refresh" size={18} color={Colors.primary} />
          <Text style={styles.retryBtnText}>重試</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      >
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <ScoreRing score={score} total={total} passed={examPassed} isExam={isExamMode} />

          {/* Pass/Fail Badge (exam mode only) */}
          {isExamMode && (
            <View style={[
              styles.passBadge,
              examPassed ? styles.passBadgePassed : styles.passBadgeFailed,
            ]}>
              <MaterialIcons
                name={examPassed ? 'check-circle' : 'cancel'}
                size={22}
                color={examPassed ? Colors.success : Colors.error}
              />
              <Text style={[styles.passBadgeText, { color: examPassed ? Colors.success : Colors.error }]}>
                {examPassed ? '合格' : '不合格'}
              </Text>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.scoreStats}>
            <View style={styles.scoreStat}>
              <Text style={[styles.scoreStatValue, { color: Colors.success }]}>{score}</Text>
              <Text style={styles.scoreStatLabel}>答對</Text>
            </View>
            <View style={styles.scoreStatDivider} />
            <View style={styles.scoreStat}>
              <Text style={[styles.scoreStatValue, { color: Colors.error }]}>{wrongCount}</Text>
              <Text style={styles.scoreStatLabel}>{isExamMode ? '答錯' : '答錯（含未答）'}</Text>
            </View>
            <View style={styles.scoreStatDivider} />
            <View style={styles.scoreStat}>
              <Text style={[styles.scoreStatValue, { color: Colors.warning }]}>{unansweredCount}</Text>
              <Text style={styles.scoreStatLabel}>未答</Text>
            </View>
            <View style={styles.scoreStatDivider} />
            <View style={styles.scoreStat}>
              <Text style={[styles.scoreStatValue, { color: Colors.accent }]}>{formatTime(timeTakenSeconds)}</Text>
              <Text style={styles.scoreStatLabel}>用時</Text>
            </View>
          </View>

          {!isExamMode && unansweredCount > 0 ? (
            <Text style={styles.examRuleNote}>
              未作答 {unansweredCount} 題已計入答錯；「未答」為其中的題數，不另行累加。
            </Text>
          ) : null}

          {/* Exam section breakdown */}
          {isExamMode && examResult && (
            <View style={styles.examBreakdown}>
              <Text style={styles.examBreakdownTitle}>分部成績</Text>
              <View style={styles.examBreakdownRow}>
                <View style={[styles.examPartBadge, examResult.partAWrong >= EXAM_FAIL_THRESHOLD ? styles.examPartFail : styles.examPartPass]}>
                  <Text style={styles.examPartLabel}>甲部：的士及網約車營運</Text>
                  <Text style={[styles.examPartWrong, { color: examResult.partAWrong >= EXAM_FAIL_THRESHOLD ? Colors.error : Colors.success }]}>
                    {examResult.partAWrong >= EXAM_FAIL_THRESHOLD
                      ? `錯 ${examResult.partAWrong} 題（不合格）`
                      : `錯 ${examResult.partAWrong} 題（合格）`}
                  </Text>
                </View>
              </View>
              <View style={styles.examBreakdownRow}>
                <View style={[styles.examPartBadge, examResult.partBWrong >= EXAM_FAIL_THRESHOLD ? styles.examPartFail : styles.examPartPass]}>
                  <Text style={styles.examPartLabel}>乙部：道路使用者守則</Text>
                  <Text style={[styles.examPartWrong, { color: examResult.partBWrong >= EXAM_FAIL_THRESHOLD ? Colors.error : Colors.success }]}>
                    {examResult.partBWrong >= EXAM_FAIL_THRESHOLD
                      ? `錯 ${examResult.partBWrong} 題（不合格）`
                      : `錯 ${examResult.partBWrong} 題（合格）`}
                  </Text>
                </View>
              </View>
              <Text style={styles.examRuleNote}>
                * 每部分錯誤 {EXAM_FAIL_THRESHOLD - 1} 題或以下為合格；{EXAM_FAIL_THRESHOLD} 題或以上為不合格。甲部及乙部均合格，整體考試才算合格。
              </Text>
            </View>
          )}
        </View>

        {/* Accuracy Bar */}
        <View style={styles.accuracySection}>
          <Text style={styles.sectionTitle}>答題分析</Text>
          <View style={styles.accuracyBar}>
            {score > 0 && <View style={[styles.accuracySeg, { flex: score, backgroundColor: Colors.success }]} />}
            {answeredWrongCount > 0 ? <View style={[styles.accuracySeg, { flex: answeredWrongCount, backgroundColor: Colors.error }]} /> : null}
            {unansweredCount > 0 && <View style={[styles.accuracySeg, { flex: unansweredCount, backgroundColor: Colors.warning }]} />}
          </View>
          <View style={styles.legendRow}>
            <LegendItem color={Colors.success} label={`答對 ${score}`} />
            <LegendItem color={Colors.error} label={`${isExamMode ? '答錯' : '已答錯'} ${answeredWrongCount}`} />
            <LegendItem color={Colors.warning} label={`未答 ${unansweredCount}`} />
          </View>
        </View>

        {/* Review Section */}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>題目回顧</Text>

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            {filterOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.filterChip,
                  filter === opt.key ? { backgroundColor: `${opt.color}22`, borderColor: opt.color } : null,
                ]}
                onPress={() => setFilter(opt.key)}
              >
                <Text style={[styles.filterChipText, { color: filter === opt.key ? opt.color : Colors.textMuted }]}>
                  {opt.label} ({opt.count})
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Question Review Cards */}
          {filteredIndices.map((qIndex) => {
            const q = questions[qIndex];
            const ua = userAnswers[qIndex];
            const ci = getCorrectIndex(q.CORRECT);
            const isCorrect = ua !== null && ua === ci;
            const isWrong = ua !== null && ua !== ci;
            const isUnanswered = ua === null;
            const choices = [q.ANS1, q.ANS2, q.ANS3, q.ANS4];
            const partLabel = isExamMode
              ? (qIndex < examPartACount ? '甲部' : '乙部')
              : undefined;

            return (
              <View
                key={qIndex}
                style={[
                  styles.reviewCard,
                  isCorrect ? styles.reviewCorrect : isWrong ? styles.reviewWrong : styles.reviewUnanswered,
                ]}
              >
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewNum}>Q{qIndex + 1}</Text>
                  {partLabel ? (
                    <View style={styles.reviewPartBadge}>
                      <Text style={styles.reviewPartText}>{partLabel}</Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }} />
                  {isCorrect ? (
                    <MaterialIcons name="check-circle" size={20} color={Colors.success} />
                  ) : isWrong ? (
                    <MaterialIcons name="cancel" size={20} color={Colors.error} />
                  ) : (
                    <MaterialIcons name="remove-circle" size={20} color={Colors.warning} />
                  )}
                </View>

                <Text style={styles.reviewQuestion}>{q.QUESTION.trim()}</Text>

                {isWrong && ua !== null && (
                  <View style={styles.reviewAnswerRow}>
                    <MaterialIcons name="close" size={14} color={Colors.error} />
                    <Text style={[styles.reviewAnswerText, { color: Colors.error }]}>
                      你的答案：{OPTION_LABELS[ua]}. {choices[ua]?.trim()}
                    </Text>
                  </View>
                )}
                {isUnanswered && (
                  <View style={styles.reviewAnswerRow}>
                    <MaterialIcons name="remove" size={14} color={Colors.warning} />
                    <Text style={[styles.reviewAnswerText, { color: Colors.warning }]}>未作答</Text>
                  </View>
                )}

                <View style={styles.reviewAnswerRow}>
                  <MaterialIcons name="check" size={14} color={Colors.success} />
                  <Text style={[styles.reviewAnswerText, { color: Colors.success }]}>
                    正確答案：{OPTION_LABELS[ci]}. {choices[ci]?.trim()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.homeFullBtn, pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null]}
          onPress={() => router.replace('/home')}
        >
          <MaterialIcons name="home" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.homeFullBtnText}>返回主頁</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Legend helper ───────────────────────────────────────────────────────────
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: Typography.xs, color: Colors.textMuted }}>{label}</Text>
    </View>
  );
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  homeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: `${Colors.primary}20`,
  },
  retryBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.primary },

  scoreCard: {
    margin: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...Shadows.card,
  },

  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 2,
  },
  passBadgePassed: {
    backgroundColor: `${Colors.success}15`,
    borderColor: `${Colors.success}50`,
  },
  passBadgeFailed: {
    backgroundColor: `${Colors.error}15`,
    borderColor: `${Colors.error}50`,
  },
  passBadgeText: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    letterSpacing: 2,
  },

  scoreStats: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-around',
  },
  scoreStat: { alignItems: 'center', gap: 2 },
  scoreStatValue: { fontSize: Typography.xl, fontWeight: Typography.bold, includeFontPadding: false },
  scoreStatLabel: { fontSize: Typography.xs, color: Colors.textMuted, letterSpacing: 0.5 },
  scoreStatDivider: { width: 1, height: 32, backgroundColor: Colors.surfaceBorder },

  examBreakdown: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  examBreakdownTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  examBreakdownRow: {},
  examPartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  examPartPass: {
    backgroundColor: `${Colors.success}10`,
    borderColor: `${Colors.success}30`,
  },
  examPartFail: {
    backgroundColor: `${Colors.error}10`,
    borderColor: `${Colors.error}30`,
  },
  examPartLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    flex: 1,
  },
  examPartWrong: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  examRuleNote: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  accuracySection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  accuracyBar: {
    flexDirection: 'row', height: 10, borderRadius: Radius.full,
    overflow: 'hidden', gap: 2, marginBottom: Spacing.sm,
  },
  accuracySeg: { height: '100%', borderRadius: Radius.full },
  legendRow: { flexDirection: 'row', gap: Spacing.md },

  reviewSection: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  filterBar: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface,
  },
  filterChipText: { fontSize: Typography.sm, fontWeight: Typography.semibold },

  reviewCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1.5, gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  reviewCorrect: { borderColor: `${Colors.success}50` },
  reviewWrong: { borderColor: `${Colors.error}50` },
  reviewUnanswered: { borderColor: `${Colors.warning}50` },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewNum: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, width: 28 },
  reviewPartBadge: {
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full,
  },
  reviewPartText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.primary },
  reviewQuestion: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, fontWeight: Typography.medium },
  reviewAnswerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  reviewAnswerText: { flex: 1, fontSize: Typography.xs, lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  homeFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: Radius.lg, paddingVertical: 16,
    ...Shadows.elevated,
  },
  homeFullBtnText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textOnPrimary },
});
