/**
 * EnhancedMatchingQuestion
 * Drag-and-drop matching question.
 * - Answer boxes are labelled A, B, C, D
 * - User drags an answer box onto one of the 6 date boxes below the chart
 * - The date box shows the letter (A–D) that was dropped onto it
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { ScaledText as Text } from '@/components/ui/ScaledText';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EnhancedMatchingData {
  QUESTION: string;
  /** Date column labels for drop targets (up to 6) */
  ANS1: string;
  ANS2?: string | null;
  ANS3?: string | null;
  ANS4?: string | null;
  ANS5?: string | null;
  ANS6?: string | null;
  /** Answer box labels (draggable items, up to 4) */
  AIMG1: string;
  AIMG2?: string | null;
  AIMG3?: string | null;
  AIMG4?: string | null;
  AIMG5?: string | null;
  AIMG6?: string | null;
  /**
   * Correct placement: "Letter:ColIndex,..." (1-based column index)
   * e.g. "A:1,B:2,C:3,D:5"
   * Letter A–D → AIMG1–AIMG4
   * ColIndex 1–6 → ANS1–ANS6
   */
  CORRECT: string;
  QIMG?: string | null;
  EXPLAIN?: string | null;
  QTYPE?: string | null;
}

interface Props {
  data: EnhancedMatchingData;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ANS_LETTERS = ['A', 'B', 'C', 'D'] as const;
type AnsLetter = typeof ANS_LETTERS[number];
type AnsIdx = 1 | 2 | 3 | 4;

const DASH_COLOR = '#1565C0';

const BOX_W = 72;
const BOX_H = 76;
const DATE_BOX_H = 68;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse CORRECT field in format "A:1,B:2,C:3,D:5"
 * Returns map of letterIndex (0-based, A=0) → dateColIndex (0-based)
 */
function parseCorrect(correct: string): Record<number, number> {
  const map: Record<number, number> = {};
  for (const part of correct.split(',')) {
    const [letterStr, colStr] = part.trim().split(':');
    const letter = letterStr?.trim().toUpperCase();
    const col1based = parseInt(colStr?.trim() ?? '', 10);
    const letterIdx = ANS_LETTERS.indexOf(letter as AnsLetter);
    if (letterIdx >= 0 && !isNaN(col1based)) {
      // Store: letterIdx (0-based) → dateColIdx (0-based)
      map[letterIdx] = col1based - 1;
    }
  }
  return map;
}

// ─── AnswerBox (draggable) ───────────────────────────────────────────────────

interface AnswerBoxProps {
  letter: AnsLetter;
  ansIdx: AnsIdx;
  label: string;
  /** Ref to the shared layouts array — read directly inside pan handlers */
  dateBoxLayouts: React.MutableRefObject<({ x: number; y: number; w: number; h: number } | null)[]>;
  /** Ref to the shared view refs array — used to re-measure at drag start */
  dateBoxViewRefs: React.MutableRefObject<(View | null)[]>;
  onDrop: (ansIdx: AnsIdx, dateIdx: number) => void;
  onHover: (dateIdx: number | null) => void;
  onDragStateChange: (ansIdx: AnsIdx, dragging: boolean) => void;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  placedDateIdx: number | null;
  isBeingDragged: boolean;
}

function AnswerBox({
  letter, ansIdx, label,
  dateBoxLayouts, dateBoxViewRefs,
  onDrop, onHover, onDragStateChange,
  isSubmitted, isCorrect, placedDateIdx, isBeingDragged,
}: AnswerBoxProps) {
  const pan = useRef(new Animated.ValueXY()).current;

  const isSubmittedRef = useRef(isSubmitted);
  const onDropRef = useRef(onDrop);
  const onHoverRef = useRef(onHover);
  const onDragStateChangeRef = useRef(onDragStateChange);
  useEffect(() => { isSubmittedRef.current = isSubmitted; }, [isSubmitted]);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onDragStateChangeRef.current = onDragStateChange; }, [onDragStateChange]);

  /**
   * Re-measure all date box screen positions right now (synchronous call,
   * results arrive asynchronously but before the first move event fires).
   */
  const remeasureAll = useCallback(() => {
    const refs = dateBoxViewRefs.current;
    const layouts = dateBoxLayouts.current;
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i];
      if (r) {
        r.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) layouts[i] = { x, y, w, h };
        });
      }
    }
  }, [dateBoxLayouts, dateBoxViewRefs]);

  const hitTestDateBox = useCallback((gx: number, gy: number): number | null => {
    const layouts = dateBoxLayouts.current;
    for (let i = 0; i < layouts.length; i++) {
      const l = layouts[i];
      if (!l) continue;
      if (gx >= l.x && gx <= l.x + l.w && gy >= l.y && gy <= l.y + l.h) return i;
    }
    return null;
  }, [dateBoxLayouts]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => !isSubmittedRef.current,
      onMoveShouldSetPanResponderCapture: () => !isSubmittedRef.current,
      onStartShouldSetPanResponder: () => !isSubmittedRef.current,
      onMoveShouldSetPanResponder: () => !isSubmittedRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_evt) => {
        pan.setOffset({ x: (pan.x as any)._value ?? 0, y: (pan.y as any)._value ?? 0 });
        pan.setValue({ x: 0, y: 0 });
        onDragStateChangeRef.current(ansIdx, true);
        // Re-measure date boxes right at drag start so coords are fresh
        remeasureAll();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        {
          useNativeDriver: false,
          listener: (_evt: any, gs: any) => {
            const hit = hitTestDateBox(gs.moveX, gs.moveY);
            onHoverRef.current(hit);
          },
        }
      ),
      onPanResponderRelease: (_evt, gs) => {
        pan.flattenOffset();
        onHoverRef.current(null);
        onDragStateChangeRef.current(ansIdx, false);
        // Use the final touch coordinates to find which date box was dropped on
        const releaseX = gs.moveX;
        const releaseY = gs.moveY;
        const hit = hitTestDateBox(releaseX, releaseY);
        if (hit !== null) {
          onDropRef.current(ansIdx, hit);
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, bounciness: 4 }).start();
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        onHoverRef.current(null);
        onDragStateChangeRef.current(ansIdx, false);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const borderColor = isSubmitted
    ? isCorrect === true ? Colors.success : isCorrect === false ? Colors.error : '#BDBDBD'
    : placedDateIdx !== null ? DASH_COLOR : '#BDBDBD';

  const bgColor = isSubmitted
    ? isCorrect === true ? '#E8F5E9' : isCorrect === false ? '#FFEBEE' : '#F5F5F5'
    : placedDateIdx !== null ? '#E3F2FD' : '#F5F5F5';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        ansBoxStyles.box,
        { backgroundColor: bgColor, borderColor },
        { transform: pan.getTranslateTransform() },
        isBeingDragged ? ansBoxStyles.dragging : null,
      ]}
    >
      {/* Letter badge */}
      <View style={[ansBoxStyles.letterBadge, { backgroundColor: borderColor }]}>
        <Text style={ansBoxStyles.letterText} selectable={false}>{letter}</Text>
      </View>
      <Text style={ansBoxStyles.label} numberOfLines={3} selectable={false}>{label}</Text>
      {isSubmitted && isCorrect === true
        ? <MaterialIcons name="check-circle" size={13} color={Colors.success} style={{ marginTop: 2 }} />
        : null}
      {isSubmitted && isCorrect === false
        ? <MaterialIcons name="cancel" size={13} color={Colors.error} style={{ marginTop: 2 }} />
        : null}
    </Animated.View>
  );
}

