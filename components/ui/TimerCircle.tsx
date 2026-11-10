import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { formatTime } from '@/services/quizService';

interface TimerCircleProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
}

export const TimerCircle = React.memo(({ totalSeconds, remainingSeconds, size = 72 }: TimerCircleProps) => {
  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const isWarning = ratio <= 0.25;
  const isCritical = ratio <= 0.1;

  const color = isCritical
    ? Colors.error
    : isWarning
    ? Colors.warning
    : Colors.primary;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <Text style={[styles.time, { color, fontSize: size * 0.22 }]}>
        {formatTime(remainingSeconds)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  time: {
    fontWeight: Typography.bold,
    letterSpacing: 1,
  },
});
