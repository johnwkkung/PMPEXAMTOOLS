/**
 * DropDownQuestion
 * Select-from-dropdown question type for QTST003.
 * - ANS1–ANS6 (non-null) are the selectable options
 * - User picks one answer from the dropdown
 * - Validates selection against the CORRECT field on Submit
 *
 * CORRECT field formats supported:
 *   "ANS2"          – matches the ANSx label name
 *   "2"             – 1-based index into ANS1..ANS6
 *   "On Schedule"   – direct text match against an option value
 */
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { ScaledText as Text } from '@/components/ui/ScaledText';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropDownQuestionData {
  QUESTION: string;
  /** Selectable option labels (non-null entries form the dropdown list) */
  ANS1: string;
  ANS2?: string | null;
  ANS3?: string | null;
  ANS4?: string | null;
  ANS5?: string | null;
  ANS6?: string | null;
  /**
   * Correct answer. Supported formats:
   *  • "ANS2"       – key name
   *  • "2"          – 1-based index
   *  • exact text   – value match against the option
   */
  CORRECT: string;
  QIMG?: string | null;
  EXPLAIN?: string | null;
  QTYPE?: string | null;
}

interface Props {
  data: DropDownQuestionData;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the CORRECT field to the 0-based index of the correct option.
 * Returns -1 if it cannot be resolved.
 */
function resolveCorrectIdx(correct: string, options: string[]): number {
  const c = correct.trim();

  // Format: "ANS1" … "ANS6"
  const ansMatch = c.match(/^ANS(\d)$/i);
  if (ansMatch) {
    const oneBased = parseInt(ansMatch[1], 10);
    return oneBased - 1; // 0-based
  }

  // Format: "1" … "6"  (1-based index)
  const numOnly = parseInt(c, 10);
  if (!isNaN(numOnly) && String(numOnly) === c) {
    return numOnly - 1;
  }

  // Format: exact text match
  const textIdx = options.findIndex(
    (o) => o.trim().toLowerCase() === c.toLowerCase()
  );
  if (textIdx >= 0) return textIdx;

  return -1;
}

// ─── Dropdown picker (custom modal-based) ────────────────────────────────────

interface DropdownProps {
  options: string[];
  selected: number | null;
  onSelect: (idx: number) => void;
  disabled: boolean;
  isSubmitted: boolean;
  isCorrect: boolean | null;
}

function Dropdown({ options, selected, onSelect, disabled, isSubmitted, isCorrect }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const handleSelect = (idx: number) => {
    onSelect(idx);
    closeDropdown();
  };

  const selectedLabel = selected !== null ? options[selected] : null;

  const borderColor = isSubmitted
    ? isCorrect === true ? Colors.success : isCorrect === false ? Colors.error : Colors.surfaceBorder
    : selected !== null ? Colors.accent : Colors.surfaceBorder;

  const bgColor = isSubmitted
    ? isCorrect === true ? '#E8F5E9' : isCorrect === false ? '#FFEBEE' : Colors.surfaceElevated
    : Colors.surfaceElevated;

  return (
    <>
      <Pressable
        onPress={openDropdown}
        disabled={disabled}
        style={({ pressed }) => [
          ddStyles.trigger,
          { borderColor, backgroundColor: bgColor },
          pressed && !disabled ? { opacity: 0.85 } : null,
          disabled ? ddStyles.triggerDisabled : null,
        ]}
      >
        <Text
          style={[ddStyles.triggerText, !selectedLabel ? ddStyles.placeholder : null]}
          numberOfLines={2}
          selectable={false}
        >
          {selectedLabel ?? 'Tap to select an answer…'}
        </Text>
        <View style={ddStyles.triggerRight}>
          {isSubmitted && isCorrect === true
            ? <MaterialIcons name="check-circle" size={20} color={Colors.success} />
            : isSubmitted && isCorrect === false
            ? <MaterialIcons name="cancel" size={20} color={Colors.error} />
            : <MaterialIcons name="expand-more" size={22} color={disabled ? Colors.textMuted : Colors.accent} />}
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        <Pressable style={ddStyles.backdrop} onPress={closeDropdown}>
          <Animated.View
            style={[ddStyles.sheet, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
          >
            <View style={ddStyles.sheetHeader}>
              <Text style={ddStyles.sheetTitle}>Select an answer</Text>
              <Pressable
                onPress={closeDropdown}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={ddStyles.optionList}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {options.map((opt, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSelect(idx)}
                  style={({ pressed }) => [
                    ddStyles.option,
                    selected === idx ? ddStyles.optionSelected : null,
                    pressed ? ddStyles.optionPressed : null,
                    idx < options.length - 1 ? ddStyles.optionBorder : null,
                  ]}
                >
                  <View style={[
                    ddStyles.optionBullet,
                    selected === idx ? { backgroundColor: Colors.accent } : null,
                  ]}>
                    <Text style={[
                      ddStyles.optionBulletText,
                      selected === idx ? { color: '#fff' } : null,
                    ]} selectable={false}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text
                    style={[ddStyles.optionText, selected === idx ? ddStyles.optionTextSelected : null]}
                    selectable={false}
                  >
                    {opt}
                  </Text>
                  {selected === idx
                    ? <MaterialIcons name="check" size={18} color={Colors.accent} />
                    : null}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const ddStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    minHeight: 54,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerText: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  placeholder: {
    color: Colors.textMuted,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  triggerRight: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  sheetTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  optionList: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  optionSelected: {
    backgroundColor: `${Colors.accent}14`,
  },
  optionPressed: {
    backgroundColor: Colors.surface,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  optionBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBulletText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  optionText: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: Colors.accent,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DropDownQuestion({ data, onClose }: Props) {
  const options = [
    data.ANS1, data.ANS2, data.ANS3, data.ANS4, data.ANS5, data.ANS6,
  ].filter((v): v is string => !!v);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const correctIdx = resolveCorrectIdx(data.CORRECT, options);

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    const correct = selectedIdx === correctIdx;
    setIsCorrect(correct);
    setSubmitted(true);
    if (correct) {
      setResultMessage(`✅ Correct!\n\nYou selected: "${options[selectedIdx]}"`);
    } else {
      const correctLabel = correctIdx >= 0 ? options[correctIdx] : `(CORRECT="${data.CORRECT}")`;
      setResultMessage(
        `❌ Wrong answer.\n\nYour answer:     "${options[selectedIdx]}"\nCorrect answer: "${correctLabel}"`
      );
    }
  };

  const handleReset = () => {
    setSelectedIdx(null);
    setSubmitted(false);
    setIsCorrect(null);
    setResultMessage(null);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={mainStyles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Question */}
      <View style={mainStyles.questionBox}>
        <View style={mainStyles.questionBadge}>
          <MaterialIcons name="help-outline" size={14} color={Colors.warning} />
          <Text style={mainStyles.questionBadgeText}>Question</Text>
        </View>
        <Text style={mainStyles.questionText}>{data.QUESTION}</Text>
      </View>

      {/* Dropdown */}
      <View style={mainStyles.dropdownSection}>
        <Text style={mainStyles.dropdownLabel}>Select your answer:</Text>
        <Dropdown
          options={options}
          selected={selectedIdx}
          onSelect={setSelectedIdx}
          disabled={submitted}
          isSubmitted={submitted}
          isCorrect={isCorrect}
        />
        {submitted && isCorrect === false && correctIdx >= 0 ? (
          <View style={mainStyles.correctHint}>
            <MaterialIcons name="info-outline" size={14} color={Colors.success} />
            <Text style={mainStyles.correctHintText}>
              Correct answer: <Text style={{ fontWeight: '700' }}>{options[correctIdx]}</Text>
            </Text>
          </View>
        ) : null}
      </View>

      {/* Option count badge */}
      <View style={mainStyles.optionCountRow}>
        <MaterialIcons name="list" size={14} color={Colors.textMuted} />
        <Text style={mainStyles.optionCountText}>{options.length} options available</Text>
      </View>

      {/* Submit / Reset */}
      {!submitted ? (
        <Pressable
          style={({ pressed }) => [
            mainStyles.submitBtn,
            selectedIdx === null ? mainStyles.submitBtnDisabled : null,
            pressed && selectedIdx !== null ? { opacity: 0.85 } : null,
          ]}
          onPress={handleSubmit}
          disabled={selectedIdx === null}
        >
          <MaterialIcons name="check-circle" size={18} color="#fff" />
          <Text style={mainStyles.submitBtnText}>Submit Answer</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [mainStyles.resetBtn, pressed ? { opacity: 0.85 } : null]}
          onPress={handleReset}
        >
          <MaterialIcons name="refresh" size={18} color={Colors.accent} />
          <Text style={mainStyles.resetBtnText}>Try Again</Text>
        </Pressable>
      )}

      {/* Result */}
      {resultMessage ? (
        <View style={[mainStyles.resultBox, isCorrect ? mainStyles.resultPass : mainStyles.resultFail]}>
          <Text style={mainStyles.resultText}>{resultMessage}</Text>
        </View>
      ) : null}

      {/* Explain */}
      {submitted && data.EXPLAIN ? (
        <View style={mainStyles.explainBox}>
          <View style={mainStyles.explainHeader}>
            <MaterialIcons name="lightbulb-outline" size={16} color={Colors.warning} />
            <Text style={mainStyles.explainTitle}>Explanation</Text>
          </View>
          <Text style={mainStyles.explainText}>{data.EXPLAIN}</Text>
        </View>
      ) : null}

      {/* Debug: CORRECT field */}
      <View style={mainStyles.rawBox}>
        <Text style={mainStyles.rawLabel}>CORRECT field: </Text>
        <Text style={mainStyles.rawValue} selectable>{data.CORRECT}</Text>
      </View>
    </ScrollView>
  );
}

const mainStyles = StyleSheet.create({
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
  dropdownSection: {
    gap: Spacing.sm,
  },
  dropdownLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  correctHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  correctHintText: {
    fontSize: Typography.sm,
    color: Colors.success,
    flex: 1,
    lineHeight: 20,
  },
  optionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
  },
  optionCountText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
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