const ansBoxStyles = StyleSheet.create({
  box: {
    width: BOX_W,
    minHeight: BOX_H,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    gap: 4,
    zIndex: 1,
  },
  dragging: {
    zIndex: 999,
    elevation: 20,
    shadowOpacity: 0.38,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    opacity: 0.95,
  },
  letterBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 16,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 12,
    flex: 1,
    userSelect: 'none' as any,
  },
});

// ─── DateBox (drop target) ───────────────────────────────────────────────────

interface DateBoxProps {
  dateLabel: string;
  assignedLetter: AnsLetter | null;
  isHovered: boolean;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  onClear: () => void;
  boxRef: (ref: View | null) => void;
  onLayout: () => void;
}

function DateBox({ dateLabel, assignedLetter, isHovered, isSubmitted, isCorrect, onClear, boxRef, onLayout }: DateBoxProps) {
  const borderColor = isSubmitted
    ? isCorrect === true ? Colors.success : isCorrect === false ? Colors.error : '#BDBDBD'
    : isHovered ? DASH_COLOR : assignedLetter ? DASH_COLOR : Colors.surfaceBorder;

  const bgColor = isSubmitted
    ? isCorrect === true ? '#E8F5E9' : isCorrect === false ? '#FFEBEE' : Colors.surfaceElevated
    : isHovered ? 'rgba(21,101,192,0.12)' : assignedLetter ? '#E3F2FD' : Colors.surfaceElevated;

  return (
    <View
      ref={boxRef}
      onLayout={onLayout}
      style={[
        dateBoxStyles.box,
        { borderColor, backgroundColor: bgColor },
        isHovered ? dateBoxStyles.hovered : null,
      ]}
    >
      {/* Date label */}
      <Text style={dateBoxStyles.dateText} selectable={false}>{dateLabel}</Text>

      {/* Divider */}
      <View style={[dateBoxStyles.divider, { backgroundColor: borderColor }]} />

      {/* Assigned letter or placeholder */}
      {assignedLetter ? (
        <View style={[dateBoxStyles.assignedBadge, { backgroundColor: isSubmitted
          ? isCorrect === true ? Colors.success : isCorrect === false ? Colors.error : DASH_COLOR
          : DASH_COLOR }]}>
          <Text style={dateBoxStyles.assignedLetter} selectable={false}>{assignedLetter}</Text>
        </View>
      ) : (
        <View style={dateBoxStyles.emptySlot}>
          <Text style={dateBoxStyles.emptyText} selectable={false}>—</Text>
        </View>
      )}

      {/* Status icon */}
      {isSubmitted && isCorrect === true
        ? <MaterialIcons name="check-circle" size={11} color={Colors.success} />
        : null}
      {isSubmitted && isCorrect === false
        ? <MaterialIcons name="cancel" size={11} color={Colors.error} />
        : null}

      {/* Clear button */}
      {assignedLetter && !isSubmitted ? (
        <Pressable
          onPress={onClear}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={dateBoxStyles.clearBtn}
        >
          <MaterialIcons name="close" size={10} color={Colors.error} />
        </Pressable>
      ) : null}
    </View>
  );
}

