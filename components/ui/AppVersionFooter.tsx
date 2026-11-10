import { memo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useFontSize } from '@/hooks/useFontSize';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface AppVersionFooterProps {
  style?: StyleProp<ViewStyle>;
  inline?: boolean;
}

export const AppVersionFooter = memo(function AppVersionFooter({ style, inline = false }: AppVersionFooterProps) {
  const { label } = useAppVersion();
  const { fs } = useFontSize();

  return (
    <View style={[styles.footer, inline ? styles.inlineFooter : null, style]}>
      <Text
        style={[styles.text, { fontSize: fs(Typography.xs), lineHeight: Math.ceil(fs(Typography.xs) * 1.6) }]}
        accessibilityLabel={label}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  footer: {
    marginTop: 'auto',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  inlineFooter: {
    marginTop: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  text: {
    color: Colors.textSecondary,
    fontWeight: Typography.regular,
    textAlign: 'left',
    includeFontPadding: false,
  },
});
