/**
 * BurnDownMatchQuestion  (QTST005 / ENHMATCH)
 *
 * Renders a Burndown chart from bundled data (EnMatch.txt) via SVG.
 * Draggable answer boxes (AIMG1–AIMG6) live BELOW the chart.
 * User drags a box up into the chart's date columns to match status → date.
 * Validation: CORRECT field in "A:1,B:2,C:3,D:5" format.
 *
 * QIMG lookup: "EnMatch.txt" → burndown data
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
import Svg, { Path, Line, Text as SvgText, Rect, Circle, G } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { ScaledText as Text } from '@/components/ui/ScaledText';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BurnDownMatchData {
  QUESTION: string;
  /** Date column labels (ANS1–ANS6) */
  ANS1: string;
  ANS2?: string | null;
  ANS3?: string | null;
  ANS4?: string | null;
  ANS5?: string | null;
  ANS6?: string | null;
  /** Draggable box labels (AIMG1–AIMG6) */
  AIMG1: string;
  AIMG2?: string | null;
  AIMG3?: string | null;
  AIMG4?: string | null;
  AIMG5?: string | null;
  AIMG6?: string | null;
  /**
   * Correct placements: "A:1,B:2,C:3,D:5"
   * Letter → 1-based column index matching ANS1–ANS6
   */
  CORRECT: string;
  QIMG?: string | null;
  EXPLAIN?: string | null;
  QTYPE?: string | null;
}

interface Props {
  data: BurnDownMatchData;
  onClose: () => void;
}

// ─── Bundled EnMatch.txt data ─────────────────────────────────────────────────

interface ChartPoint { date: string; value: number; }

/** Pre-parsed from assets/images/EnMatch.txt */
const ENMATCH_BLUE: ChartPoint[] = [
  { date: '4/30', value: 500 },
  { date: '5/2',  value: 450 },
  { date: '5/4',  value: 250 },
  { date: '5/5',  value: 200 },
  { date: '5/6',  value: 70  },
];

const ENMATCH_RED: ChartPoint[] = [
  { date: '4/30', value: 500 },
  { date: '5/2',  value: 400 },
  { date: '5/4',  value: 300 },
  { date: '5/5',  value: 200 },
  { date: '5/6',  value: 100 },
  { date: '5/7',  value: 0   },
];

// All dates in the chart domain (ordered)
const ALL_CHART_DATES = ['4/30', '5/1', '5/2', '5/3', '5/4', '5/5', '5/6', '5/7'];

