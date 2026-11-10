/**
 * PointClickQuestion
 * Renders two S-curve charts from bundled CSV data (mapped via QIMG filename).
 *
 * Upper board: reference chart — curves only (no interaction)
 * Lower board: interactive chart — same curves + labelled rectangular boxes (A–F)
 *              User taps a rectangle to select it; a red ✕ overlay marks the choice.
 *              Submit validates against CORRECT (1-based ANS index).
 *
 * ANS format: "xMin-xMax,yMin-yMax"  (in data units: Dollar / Percentage)
 * CORRECT:    "2"  (1-based ANS index)
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Text as SvgText,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { ScaledText as Text } from '@/components/ui/ScaledText';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PointClickData {
  QUESTION: string;
  /** "xMin-xMax,yMin-yMax" in data units (Dollar / Percentage) */
  ANS1: string;
  ANS2?: string | null;
  ANS3?: string | null;
  ANS4?: string | null;
  ANS5?: string | null;
  ANS6?: string | null;
  /** 1-based index of the correct ANS field */
  CORRECT: string;
  /** Filename key for the curve data, e.g. "PointClick.txt" */
  QIMG?: string | null;
  EXPLAIN?: string | null;
  QTYPE?: string | null;
}

interface Props {
  data: PointClickData;
  onClose: () => void;
}

// ─── Bundled curve data ───────────────────────────────────────────────────────

interface CurvePoint { x: number; y: number; }
interface CurveDataSet { before: CurvePoint[]; after: CurvePoint[]; }

/** Pre-parsed content of assets/images/Pointclick.txt */
const POINTCLICK_DATA: CurveDataSet = {
  before: [
    { x: 5500, y: 0 },  { x: 6000, y: 1 },  { x: 6500, y: 3 },
    { x: 7000, y: 9 },  { x: 7500, y: 20 }, { x: 8000, y: 62 },
    { x: 8500, y: 82 }, { x: 9000, y: 88 }, { x: 9500, y: 95 },
    { x: 10000, y: 100 },
  ],
  after: [
    { x: 5500, y: 0 },  { x: 6000, y: 2 },  { x: 6500, y: 6 },
    { x: 7000, y: 15 }, { x: 7500, y: 48 }, { x: 8000, y: 80 },
    { x: 8500, y: 90 }, { x: 9000, y: 95 }, { x: 9500, y: 97 },
    { x: 10000, y: 100 },
  ],
};

