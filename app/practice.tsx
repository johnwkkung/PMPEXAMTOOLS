import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import type { QuizMode } from '@/services/quizManagerService';
import { ScaledText as Text } from '@/components/ui/ScaledText';

interface PracCard {
  mode: QuizMode;
  title: string;
  desc: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const PRAC_CARDS: PracCard[] = [
  {
    mode: 'PRACA1',
    title: '的士及網約車載客服務知識試題',
    desc: '涵蓋的士及網約車載客服務相關法規與知識',
    icon: 'local-taxi',
    color: Colors.primary,
  },
  {
    mode: 'PRACA2',
    title: '地方試題',
    desc: '測試香港主要地區、街道及地標知識',
    icon: 'place',
    color: Colors.accent,
  },
  {
    mode: 'PRACA3',
    title: '路線試題',
    desc: '測試常用路線及行車方向知識',
    icon: 'alt-route',
    color: Colors.success,
  },
  {
    mode: 'PRACB',
    title: '道路使用者守則試題',
    desc: '道路規則、交通標誌及安全駕駛守則',
    icon: 'menu-book',
    color: Colors.warning,
  },
];

export default function PracticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleStart = (card: PracCard) => {
    router.push({
      pathname: '/quiz',
      params: {
        quizMode: card.mode,
        title: card.title,
        timeLimitMinutes: '0',
        isExam: '0',
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>試題練習</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <MaterialIcons name="info-outline" size={16} color={Colors.accent} />
        <Text style={styles.subtitleText}>選擇練習類別，不限時間，可隨時返回及跳題</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {PRAC_CARDS.map((card, index) => (
          <Pressable
            key={card.mode}
            style={({ pressed }) => [
              styles.card,
              pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
            ]}
            onPress={() => handleStart(card)}
          >
            {/* Left accent bar */}
            <View style={[styles.cardAccentBar, { backgroundColor: card.color }]} />

            <View style={styles.cardContent}>
              <View style={[styles.iconWrap, { backgroundColor: `${card.color}18` }]}>
                <MaterialIcons name={card.icon} size={28} color={card.color} />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardIndexBadge}>
                  <Text style={[styles.cardIndexText, { color: card.color }]}>
                    {index === 3 ? '1B' : `1A${index + 1}`}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDesc}>{card.desc}</Text>
              </View>

              <MaterialIcons name="chevron-right" size={24} color={card.color} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  headerRight: { width: 40 },

  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.accent}08`,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.accent}20`,
  },
  subtitleText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardAccentBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardIndexBadge: {
    alignSelf: 'flex-start',
  },
  cardIndexText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
});