function getChartData(_qimg?: string | null) {
  return { blue: ENMATCH_BLUE, red: ENMATCH_RED, allDates: ALL_CHART_DATES };
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

const MARGIN = { top: 14, right: 14, bottom: 32, left: 42 };
const Y_MIN = 0;
const Y_MAX = 500;
const Y_TICKS = [0, 100, 200, 300, 400, 500];

function dateToIdx(date: string, allDates: string[]): number {
  return allDates.indexOf(date);
}

function scaleX(dateIdx: number, totalDates: number, plotW: number): number {
  return MARGIN.left + (dateIdx / (totalDates - 1)) * plotW;
}

function scaleY(value: number, plotH: number): number {
  return MARGIN.top + (1 - (value - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
}

function buildPath(
  points: ChartPoint[],
  allDates: string[],
  plotW: number,
  plotH: number,
): string {
  return points
    .map((p, i) => {
      const xi = dateToIdx(p.date, allDates);
      const sx = scaleX(xi, allDates.length, plotW);
      const sy = scaleY(p.value, plotH);
      return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');
}

// ─── Burndown SVG Chart ───────────────────────────────────────────────────────

interface BurnDownChartProps {
  width: number;
  allDates: string[];
  ansDates: string[];  // the ANS column dates (highlighted)
  hoverDateIdx: number | null;   // which ANS column is hovered (0-based ANS index)
  placements: Record<number, number | null>;   // letterIdx → dateColIdx (ANS index)
  answers: string[];
  submitted: boolean;
  correctMap: Record<number, number>;
}

function BurnDownChart({
  width, allDates, ansDates, hoverDateIdx,
  placements, answers, submitted, correctMap,
}: BurnDownChartProps) {
  const totalH = Math.round(width * 0.65);
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = totalH - MARGIN.top - MARGIN.bottom;

  const { blue, red } = getChartData();
  const bluePath = buildPath(blue, allDates, plotW, plotH);
  const redPath  = buildPath(red,  allDates, plotW, plotH);

  // reverse map: letterIdx → dateColIdx (ANS 0-based) → overall allDates idx
  const d2a: Record<number, number | null> = {};
  ansDates.forEach((_, ai) => { d2a[ai] = null; });
  for (const [lStr, aCol] of Object.entries(placements)) {
    if (aCol !== null) d2a[aCol] = parseInt(lStr, 10);
  }

  return (
    <Svg width={width} height={totalH}>
      {/* ── Grid ── */}
      {Y_TICKS.map((yv) => {
        const sy = scaleY(yv, plotH);
        return (
          <Line
            key={`yg${yv}`}
            x1={MARGIN.left} y1={sy}
            x2={MARGIN.left + plotW} y2={sy}
            stroke="#E0E0E0" strokeWidth={1}
            strokeDasharray={yv === 0 ? undefined : '3,3'}
          />
        );
      })}

      {/* ── ANS column vertical highlights ── */}
      {ansDates.map((ad, ai) => {
        const xi = dateToIdx(ad, allDates);
        if (xi < 0) return null;
        const sx = scaleX(xi, allDates.length, plotW);
        const isHov = hoverDateIdx === ai;
        const occupant = d2a[ai];
        const hasDrop = occupant !== null && occupant !== undefined;
        const isCorrectCol = submitted && occupant !== null && occupant !== undefined
          && correctMap[occupant] === ai;
        const isWrongCol = submitted && hasDrop && !isCorrectCol;

        return (
          <G key={`col${ai}`}>
            {/* Column highlight band */}
            <Rect
              x={sx - 14} y={MARGIN.top}
              width={28} height={plotH}
              fill={
                isHov ? 'rgba(21,101,192,0.12)'
                  : hasDrop && submitted ? (isCorrectCol ? 'rgba(46,125,50,0.1)' : 'rgba(198,40,40,0.08)')
                  : hasDrop ? 'rgba(21,101,192,0.08)'
                  : 'transparent'
              }
              rx={4}
            />
            {/* Vertical dashed line */}
            <Line
              x1={sx} y1={MARGIN.top}
              x2={sx} y2={MARGIN.top + plotH}
              stroke={
                isHov ? '#1565C0'
                  : isCorrectCol ? Colors.success
                  : isWrongCol ? Colors.error
                  : '#BDBDBD'
              }
              strokeWidth={isHov || hasDrop ? 1.5 : 1}
              strokeDasharray="4,3"
              opacity={isHov || hasDrop ? 1 : 0.6}
            />
            {/* Placed letter badge in chart */}
            {hasDrop && occupant !== null ? (
              <G>
                <Circle
                  cx={sx} cy={MARGIN.top + plotH - 12}
                  r={10}
                  fill={submitted
                    ? isCorrectCol ? Colors.success : Colors.error
                    : '#1565C0'}
                  opacity={0.9}
                />
                <SvgText
                  x={sx} y={MARGIN.top + plotH - 7}
                  fontSize={10} fontWeight="bold"
                  fill="#fff" textAnchor="middle"
                >
                  {String.fromCharCode(65 + (occupant as number))}
                </SvgText>
              </G>
            ) : null}
          </G>
        );
      })}

      {/* ── Axes ── */}
      <Line
        x1={MARGIN.left} y1={MARGIN.top}
        x2={MARGIN.left} y2={MARGIN.top + plotH}
        stroke="#888" strokeWidth={1.5}
      />
      <Line
        x1={MARGIN.left} y1={MARGIN.top + plotH}
        x2={MARGIN.left + plotW} y2={MARGIN.top + plotH}
        stroke="#888" strokeWidth={1.5}
      />

      {/* ── Y tick labels ── */}
      {Y_TICKS.map((yv) => (
        <SvgText
          key={`yl${yv}`}
          x={MARGIN.left - 4}
          y={scaleY(yv, plotH) + 4}
          fontSize={8} fill="#666" textAnchor="end"
        >{yv}</SvgText>
      ))}

      {/* ── X tick labels ── */}
      {allDates.map((d, i) => {
        const sx = scaleX(i, allDates.length, plotW);
        const isAns = ansDates.includes(d);
        return (
          <SvgText
            key={`xl${i}`}
            x={sx}
            y={MARGIN.top + plotH + 14}
            fontSize={isAns ? 8.5 : 7}
            fontWeight={isAns ? 'bold' : 'normal'}
            fill={isAns ? '#1565C0' : '#999'}
            textAnchor="middle"
          >{d}</SvgText>
        );
      })}

      {/* ── Blue curve (Work Left) ── */}
      <Path d={bluePath} stroke="#1565C0" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
      {blue.map((p, i) => (
        <Circle
          key={`bd${i}`}
          cx={scaleX(dateToIdx(p.date, allDates), allDates.length, plotW)}
          cy={scaleY(p.value, plotH)}
          r={3.5} fill="#1565C0"
        />
      ))}

      {/* ── Red curve (Ideal Burndown) ── */}
      <Path d={redPath} stroke="#C62828" strokeWidth={2} fill="none" strokeDasharray="6,3" strokeLinejoin="round" />
      {red.map((p, i) => (
        <Circle
          key={`rd${i}`}
          cx={scaleX(dateToIdx(p.date, allDates), allDates.length, plotW)}
          cy={scaleY(p.value, plotH)}
          r={2.5} fill="#C62828"
        />
      ))}

      {/* ── Y-axis title ── */}
      <SvgText
        x={9}
        y={MARGIN.top + plotH / 2}
        fontSize={7} fill="#555"
        textAnchor="middle"
        rotation={-90}
        originX={9}
        originY={MARGIN.top + plotH / 2}
      >
        Hours Remaining
      </SvgText>
    </Svg>
  );
}

// ─── Draggable Answer Box ─────────────────────────────────────────────────────

interface DragBoxProps {
  letter: string;
  label: string;
  letterIdx: number;
  colViewRefs: React.MutableRefObject<(View | null)[]>;
  colLayouts: React.MutableRefObject<({ x: number; y: number; w: number; h: number } | null)[]>;
  onDrop: (letterIdx: number, colIdx: number) => void;
  onHover: (colIdx: number | null) => void;
  onDragStateChange: (letterIdx: number, dragging: boolean) => void;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  placedColIdx: number | null;
  isBeingDragged: boolean;
}

function DragBox({
  letter, label, letterIdx,
  colViewRefs, colLayouts,
  onDrop, onHover, onDragStateChange,
  isSubmitted, isCorrect, placedColIdx, isBeingDragged,
}: DragBoxProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const isSubmittedRef = useRef(isSubmitted);
  const onDropRef = useRef(onDrop);
  const onHoverRef = useRef(onHover);
  const onDSCRef = useRef(onDragStateChange);
  useEffect(() => { isSubmittedRef.current = isSubmitted; }, [isSubmitted]);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onDSCRef.current = onDragStateChange; }, [onDragStateChange]);

  const remeasureAll = useCallback(() => {
    colViewRefs.current.forEach((r, i) => {
      if (r) {
        r.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) colLayouts.current[i] = { x, y, w, h };
        });
      }
    });
  }, [colViewRefs, colLayouts]);

  const hitTest = useCallback((gx: number, gy: number): number | null => {
    for (let i = 0; i < colLayouts.current.length; i++) {
      const l = colLayouts.current[i];
      if (!l) continue;
      if (gx >= l.x && gx <= l.x + l.w && gy >= l.y && gy <= l.y + l.h) return i;
    }
    return null;
  }, [colLayouts]);

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => !isSubmittedRef.current,
      onMoveShouldSetPanResponderCapture:  () => !isSubmittedRef.current,
      onStartShouldSetPanResponder:        () => !isSubmittedRef.current,
      onMoveShouldSetPanResponder:         () => !isSubmittedRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value ?? 0, y: (pan.y as any)._value ?? 0 });
        pan.setValue({ x: 0, y: 0 });
        onDSCRef.current(letterIdx, true);
        remeasureAll();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        {
          useNativeDriver: false,
          listener: (_e: any, gs: any) => {
            onHoverRef.current(hitTest(gs.moveX, gs.moveY));
          },
        }
      ),
      onPanResponderRelease: (_e, gs) => {
        pan.flattenOffset();
        onHoverRef.current(null);
        onDSCRef.current(letterIdx, false);
        const hit = hitTest(gs.moveX, gs.moveY);
        if (hit !== null) onDropRef.current(letterIdx, hit);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, bounciness: 4 }).start();
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        onHoverRef.current(null);
        onDSCRef.current(letterIdx, false);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const borderColor = isSubmitted
    ? isCorrect === true ? Colors.success
      : isCorrect === false ? Colors.error
      : '#BDBDBD'
    : placedColIdx !== null ? '#1565C0' : '#BDBDBD';

  const bgColor = isSubmitted
    ? isCorrect === true ? '#E8F5E9'
      : isCorrect === false ? '#FFEBEE'
      : '#F5F5F5'
    : placedColIdx !== null ? '#E3F2FD' : '#F5F5F5';

  return (
    <Animated.View
      {...pr.panHandlers}
      style={[
        dragStyles.box,
        { backgroundColor: bgColor, borderColor },
        { transform: pan.getTranslateTransform() },
        isBeingDragged ? dragStyles.dragging : null,
      ]}
    >
      <View style={[dragStyles.badge, { backgroundColor: borderColor }]}>
        <Text style={dragStyles.badgeLetter} selectable={false}>{letter}</Text>
      </View>
      <Text style={dragStyles.label} numberOfLines={4} selectable={false}>{label}</Text>
      {isSubmitted && isCorrect === true
        ? <MaterialIcons name="check-circle" size={12} color={Colors.success} />
        : null}
      {isSubmitted && isCorrect === false
        ? <MaterialIcons name="cancel" size={12} color={Colors.error} />
        : null}
    </Animated.View>
  );
}

