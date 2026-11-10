import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar = React.memo(({ current, total }: ProgressBarProps) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: current / total,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [current, total]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
});