const dateBoxStyles = StyleSheet.create({
  box: {
    flex: 1,
    minHeight: DATE_BOX_H,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  hovered: {
    elevation: 6,
    shadowOpacity: 0.25,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    color: DASH_COLOR,
    letterSpacing: 0.3,
    userSelect: 'none' as any,
  },
  divider: {
    width: '60%',
    height: 1,
    opacity: 0.4,
  },
  assignedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    userSelect: 'none' as any,
  },
  emptySlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    userSelect: 'none' as any,
  },
  clearBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EnhancedMatchingQuestion({ data, onClose }: Props) {
  // Date labels from ANS1–ANS6 (filter out null/empty)
  const dateLabels = [
    data.ANS1, data.ANS2, data.ANS3, data.ANS4, data.ANS5, data.ANS6,
  ].filter((v): v is string => !!v);

  // Answer box labels from AIMG1–AIMG4 (filter out null/empty)
  const answers = [
    data.AIMG1, data.AIMG2, data.AIMG3, data.AIMG4,
  ].filter((v): v is string => !!v);

  const numAnswers = answers.length as 1 | 2 | 3 | 4;

  // placements[ansLetterIdx (0–3)] = dateColIdx (0–5) | null
  const [placements, setPlacements] = useState<Record<number, number | null>>({
    0: null, 1: null, 2: null, 3: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [hoverDateIdx, setHoverDateIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingAnsIdx, setDraggingAnsIdx] = useState<AnsIdx | null>(null);

  // Chart sizing
  const screenW = Dimensions.get('window').width;
  const initW = Math.max(200, screenW - Spacing.md * 2 - 2);
  const [chartW, setChartW] = useState(initW);
  const chartH = Math.round(chartW * 0.62);
  const chartViewRef = useRef<View>(null);
  const handleChartLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setChartW(width);
  };

  // Date box refs & layouts for hit testing (shared with AnswerBox via refs)
  const dateBoxViewRefs = useRef<(View | null)[]>(Array(dateLabels.length).fill(null));
  const dateBoxLayouts = useRef<({ x: number; y: number; w: number; h: number } | null)[]>(
    Array(dateLabels.length).fill(null)
  );

  const measureDateBox = useCallback((i: number) => {
    const ref = dateBoxViewRefs.current[i];
    if (ref) {
      ref.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          dateBoxLayouts.current[i] = { x, y, w, h };
        }
      });
    }
  }, []);

  const measureAllDateBoxes = useCallback(() => {
    dateLabels.forEach((_, i) => measureDateBox(i));
  }, [measureDateBox, dateLabels.length]);

  // Measure after chart width settles AND after initial mount
  useEffect(() => {
    // First pass immediately, second pass after layout has propagated
    measureAllDateBoxes();
    const t = setTimeout(measureAllDateBoxes, 150);
    return () => clearTimeout(t);
  }, [chartW, measureAllDateBoxes]);

  // Also measure on orientation change
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      setTimeout(measureAllDateBoxes, 150);
    });
    return () => sub.remove();
  }, [measureAllDateBoxes]);

  // Build reverse map: dateColIdx → letterIdx | null
  const dateToAns = useCallback((): Record<number, number | null> => {
    const m: Record<number, number | null> = {};
    for (let i = 0; i < dateLabels.length; i++) m[i] = null;
    for (const [aStr, dVal] of Object.entries(placements)) {
      if (dVal !== null) m[dVal] = parseInt(aStr, 10);
    }
    return m;
  }, [placements, dateLabels.length]);

  const handleDragStateChange = useCallback((ansIdx: AnsIdx, dragging: boolean) => {
    setIsDragging(dragging);
    setDraggingAnsIdx(dragging ? ansIdx : null);
  }, []);

  const handleDrop = useCallback((ansIdx: AnsIdx, dateIdx: number) => {
    if (submitted) return;
    // ansIdx here is actually letterIdx (0-based) passed from AnswerBox
    const letterIdx = (ansIdx - 1) as number; // AnswerBox uses AnsIdx 1-based
    setPlacements((prev) => {
      const next = { ...prev };
      // Evict any other box already on this date
      for (let k = 0; k < 4; k++) {
        if (next[k] === dateIdx) next[k] = null;
      }
      next[letterIdx] = dateIdx;
      return next;
    });
  }, [submitted]);

  const handleClearDate = (dateIdx: number) => {
    if (submitted) return;
    setPlacements((prev) => {
      const next = { ...prev };
      for (let k = 0; k < 4; k++) {
        if (next[k] === dateIdx) next[k] = null;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    // correctMap: letterIdx (0-based) → dateColIdx (0-based)
    const correctMap = parseCorrect(data.CORRECT);
    // userMap: dateColIdx → letterIdx (0-based) | null
    const userMap = dateToAns();

    let allCorrect = true;
    const parts: string[] = [];
    for (const [lIdxStr, correctDateIdx] of Object.entries(correctMap)) {
      const letterIdx = parseInt(lIdxStr, 10);
      const correctLetter = ANS_LETTERS[letterIdx];
      const dateLabel = dateLabels[correctDateIdx] ?? `D${correctDateIdx + 1}`;
      const ansLabel = answers[letterIdx] ?? '';
      // Check if user placed this letter on the correct date
      const userDateForThisLetter = placements[letterIdx];
      if (userDateForThisLetter === correctDateIdx) {
        parts.push(`${dateLabel}: correct ${correctLetter} — ${ansLabel}`);
      } else {
        allCorrect = false;
        const userDateLabel = userDateForThisLetter != null
          ? (dateLabels[userDateForThisLetter] ?? `D${userDateForThisLetter + 1}`)
          : '(not placed)';
        parts.push(
          `${correctLetter} — ${ansLabel}\n  yours: ${userDateLabel}  correct: ${dateLabel}`
        );
      }
    }
    setSubmitted(true);
    setResultMessage(
      (allCorrect ? '✅ All Correct!' : '❌ Some answers are wrong.') + '\n\n' + parts.join('\n')
    );
  };

  const handleReset = () => {
    setPlacements({ 0: null, 1: null, 2: null, 3: null });
    setSubmitted(false);
    setResultMessage(null);
  };

  // correctMap: letterIdx (0-based) → dateColIdx (0-based)
  const correctMap = submitted ? parseCorrect(data.CORRECT) : {};

  // Is the letter placed on the correct date?
  const ansIsCorrect = (letterIdx: number): boolean | null => {
    if (!submitted) return null;
    const placedDate = placements[letterIdx];
    if (placedDate === null || placedDate === undefined) return null;
    return correctMap[letterIdx] === placedDate;
  };

  // Is the letter placed on this date correct?
  const dateIsCorrect = (dateIdx: number): boolean | null => {
    if (!submitted) return null;
    const d2a = dateToAns();
    const letterIdx = d2a[dateIdx];
    if (letterIdx === null || letterIdx === undefined) return null;
    return correctMap[letterIdx] === dateIdx;
  };

  const d2a = dateToAns();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!isDragging}
    >
      {/* Question */}
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{data.QUESTION}</Text>
      </View>

      {/* Chart */}
      <View
        ref={chartViewRef}
        style={[styles.chartWrap, { height: chartH }]}
        onLayout={handleChartLayout}
      >


      </View>

      {/* ── Date Drop Zones ── rendered first so answer boxes paint on top */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel} selectable={false}>Date columns — drop an answer box here</Text>
        <View style={styles.dateRow}>
          {dateLabels.map((dl, di) => {
            const occupantLetterIdx = d2a[di];
            const letter = occupantLetterIdx != null ? ANS_LETTERS[occupantLetterIdx] : null;
            return (
              <DateBox
                key={di}
                dateLabel={dl}
                assignedLetter={letter}
                isHovered={hoverDateIdx === di}
                isSubmitted={submitted}
                isCorrect={dateIsCorrect(di)}
                onClear={() => handleClearDate(di)}
                boxRef={(ref) => { dateBoxViewRefs.current[di] = ref; }}
                onLayout={() => {
                  setTimeout(() => measureDateBox(di), 100);
                }}
              />
            );
          })}
        </View>
      </View>

      {/* ── Answer Boxes Tray ── rendered after date boxes so they paint on top */}
      <View style={[styles.section, styles.ansSection]}>
        <Text style={styles.sectionLabel} selectable={false}>Answer Boxes — drag to a date below</Text>
        <View style={styles.ansRow} pointerEvents="box-none">
          {answers.map((label, idx) => {
            const letter = ANS_LETTERS[idx];
            // AnswerBox uses AnsIdx (1-based) internally; we pass idx+1
            const ansIdx = (idx + 1) as AnsIdx;
            return (
              <AnswerBox
                key={idx}
                letter={letter}
                ansIdx={ansIdx}
                label={label}
                dateBoxViewRefs={dateBoxViewRefs}
                dateBoxLayouts={dateBoxLayouts}
                onDrop={handleDrop}
                onHover={setHoverDateIdx}
                onDragStateChange={handleDragStateChange}
                isSubmitted={submitted}
                isCorrect={ansIsCorrect(idx)}
                placedDateIdx={placements[idx]}
                isBeingDragged={draggingAnsIdx === ansIdx}
              />
            );
          })}
        </View>
      </View>

      {/* Submit / Reset */}
      {!submitted ? (
        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed ? { opacity: 0.85 } : null]}
          onPress={handleSubmit}
        >
          <MaterialIcons name="check-circle" size={18} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Answer</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed ? { opacity: 0.85 } : null]}
          onPress={handleReset}
        >
          <MaterialIcons name="refresh" size={18} color={Colors.primary} />
          <Text style={styles.resetBtnText}>Try Again</Text>
        </Pressable>
      )}

      {/* Result */}
      {resultMessage ? (
        <View style={[styles.resultBox, resultMessage.startsWith('✅') ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultText}>{resultMessage}</Text>
        </View>
      ) : null}

      {/* Debug: show CORRECT field */}
      <View style={styles.rawBox}>
        <Text style={styles.rawLabel}>CORRECT field:</Text>
        <Text style={styles.rawValue} selectable>{data.CORRECT}</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.md,
    paddingBottom: 80,
    gap: Spacing.md,
  },
  questionBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: Spacing.md,
  },
  questionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  chartWrap: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ansSection: {
    zIndex: 10,
    elevation: 10,
  },
  ansRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitBtnText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: '#fff',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  resetBtnText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  resultPass: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  resultFail: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  resultText: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rawBox: {
    backgroundColor: '#0D1117',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  rawLabel: { fontSize: 10, color: '#8B949E', fontFamily: 'monospace', marginBottom: 2 },
  rawValue: { fontSize: 11, color: '#58A6FF', fontFamily: 'monospace' },
});