/** Map QIMG filename to the appropriate data set */
function getCurveData(qimg?: string | null): CurveDataSet {
  if (!qimg) return POINTCLICK_DATA;
  const upper = qimg.toUpperCase();
  if (upper.includes('POINTCLICK') || upper.includes('POINT_CLICK')) return POINTCLICK_DATA;
  return POINTCLICK_DATA; // default fallback
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BOX_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface ParsedBox {
  label: string;   // "A"–"F"
  ansIdx: number;  // 1-based
  xMin: number; xMax: number;
  yMin: number; yMax: number;
}

function parseAnsBoxes(data: PointClickData): ParsedBox[] {
  const raw = [
    data.ANS1, data.ANS2, data.ANS3, data.ANS4, data.ANS5, data.ANS6,
  ];
  const boxes: ParsedBox[] = [];
  raw.forEach((val, i) => {
    if (!val) return;
    // Format: "xMin-xMax,yMin-yMax"
    const [xPart, yPart] = val.split(',');
    if (!xPart || !yPart) return;
    const [xMin, xMax] = xPart.split('-').map(Number);
    const [yMin, yMax] = yPart.split('-').map(Number);
    if (isNaN(xMin) || isNaN(xMax) || isNaN(yMin) || isNaN(yMax)) return;
    boxes.push({ label: BOX_LABELS[i], ansIdx: i + 1, xMin, xMax, yMin, yMax });
  });
  return boxes;
}

function resolveCorrectAnsIdx(correct: string): number {
  const n = parseInt(correct.trim(), 10);
  return isNaN(n) ? -1 : n; // 1-based
}

// ─── Chart rendering helpers ──────────────────────────────────────────────────

const DATA_X_MIN = 5500;
const DATA_X_MAX = 10000;
const DATA_Y_MIN = 0;
const DATA_Y_MAX = 100;

const MARGIN = { top: 18, right: 16, bottom: 36, left: 44 };

function scaleX(val: number, plotW: number): number {
  return MARGIN.left + ((val - DATA_X_MIN) / (DATA_X_MAX - DATA_X_MIN)) * plotW;
}

function scaleY(val: number, plotH: number): number {
  // Y axis: 0 at bottom → plotH + MARGIN.top; 100 at top → MARGIN.top
  return MARGIN.top + (1 - (val - DATA_Y_MIN) / (DATA_Y_MAX - DATA_Y_MIN)) * plotH;
}

function buildPath(points: CurvePoint[], plotW: number, plotH: number): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.x, plotW).toFixed(1)},${scaleY(p.y, plotH).toFixed(1)}`)
    .join(' ');
}

const X_TICKS = [5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000];
const Y_TICKS = [0, 20, 40, 60, 80, 100];

// ─── Chart component ──────────────────────────────────────────────────────────

interface ChartProps {
  curveData: CurveDataSet;
  width: number;
  interactive: boolean;
  boxes: ParsedBox[];
  selectedAnsIdx: number | null;
  submitted: boolean;
  correctAnsIdx: number;
  onBoxPress?: (ansIdx: number) => void;
}

function Chart({
  curveData, width, interactive,
  boxes, selectedAnsIdx, submitted, correctAnsIdx, onBoxPress,
}: ChartProps) {
  const totalH = Math.round(width * 0.58);
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = totalH - MARGIN.top - MARGIN.bottom;

  const beforePath = buildPath(curveData.before, plotW, plotH);
  const afterPath  = buildPath(curveData.after,  plotW, plotH);

  return (
    <Svg width={width} height={totalH}>
      <Defs>
        <LinearGradient id="beforeGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1565C0" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#1565C0" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="afterGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C62828" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#C62828" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* ── Grid lines ── */}
      {Y_TICKS.map((yVal) => {
        const sy = scaleY(yVal, plotH);
        return (
          <Line
            key={`yg${yVal}`}
            x1={MARGIN.left} y1={sy}
            x2={MARGIN.left + plotW} y2={sy}
            stroke="#E0E0E0" strokeWidth={1}
            strokeDasharray={yVal === 0 ? undefined : '3,3'}
          />
        );
      })}
      {X_TICKS.map((xVal) => {
        const sx = scaleX(xVal, plotW);
        return (
          <Line
            key={`xg${xVal}`}
            x1={sx} y1={MARGIN.top}
            x2={sx} y2={MARGIN.top + plotH}
            stroke="#E0E0E0" strokeWidth={1}
            strokeDasharray="3,3"
          />
        );
      })}

      {/* ── Axes ── */}
      {/* Y axis */}
      <Line
        x1={MARGIN.left} y1={MARGIN.top}
        x2={MARGIN.left} y2={MARGIN.top + plotH}
        stroke="#888" strokeWidth={1.5}
      />
      {/* X axis */}
      <Line
        x1={MARGIN.left} y1={MARGIN.top + plotH}
        x2={MARGIN.left + plotW} y2={MARGIN.top + plotH}
        stroke="#888" strokeWidth={1.5}
      />

      {/* ── Y tick labels ── */}
      {Y_TICKS.map((yVal) => (
        <SvgText
          key={`yl${yVal}`}
          x={MARGIN.left - 4}
          y={scaleY(yVal, plotH) + 4}
          fontSize={8}
          fill="#666"
          textAnchor="end"
        >
          {yVal}%
        </SvgText>
      ))}

      {/* ── X tick labels ── */}
      {X_TICKS.map((xVal) => (
        <SvgText
          key={`xl${xVal}`}
          x={scaleX(xVal, plotW)}
          y={MARGIN.top + plotH + 14}
          fontSize={7.5}
          fill="#666"
          textAnchor="middle"
          rotation={-30}
          originX={scaleX(xVal, plotW)}
          originY={MARGIN.top + plotH + 14}
        >
          {xVal >= 1000 ? `$${(xVal / 1000).toFixed(1)}k` : `$${xVal}`}
        </SvgText>
      ))}

      {/* ── Interactive boxes (lower board only) ── */}
      {interactive && boxes.map((box) => {
        const bx1 = scaleX(box.xMin, plotW);
        const bx2 = scaleX(box.xMax, plotW);
        const by1 = scaleY(box.yMax, plotH); // yMax → smaller SVG y (higher on screen)
        const by2 = scaleY(box.yMin, plotH); // yMin → larger SVG y (lower on screen)
        const bw = bx2 - bx1;
        const bh = by2 - by1;
        const cx = (bx1 + bx2) / 2;
        const cy = (by1 + by2) / 2;

        const isSelected = selectedAnsIdx === box.ansIdx;
        const isCorrectBox = correctAnsIdx === box.ansIdx;
        const rectColor = submitted
          ? isCorrectBox ? Colors.success : '#888'
          : isSelected ? '#C62828' : '#1565C0';
        const rectOpacity = submitted
          ? isCorrectBox ? 0.25 : 0.1
          : isSelected ? 0.18 : 0.12;
        const strokeW = isSelected || (submitted && isCorrectBox) ? 2 : 1.2;

        return (
          <G key={box.label} onPress={() => !submitted && onBoxPress?.(box.ansIdx)}>
            {/* Fill */}
            <Rect
              x={bx1} y={by1} width={bw} height={bh}
              fill={rectColor} fillOpacity={rectOpacity}
              stroke={rectColor} strokeWidth={strokeW}
              rx={3}
            />

            {/* Label badge */}
            <Rect
              x={cx - 9} y={cy - 9}
              width={18} height={18}
              rx={9}
              fill={isSelected && !submitted ? '#C62828' : submitted && isCorrectBox ? Colors.success : '#1565C0'}
              fillOpacity={0.9}
            />
            <SvgText
              x={cx} y={cy + 5}
              fontSize={10}
              fontWeight="bold"
              fill="#fff"
              textAnchor="middle"
            >
              {box.label}
            </SvgText>

            {/* Red ✕ on selected (not submitted) */}
            {isSelected && !submitted ? (
              <G>
                <Line
                  x1={cx - 5} y1={cy - 14}
                  x2={cx + 5} y2={cy - 4}
                  stroke="#C62828" strokeWidth={2} strokeLinecap="round"
                />
                <Line
                  x1={cx + 5} y1={cy - 14}
                  x2={cx - 5} y2={cy - 4}
                  stroke="#C62828" strokeWidth={2} strokeLinecap="round"
                />
              </G>
            ) : null}

            {/* ✓ on correct box after submit */}
            {submitted && isCorrectBox ? (
              <G>
                <Line
                  x1={cx - 5} y1={cy - 14}
                  x2={cx - 1} y2={cy - 9}
                  stroke={Colors.success} strokeWidth={2} strokeLinecap="round"
                />
                <Line
                  x1={cx - 1} y1={cy - 9}
                  x2={cx + 5} y2={cy - 16}
                  stroke={Colors.success} strokeWidth={2} strokeLinecap="round"
                />
              </G>
            ) : null}
          </G>
        );
      })}

      {/* ── Non-interactive box labels (upper board) ── */}
      {!interactive && boxes.map((box) => {
        const bx1 = scaleX(box.xMin, plotW);
        const bx2 = scaleX(box.xMax, plotW);
        const by1 = scaleY(box.yMax, plotH);
        const by2 = scaleY(box.yMin, plotH);
        const bw = bx2 - bx1;
        const bh = by2 - by1;

        return (
          <Rect
            key={box.label}
            x={bx1} y={by1} width={bw} height={bh}
            fill="none"
            stroke="#1565C0" strokeWidth={1}
            rx={3}
            strokeDasharray="4,3"
            opacity={0.4}
          />
        );
      })}

      {/* ── Before Mitigation curve (Blue) ── */}
      <Path d={beforePath} stroke="#1565C0" strokeWidth={2} fill="none" strokeLinejoin="round" />

      {/* ── After Mitigation curve (Red) ── */}
      <Path d={afterPath} stroke="#C62828" strokeWidth={2} fill="none" strokeLinejoin="round" />

      {/* ── Data point dots ── */}
      {curveData.before.map((p, i) => (
        <SvgText
          key={`bd${i}`}
          x={scaleX(p.x, plotW)}
          y={scaleY(p.y, plotH)}
          fontSize={5}
          fill="#1565C0"
          textAnchor="middle"
        >●</SvgText>
      ))}
      {curveData.after.map((p, i) => (
        <SvgText
          key={`ad${i}`}
          x={scaleX(p.x, plotW)}
          y={scaleY(p.y, plotH)}
          fontSize={5}
          fill="#C62828"
          textAnchor="middle"
        >●</SvgText>
      ))}

      {/* ── Y-axis title ── */}
      <SvgText
        x={9}
        y={MARGIN.top + plotH / 2}
        fontSize={7.5}
        fill="#555"
        textAnchor="middle"
        rotation={-90}
        originX={9}
        originY={MARGIN.top + plotH / 2}
      >
        Percentage (%)
      </SvgText>
    </Svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend() {
  return (
    <View style={legendStyles.row}>
      <View style={legendStyles.item}>
        <View style={[legendStyles.line, { backgroundColor: '#1565C0' }]} />
        <Text style={legendStyles.text} selectable={false}>Before Mitigation</Text>
      </View>
      <View style={legendStyles.item}>
        <View style={[legendStyles.line, { backgroundColor: '#C62828' }]} />
        <Text style={legendStyles.text} selectable={false}>After Mitigation</Text>
      </View>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingTop: 2,
    paddingBottom: Spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  line: {
    width: 20,
    height: 2.5,
    borderRadius: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PointClickQuestion({ data, onClose }: Props) {
  const [selectedAnsIdx, setSelectedAnsIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const screenW = Dimensions.get('window').width;
  const chartW = Math.min(screenW - Spacing.md * 2, 480);

  const curveData = useMemo(() => getCurveData(data.QIMG), [data.QIMG]);
  const boxes = useMemo(() => parseAnsBoxes(data), [data]);
  const correctAnsIdx = useMemo(() => resolveCorrectAnsIdx(data.CORRECT), [data.CORRECT]);

  const handleBoxPress = (ansIdx: number) => {
    if (submitted) return;
    setSelectedAnsIdx((prev) => (prev === ansIdx ? null : ansIdx));
  };

  const handleSubmit = () => {
    if (selectedAnsIdx === null) return;
    const correct = selectedAnsIdx === correctAnsIdx;
    setIsCorrect(correct);
    setSubmitted(true);
    const selectedBox = boxes.find((b) => b.ansIdx === selectedAnsIdx);
    const correctBox  = boxes.find((b) => b.ansIdx === correctAnsIdx);
    if (correct) {
      setResultMessage(
        `✅ Correct!\n\nYou selected Box ${selectedBox?.label ?? selectedAnsIdx} — that is the correct region.`
      );
    } else {
      setResultMessage(
        `❌ Wrong answer.\n\nYour answer:     Box ${selectedBox?.label ?? selectedAnsIdx}\nCorrect answer: Box ${correctBox?.label ?? correctAnsIdx}`
      );
    }
  };

  const handleReset = () => {
    setSelectedAnsIdx(null);
    setSubmitted(false);
    setIsCorrect(null);
    setResultMessage(null);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Question */}
      <View style={styles.questionBox}>
        <View style={styles.questionBadge}>
          <MaterialIcons name="help-outline" size={14} color={Colors.warning} />
          <Text style={styles.questionBadgeText} selectable={false}>Question</Text>
        </View>
        <Text style={styles.questionText}>{data.QUESTION}</Text>
      </View>

      {/* ── Upper Board: Reference chart (curves only, no click) ── */}
      <View style={styles.boardWrap}>
        <View style={styles.boardHeader}>
          <MaterialIcons name="show-chart" size={15} color="#1565C0" />
          <Text style={styles.boardTitle} selectable={false}>Reference Chart</Text>
          <Text style={styles.boardHint} selectable={false}>(read-only)</Text>
        </View>
        <View style={styles.chartBox}>
          <Chart
            curveData={curveData}
            width={chartW}
            interactive={false}
            boxes={[]}
            selectedAnsIdx={null}
            submitted={false}
            correctAnsIdx={-1}
          />
        </View>
        <ChartLegend />
      </View>

      {/* ── Lower Board: Interactive chart with boxes ── */}
      <View style={styles.boardWrap}>
        <View style={styles.boardHeader}>
          <MaterialIcons name="touch-app" size={15} color="#C62828" />
          <Text style={styles.boardTitle} selectable={false}>Tap the correct region</Text>
          <Text style={styles.boardHint} selectable={false}>
            {selectedAnsIdx !== null
              ? `Box ${boxes.find((b) => b.ansIdx === selectedAnsIdx)?.label ?? selectedAnsIdx} selected`
              : 'no selection'}
          </Text>
        </View>
        <View style={styles.chartBox}>
          <Chart
            curveData={curveData}
            width={chartW}
            interactive={!submitted}
            boxes={boxes}
            selectedAnsIdx={selectedAnsIdx}
            submitted={submitted}
            correctAnsIdx={correctAnsIdx}
            onBoxPress={handleBoxPress}
          />
        </View>
        <ChartLegend />

        {/* Box legend */}
        {boxes.length > 0 ? (
          <View style={styles.boxLegendRow}>
            {boxes.map((box) => {
              const isSelected = selectedAnsIdx === box.ansIdx;
              const isCorrectBox = submitted && correctAnsIdx === box.ansIdx;
              const bg = isCorrectBox
                ? Colors.success
                : isSelected ? '#C62828' : '#1565C0';
              return (
                <Pressable
                  key={box.label}
                  style={({ pressed }) => [
                    styles.boxLegendItem,
                    isSelected ? styles.boxLegendSelected : null,
                    isCorrectBox ? styles.boxLegendCorrect : null,
                    pressed && !submitted ? { opacity: 0.75 } : null,
                  ]}
                  onPress={() => handleBoxPress(box.ansIdx)}
                  disabled={submitted}
                >
                  <View style={[styles.boxLegendBadge, { backgroundColor: bg }]}>
                    <Text style={styles.boxLegendLetter} selectable={false}>{box.label}</Text>
                  </View>
                  <Text style={styles.boxLegendRange} selectable={false} numberOfLines={1}>
                    ${box.xMin}–${box.xMax}
                  </Text>
                  {isSelected && !submitted
                    ? <MaterialIcons name="close" size={13} color="#C62828" />
                    : null}
                  {isCorrectBox
                    ? <MaterialIcons name="check" size={13} color={Colors.success} />
                    : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Submit / Reset */}
      {!submitted ? (
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            selectedAnsIdx === null ? styles.submitBtnDisabled : null,
            pressed && selectedAnsIdx !== null ? { opacity: 0.85 } : null,
          ]}
          onPress={handleSubmit}
          disabled={selectedAnsIdx === null}
        >
          <MaterialIcons name="check-circle" size={18} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Answer</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed ? { opacity: 0.85 } : null]}
          onPress={handleReset}
        >
          <MaterialIcons name="refresh" size={18} color={Colors.accent} />
          <Text style={styles.resetBtnText}>Try Again</Text>
        </Pressable>
      )}

      {/* Result */}
      {resultMessage ? (
        <View style={[styles.resultBox, isCorrect ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultText}>{resultMessage}</Text>
        </View>
      ) : null}

      {/* Explanation */}
      {submitted && data.EXPLAIN ? (
        <View style={styles.explainBox}>
          <View style={styles.explainHeader}>
            <MaterialIcons name="lightbulb-outline" size={16} color={Colors.warning} />
            <Text style={styles.explainTitle}>Explanation</Text>
          </View>
          <Text style={styles.explainText}>{data.EXPLAIN}</Text>
        </View>
      ) : null}

      {/* Debug */}
      <View style={styles.rawBox}>
        <Text style={styles.rawLabel}>CORRECT field: </Text>
        <Text style={styles.rawValue} selectable>{data.CORRECT}  →  ANS{data.CORRECT}</Text>
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
    gap: Spacing.sm,
  },
  questionBadge: {
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
  questionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.3,
  },
  questionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  boardWrap: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    ...Shadows.card,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  boardTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  boardHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  chartBox: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    backgroundColor: '#fff',
  },
  boxLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  boxLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  boxLegendSelected: {
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  boxLegendCorrect: {
    borderColor: Colors.success,
    backgroundColor: '#E8F5E9',
  },
  boxLegendBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLegendLetter: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  boxLegendRange: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textMuted,
    elevation: 0,
    shadowOpacity: 0,
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
    borderColor: Colors.accent,
  },
  resetBtnText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.accent,
  },
  resultBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  resultPass: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  resultFail: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  resultText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  explainBox: {
    backgroundColor: '#FFFDE7',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FFF176',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explainTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.warning,
  },
  explainText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
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