const dragStyles = StyleSheet.create({
  box: {
    width: 78,
    minHeight: 86,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    gap: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
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
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLetter: {
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
    lineHeight: 13,
    flex: 1,
    userSelect: 'none' as any,
  },
});

// ─── Column Drop Zone ─────────────────────────────────────────────────────────

interface ColZoneProps {
  dateLabel: string;
  assignedLetter: string | null;
  isHovered: boolean;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  onClear: () => void;
  viewRef: (ref: View | null) => void;
  onLayout: () => void;
}

function ColZone({
  dateLabel, assignedLetter, isHovered,
  isSubmitted, isCorrect, onClear, viewRef, onLayout,
}: ColZoneProps) {
  const borderColor = isSubmitted
    ? isCorrect === true ? Colors.success
      : isCorrect === false ? Colors.error
      : '#BDBDBD'
    : isHovered ? '#1565C0'
    : assignedLetter ? '#1565C0'
    : Colors.surfaceBorder;

  const bgColor = isSubmitted
    ? isCorrect === true ? '#E8F5E9'
      : isCorrect === false ? '#FFEBEE'
      : Colors.surfaceElevated
    : isHovered ? 'rgba(21,101,192,0.12)'
    : assignedLetter ? '#E3F2FD'
    : Colors.surfaceElevated;

  return (
    <View
      ref={viewRef}
      onLayout={onLayout}
      style={[colZoneStyles.box, { borderColor, backgroundColor: bgColor },
        isHovered ? colZoneStyles.hovered : null]}
    >
      <Text style={colZoneStyles.dateLabel} selectable={false}>{dateLabel}</Text>
      <View style={[colZoneStyles.divider, { backgroundColor: borderColor }]} />
      {assignedLetter ? (
        <View style={[colZoneStyles.letterBadge, {
          backgroundColor: isSubmitted
            ? isCorrect === true ? Colors.success : isCorrect === false ? Colors.error : '#1565C0'
            : '#1565C0',
        }]}>
          <Text style={colZoneStyles.letterText} selectable={false}>{assignedLetter}</Text>
        </View>
      ) : (
        <View style={colZoneStyles.emptySlot}>
          <Text style={colZoneStyles.emptyText} selectable={false}>—</Text>
        </View>
      )}
      {isSubmitted && isCorrect === true
        ? <MaterialIcons name="check-circle" size={10} color={Colors.success} />
        : null}
      {isSubmitted && isCorrect === false
        ? <MaterialIcons name="cancel" size={10} color={Colors.error} />
        : null}
      {assignedLetter && !isSubmitted ? (
        <Pressable
          onPress={onClear}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={colZoneStyles.clearBtn}
        >
          <MaterialIcons name="close" size={9} color={Colors.error} />
        </Pressable>
      ) : null}
    </View>
  );
}

const colZoneStyles = StyleSheet.create({
  box: {
    flex: 1,
    minHeight: 72,
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
  hovered: { elevation: 6, shadowOpacity: 0.25 },
  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 0.2,
    userSelect: 'none' as any,
  },
  divider: { width: '60%', height: 1, opacity: 0.4 },
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
    userSelect: 'none' as any,
  },
  emptySlot: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 11, color: Colors.textMuted, userSelect: 'none' as any },
  clearBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <View style={legStyles.row}>
      <View style={legStyles.item}>
        <View style={[legStyles.line, { backgroundColor: '#1565C0' }]} />
        <Text style={legStyles.txt} selectable={false}>Work Left (Hours)</Text>
      </View>
      <View style={legStyles.item}>
        <View style={[legStyles.line, { backgroundColor: '#C62828', borderStyle: 'dashed', borderBottomWidth: 1.5, borderBottomColor: '#C62828' }]} />
        <Text style={legStyles.txt} selectable={false}>Ideal Burndown</Text>
      </View>
    </View>
  );
}

const legStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, paddingVertical: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { width: 20, height: 2.5, borderRadius: 2 },
  txt: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
});

// ─── Parse CORRECT ────────────────────────────────────────────────────────────

function parseCorrect(correct: string): Record<number, number> {
  const map: Record<number, number> = {};
  for (const part of correct.split(',')) {
    const [lStr, cStr] = part.trim().split(':');
    const letter = lStr?.trim().toUpperCase();
    const col1 = parseInt(cStr?.trim() ?? '', 10);
    const li = letter?.charCodeAt(0) - 65; // A=0, B=1, …
    if (!isNaN(li) && li >= 0 && !isNaN(col1)) {
      map[li] = col1 - 1; // store 0-based
    }
  }
  return map;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BurnDownMatchQuestion({ data, onClose }: Props) {
  // Column labels from ANS1–ANS6
  const ansDates = [
    data.ANS1, data.ANS2, data.ANS3, data.ANS4, data.ANS5, data.ANS6,
  ].filter((v): v is string => !!v);

  // Draggable box labels from AIMG1–AIMG6
  const answers = [
    data.AIMG1, data.AIMG2, data.AIMG3, data.AIMG4, data.AIMG5, data.AIMG6,
  ].filter((v): v is string => !!v);

  const { allDates } = getChartData(data.QIMG);

  // placements: letterIdx (0-based) → ansDateColIdx (0-based) | null
  const initPlacements = Object.fromEntries(answers.map((_, i) => [i, null])) as Record<number, number | null>;
  const [placements, setPlacements] = useState<Record<number, number | null>>(initPlacements);
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [hoverColIdx, setHoverColIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingLetterIdx, setDraggingLetterIdx] = useState<number | null>(null);

  // Chart sizing
  const screenW = Dimensions.get('window').width;
  const [chartW, setChartW] = useState(Math.max(200, screenW - Spacing.md * 2 - 2));
  const handleChartLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setChartW(width);
  };

  // Column zone refs & layouts
  const colViewRefs = useRef<(View | null)[]>(Array(ansDates.length).fill(null));
  const colLayouts  = useRef<({ x: number; y: number; w: number; h: number } | null)[]>(
    Array(ansDates.length).fill(null)
  );

  const measureCol = useCallback((i: number) => {
    const r = colViewRefs.current[i];
    if (r) r.measureInWindow((x, y, w, h) => { if (w > 0) colLayouts.current[i] = { x, y, w, h }; });
  }, []);

  const measureAllCols = useCallback(() => {
    ansDates.forEach((_, i) => measureCol(i));
  }, [ansDates.length, measureCol]);

  useEffect(() => {
    measureAllCols();
    const t = setTimeout(measureAllCols, 150);
    return () => clearTimeout(t);
  }, [chartW, measureAllCols]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setTimeout(measureAllCols, 150));
    return () => sub.remove();
  }, [measureAllCols]);

  // Reverse map: colIdx → letterIdx | null
  const colToLetter = useCallback((): Record<number, number | null> => {
    const m: Record<number, number | null> = {};
    ansDates.forEach((_, i) => { m[i] = null; });
    for (const [lStr, col] of Object.entries(placements)) {
      if (col !== null) m[col] = parseInt(lStr, 10);
    }
    return m;
  }, [placements, ansDates.length]);

  const handleDragStateChange = useCallback((li: number, dragging: boolean) => {
    setIsDragging(dragging);
    setDraggingLetterIdx(dragging ? li : null);
  }, []);

  const handleDrop = useCallback((letterIdx: number, colIdx: number) => {
    if (submitted) return;
    setPlacements((prev) => {
      const next = { ...prev };
      // Evict previous occupant of this column
      for (const k of Object.keys(next)) {
        if (next[parseInt(k)] === colIdx) next[parseInt(k)] = null;
      }
      next[letterIdx] = colIdx;
      return next;
    });
  }, [submitted]);

  const handleClearCol = (colIdx: number) => {
    if (submitted) return;
    setPlacements((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[parseInt(k)] === colIdx) next[parseInt(k)] = null;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const correctMap = parseCorrect(data.CORRECT);
    let allCorrect = true;
    const parts: string[] = [];
    for (const [lStr, correctColIdx] of Object.entries(correctMap)) {
      const li = parseInt(lStr, 10);
      const letter = String.fromCharCode(65 + li);
      const ansLabel = answers[li] ?? '';
      const correctDateLabel = ansDates[correctColIdx] ?? `Col${correctColIdx + 1}`;
      const userCol = placements[li];
      if (userCol === correctColIdx) {
        parts.push(`${letter} (${ansLabel}): ✅ ${correctDateLabel}`);
      } else {
        allCorrect = false;
        const userLabel = userCol !== null && userCol !== undefined
          ? (ansDates[userCol] ?? `Col${userCol + 1}`) : '(not placed)';
        parts.push(`${letter} (${ansLabel}):\n  yours: ${userLabel}  correct: ${correctDateLabel}`);
      }
    }
    setSubmitted(true);
    setResultMessage(
      (allCorrect ? '✅ All Correct!' : '❌ Some answers are wrong.') + '\n\n' + parts.join('\n')
    );
  };

  const handleReset = () => {
    setPlacements(Object.fromEntries(answers.map((_, i) => [i, null])) as Record<number, number | null>);
    setSubmitted(false);
    setResultMessage(null);
  };

  const correctMap = submitted ? parseCorrect(data.CORRECT) : {};

  const letterIsCorrect = (li: number): boolean | null => {
    if (!submitted) return null;
    const placed = placements[li];
    if (placed === null || placed === undefined) return null;
    return correctMap[li] === placed;
  };

  const colIsCorrect = (colIdx: number): boolean | null => {
    if (!submitted) return null;
    const c2l = colToLetter();
    const li = c2l[colIdx];
    if (li === null || li === undefined) return null;
    return correctMap[li] === colIdx;
  };

  const c2l = colToLetter();

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
        <View style={styles.qBadge}>
          <MaterialIcons name="help-outline" size={13} color={Colors.warning} />
          <Text style={styles.qBadgeText} selectable={false}>Question</Text>
        </View>
        <Text style={styles.questionText}>{data.QUESTION}</Text>
      </View>

      {/* Chart */}
      <View
        style={styles.chartWrap}
        onLayout={handleChartLayout}
      >
        <BurnDownChart
          width={chartW}
          allDates={allDates}
          ansDates={ansDates}
          hoverDateIdx={hoverColIdx}
          placements={placements}
          answers={answers}
          submitted={submitted}
          correctMap={correctMap}
        />
      </View>
      <Legend />

      {/* ── Column drop zones ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel} selectable={false}>
          Date columns — drop an answer box here
        </Text>
        <View style={styles.colRow}>
          {ansDates.map((dl, ci) => {
            const li = c2l[ci];
            const assignedLetter = li !== null && li !== undefined
              ? String.fromCharCode(65 + li) : null;
            return (
              <ColZone
                key={ci}
                dateLabel={dl}
                assignedLetter={assignedLetter}
                isHovered={hoverColIdx === ci}
                isSubmitted={submitted}
                isCorrect={colIsCorrect(ci)}
                onClear={() => handleClearCol(ci)}
                viewRef={(r) => { colViewRefs.current[ci] = r; }}
                onLayout={() => setTimeout(() => measureCol(ci), 100)}
              />
            );
          })}
        </View>
      </View>

      {/* ── Draggable answer boxes (above drop zones in z-order) ── */}
      <View style={[styles.section, styles.dragSection]}>
        <Text style={styles.sectionLabel} selectable={false}>
          Status boxes — drag to a date above
        </Text>
        <View style={styles.dragRow} pointerEvents="box-none">
          {answers.map((label, li) => (
            <DragBox
              key={li}
              letter={String.fromCharCode(65 + li)}
              label={label}
              letterIdx={li}
              colViewRefs={colViewRefs}
              colLayouts={colLayouts}
              onDrop={handleDrop}
              onHover={setHoverColIdx}
              onDragStateChange={handleDragStateChange}
              isSubmitted={submitted}
              isCorrect={letterIsCorrect(li)}
              placedColIdx={placements[li] ?? null}
              isBeingDragged={draggingLetterIdx === li}
            />
          ))}
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
        <View style={[styles.resultBox,
          resultMessage.startsWith('✅') ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultText}>{resultMessage}</Text>
        </View>
      ) : null}

      {/* Explain */}
      {submitted && data.EXPLAIN ? (
        <View style={styles.explainBox}>
          <View style={styles.explainHeader}>
            <MaterialIcons name="lightbulb-outline" size={15} color={Colors.warning} />
            <Text style={styles.explainTitle}>Explanation</Text>
          </View>
          <Text style={styles.explainText}>{data.EXPLAIN}</Text>
        </View>
      ) : null}

      {/* Debug */}
      <View style={styles.rawBox}>
        <Text style={styles.rawLabel}>CORRECT field: </Text>
        <Text style={styles.rawValue} selectable>{data.CORRECT}</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    gap: 6,
  },
  qBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  qBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.3,
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
  section: { gap: Spacing.sm },
  dragSection: { zIndex: 10, elevation: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  colRow: { flexDirection: 'row', gap: 4 },
  dragRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: Spacing.xs,
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
  explainBox: {
    backgroundColor: '#FFFDE7',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FFF176',
    padding: Spacing.md,
    gap: 6,
  },
  explainHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  explainTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.warning },
  explainText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 20 },
  rawBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 4,
  },
  rawLabel: { fontSize: 10, color: '#8B949E', fontFamily: 'monospace' },
  rawValue: { fontSize: 11, color: '#58A6FF', fontFamily: 'monospace', flex: 1 },
});
