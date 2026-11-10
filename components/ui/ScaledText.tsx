import { forwardRef, memo, useMemo } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { useFontSize } from '@/hooks/useFontSize';

interface ScaledTextProps extends TextProps {}

/** Applies the global size to formerly fixed-size text without double-scaling inherited nested text. */
export const ScaledText = memo(forwardRef<Text, ScaledTextProps>(function ScaledText({ style, ...props }, ref) {
  const { relativeScale } = useFontSize();
  const scaledStyle = useMemo<TextStyle | null>(() => {
    if (relativeScale === 1) return null;
    const original = StyleSheet.flatten(style);
    const result: TextStyle = {};
    if (typeof original?.fontSize === 'number') {
      result.fontSize = Math.max(1, Math.round(original.fontSize * relativeScale * 100) / 100);
    }
    if (typeof original?.lineHeight === 'number') {
      result.lineHeight = Math.max(1, Math.round(original.lineHeight * relativeScale * 100) / 100);
    }
    return result;
  }, [style, relativeScale]);

  return <Text ref={ref} {...props} style={[styles.text, style, scaledStyle]} />;
}));

const styles = StyleSheet.create({
  text: { includeFontPadding: false },
});
