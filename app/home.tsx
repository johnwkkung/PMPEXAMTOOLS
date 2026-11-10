import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import { useFontSize } from '@/hooks/useFontSize';

import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuizHistory } from '@/hooks/useQuizHistory';
import type { HistoryEntry } from '@/services/quizManagerService';
import type { QuizMode } from '@/services/quizManagerService';
import { useManualVipPayment } from '@/hooks/useManualVipPayment';
import { VipPaymentModal } from '@/components/ui/VipPaymentModal';
import { useUserDetails } from '@/hooks/useUserDetails';
import { UserDetailsModal } from '@/components/ui/UserDetailsModal';
import { AppVersionFooter } from '@/components/ui/AppVersionFooter';
import { PrivacyPolicyModal } from '@/components/ui/PrivacyPolicyModal';
import { TermsOfServiceModal } from '@/components/ui/TermsOfServiceModal';

const ADMIN_EMAIL = 'passaexam@gmail.com';

const SAMP_MODE = {
  mode: 'SAMP' as QuizMode,
  title: '範例題目',
  subtitle: '免費用戶示範練習題目',
  icon: 'quiz',
  timeLimit: null as number | null,
  isExam: false,
};



// ─── HistoryBoard Sub-component ──────────────────────────────────────────────

function HistoryBoard({
  title,
  entries,
  loading,
  isExam,
  accentColor,
  fs,
  style,
  onPress,
}: {
  title: string;
  entries: HistoryEntry[];
  loading: boolean;
  isExam: boolean;
  accentColor: string;
  fs: (n: number) => number;
  style?: object;
  onPress?: () => void;
}) {
  const MAX_ROWS = 5;
  const shown = entries.slice(0, MAX_ROWS);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Handle both ISO ('2026-08-26T10:00:00Z') and space-separated ('YYYY-MM-DD HH:MM:SS')
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr.slice(5, 16);
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Compact format MM-DD HH:MM for side-by-side narrow layout
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Use server-supplied status field
  const isPass = (e: HistoryEntry) => e.status === 'pass';

  return (
    <Pressable
      style={({ pressed }) => [histStyles.board, { borderColor: `${accentColor}30` }, style, pressed ? { opacity: 0.82 } : null]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[histStyles.boardHeader, { backgroundColor: `${accentColor}10`, borderBottomColor: `${accentColor}20` }]}>
        <MaterialIcons name={isExam ? 'assignment' : 'menu-book'} size={15} color={accentColor} />
        <Text style={[histStyles.boardTitle, { color: accentColor, fontSize: fs(Typography.sm) }]}>{title}</Text>
        {!loading && (
          <View style={[histStyles.countBadge, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[histStyles.countBadgeText, { color: accentColor, fontSize: fs(Typography.xs) }]}>
              {entries.length} 次
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={histStyles.loadingRow}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={[histStyles.loadingText, { fontSize: fs(Typography.xs) }]}>載入中...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={histStyles.emptyRow}>
          <MaterialIcons name="inbox" size={20} color={Colors.surfaceBorder} />
          <Text style={[histStyles.emptyText, { fontSize: fs(Typography.xs) }]}>暫無記錄</Text>
        </View>
      ) : (() => {
        const avgCorrectRate = Math.round(
          entries.reduce((a, e) => {
            const tot = e.correct + e.wrong;
            return a + (tot > 0 ? e.correct / tot : 0);
          }, 0) / entries.length * 100
        );
        const avgWrongRate = Math.round(
          entries.reduce((a, e) => {
            const tot = e.correct + e.wrong;
            return a + (tot > 0 ? e.wrong / tot : 0);
          }, 0) / entries.length * 100
        );
        const passRate = Math.round(
          (entries.filter((e) => e.status === 'pass').length / entries.length) * 100
        );
        return (
          <View style={histStyles.statsBlock}>
            <View style={histStyles.statsRow}>
              <View style={histStyles.statItem}>
                <Text style={[histStyles.statLabel, { fontSize: fs(9), color: Colors.textMuted }]}>平均正確率</Text>
                <Text style={[histStyles.statValue, { fontSize: fs(Typography.sm), color: Colors.success }]}>{avgCorrectRate}%</Text>
              </View>
              <View style={histStyles.statDivider} />
              <View style={histStyles.statItem}>
                <Text style={[histStyles.statLabel, { fontSize: fs(9), color: Colors.textMuted }]}>平均錯誤率</Text>
                <Text style={[histStyles.statValue, { fontSize: fs(Typography.sm), color: Colors.error }]}>{avgWrongRate}%</Text>
              </View>
              <View style={histStyles.statDivider} />
              <View style={histStyles.statItem}>
                <Text style={[histStyles.statLabel, { fontSize: fs(9), color: Colors.textMuted }]}>平均合格率</Text>
                <Text style={[histStyles.statValue, { fontSize: fs(Typography.sm), color: accentColor }]}>{passRate}%</Text>
              </View>
            </View>
          </View>
        );
      })()}
      {/* Tap hint */}
      {onPress && !loading && entries.length > 0 ? (
        <View style={[histStyles.tapHint, { borderTopColor: `${accentColor}15` }]}>
          <MaterialIcons name="open-in-full" size={11} color={accentColor} />
          <Text style={[histStyles.tapHintText, { color: accentColor, fontSize: fs(9) }]}>查看全部</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, loading: authLoading } = useAuth();
  const { showAlert } = useAlert();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useUserProfile();

  const isVip = profile?.is_vip ?? false;
  const { fs, levelLabel, nextLevelLabel, cycleLevel } = useFontSize();
  const isAdmin = (user?.email ?? '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [showTos, setShowTos] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const openTerms = useCallback(() => setShowTos(true), []);
  const closeTerms = useCallback(() => setShowTos(false), []);
  const openPrivacy = useCallback(() => setShowPrivacy(true), []);
  const closePrivacy = useCallback(() => setShowPrivacy(false), []);
  const [showSampTooltip, setShowSampTooltip] = useState(true);
  const { practiceHistory, examHistory, loading: historyLoading } = useQuizHistory(
    isVip ? (user?.email ?? null) : null
  );
  const {
    visible: showPayment, openingEmail, loadingPayment, payment, paymentError,
    openPaymentPage, closePaymentPage, retryPayment, emailReceipt,
  } = useManualVipPayment();
  const {
    visible: showUserDetails, loading: userDetailsLoading, details: userDetails,
    error: userDetailsError, openDetails, closeDetails, retry: retryUserDetails,
  } = useUserDetails(user?.email ?? null);

  // Re-fetch profile from Supabase on every subsequent focus
  // Use a ref to hold the latest refetchProfile so useFocusEffect deps stay empty
  // (avoids the setLoading(true) loop caused by refetchProfile reference changes)
  const refetchRef = useRef(refetchProfile);
  useEffect(() => { refetchRef.current = refetchProfile; }, [refetchProfile]);
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetchRef.current();
    }, []) // empty deps — latest refetch accessed via ref
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading]);

  const handleStartSamp = () => {
    router.push({
      pathname: '/quiz',
      params: {
        quizMode: SAMP_MODE.mode,
        title: SAMP_MODE.title,
        timeLimitMinutes: '0',
        isExam: '0',
      },
    });
  };

  const handleLogout = () => {
    showAlert('確認登出？', '登出後需要重新登入。', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  };



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/images/logo.png')}
            style={{ width: Dimensions.get('window').width - Spacing.lg * 2, height: 140 }}
            contentFit="fill"
            transition={200}
          />
          <Text
            style={[styles.subtitleLine1, { fontSize: fs(Typography.base) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            的士及網約車綜合筆試練習及考試專家
          </Text>

          <View style={styles.fontSizeControl}>
            <Pressable
              style={({ pressed }) => [styles.fontSizeBtn, pressed ? styles.headerButtonPressed : null]}
              onPress={cycleLevel}
              accessibilityRole="button"
              accessibilityLabel={`字體大小：${levelLabel}`}
              accessibilityHint={`點按切換至${nextLevelLabel}字體；大、中、小循環切換`}
              accessibilityValue={{ text: levelLabel }}
            >
              <MaterialIcons name="text-fields" size={Typography.xxl} color={Colors.primaryDark} />
              <View style={styles.fontSizeBadge} pointerEvents="none">
                <Text style={styles.fontSizeBadgeText} allowFontScaling={false}>{levelLabel}</Text>
              </View>
            </Pressable>
          </View>
          <View style={styles.headerBtns}>
            {isAdmin ? (
              <Pressable
                style={styles.adminBtn}
                onPress={() => router.push('/debug-log')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="bug-report" size={16} color={Colors.error} />
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.logoutBtn, pressed ? styles.headerButtonPressed : null]}
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="登出"
            >
              <MaterialIcons name="logout" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* User & VIP Status Card */}
        <Pressable
          style={({ pressed }) => [
            styles.userCard, isVip ? styles.userCardVip : styles.userCardFree,
            pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
          ]}
          onPress={openDetails}
          disabled={profileLoading || !user?.email || userDetailsLoading}
          accessibilityRole="button"
          accessibilityLabel="查看會員資料"
          accessibilityHint="從伺服器讀取用戶名稱、電郵及會員級別；VIP 會員另顯示註冊及到期日期"
          accessibilityState={{ disabled: profileLoading || !user?.email || userDetailsLoading, busy: userDetailsLoading }}
        >
          {profileLoading ? (
            <View style={styles.userCardLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>載入中...</Text>
            </View>
          ) : (
            <>
              <View style={styles.userCardLeft}>
                <View style={[styles.avatar, isVip ? styles.avatarVip : styles.avatarFree]}>
                  <MaterialIcons
                    name={isVip ? 'star' : 'person'}
                    size={22}
                    color={isVip ? Colors.textOnPrimary : Colors.textMuted}
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userEmail, { fontSize: fs(Typography.sm) }]} numberOfLines={1}>
                    {profile?.username ?? profile?.email ?? user?.email ?? '用戶'}
                  </Text>
                  {(profile?.email ?? user?.email) ? (
                    <Text style={[styles.userEmailSub, { fontSize: fs(Typography.xs) }]} numberOfLines={1}>
                      {profile?.email ?? user?.email}
                    </Text>
                  ) : null}

                </View>
              </View>
              {isVip ? (
                <View style={styles.vipBadge}>
                  <MaterialIcons name="star" size={12} color={Colors.primary} />
                  <Text style={[styles.vipBadgeText, { fontSize: fs(Typography.xs) }]}>VIP 會員</Text>
                </View>
              ) : (
                <View style={styles.freeBadge}>
                  <MaterialIcons name="person-outline" size={12} color={Colors.textSecondary} />
                  <Text style={[styles.freeBadgeText, { fontSize: fs(Typography.xs) }]}>免費用戶</Text>
                </View>
              )}
              <MaterialIcons name="chevron-right" size={Typography.xl} color={Colors.textSecondary} />
            </>
          )}
        </Pressable>

        {/* ── NON-VIP: Sample section ── */}
        {!profileLoading && !isVip && (
          <View style={styles.section}>
            {/* Keep the bubble in normal layout so Android cannot shrink its text area. */}
            {showSampTooltip ? (
              <Pressable
                style={({ pressed }) => [styles.tooltipOverlay, pressed ? { opacity: 0.85 } : null]}
                onPress={() => setShowSampTooltip(false)}
                accessibilityRole="button"
                accessibilityLabel="免費用戶僅提供範例題目練習。升級 VIP 即可解鎖完整題庫及模擬考試。"
                accessibilityHint="點按關閉提示"
              >
                <View style={styles.tooltipBubble}>
                  <Text
                    style={[
                      styles.tooltipText,
                      { fontSize: fs(Typography.base), lineHeight: Math.ceil(fs(Typography.base) * 1.6) },
                    ]}
                  >
                    免費用戶僅提供範例題目練習。{"\n"}升級 VIP 即可解鎖完整題庫及模擬考試。
                  </Text>
                  <View style={styles.tooltipArrow} pointerEvents="none" />
                </View>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.modeCard,
                pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
              ]}
              onPress={handleStartSamp}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: `${Colors.accent}18` }]}>
                <MaterialIcons name="quiz" size={26} color={Colors.accent} />
              </View>
              <View style={styles.modeCardBody}>
                <Text style={[styles.modeCardTitle, { fontSize: fs(Typography.base) }]}>範例題目</Text>
                <Text style={[styles.modeCardSubtitle, { fontSize: fs(Typography.xs) }]}>免費用戶示範練習題目</Text>
              </View>
              <Pressable
                style={styles.infoIconBtn}
                onPress={(e) => { e.stopPropagation(); setShowSampTooltip(v => !v); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="info-outline" size={20} color={Colors.accent} />
              </Pressable>
            </Pressable>
          </View>
        )}

        {/* ── VIP: Two top-level cards ── */}
        {!profileLoading && isVip && (
          <View style={[styles.section, styles.sectionBeforeFooter]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.sectionTitle, { fontSize: fs(Typography.lg) }]}>選擇模式</Text>
            </View>
            <View style={styles.vipCardGrid}>
              {/* 試題練習 card */}
              <Pressable
                style={({ pressed }) => [
                  styles.vipTopCard,
                  pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
                ]}
                onPress={() => router.push('/practice')}
              >
                <View style={[styles.vipTopCardIcon, { backgroundColor: `${Colors.accent}20` }]}>
                  <MaterialIcons name="menu-book" size={32} color={Colors.accent} />
                </View>
                <Text style={[styles.vipTopCardTitle, { fontSize: fs(Typography.lg) }]}>試題練習</Text>
                <Text style={[styles.vipTopCardSub, { fontSize: fs(Typography.xs) }]}>4 個練習類別</Text>
                <View style={[styles.vipTopCardArrow, { backgroundColor: `${Colors.accent}15` }]}>
                  <MaterialIcons name="arrow-forward" size={18} color={Colors.accent} />
                </View>
              </Pressable>

              {/* 模擬考試 card */}
              <Pressable
                style={({ pressed }) => [
                  styles.vipTopCard,
                  styles.vipTopCardExam,
                  pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
                ]}
                onPress={() => router.push('/exam')}
              >
                <View style={[styles.vipTopCardIcon, { backgroundColor: `${Colors.primary}20` }]}>
                  <MaterialIcons name="assignment" size={32} color={Colors.primary} />
                </View>
                <Text style={[styles.vipTopCardTitle, { color: Colors.primaryDark, fontSize: fs(Typography.lg) }]}>模擬考試</Text>
                <Text style={[styles.vipTopCardSub, { fontSize: fs(Typography.xs) }]}>65 題 · 限時 45 分鐘</Text>
                <View style={[styles.vipTopCardArrow, { backgroundColor: `${Colors.primary}15` }]}>
                  <MaterialIcons name="arrow-forward" size={18} color={Colors.primary} />
                </View>
              </Pressable>
            </View>

            {/* ── History Boards side by side ── */}
            <View style={styles.historyRow}>
              <HistoryBoard
                title="練習記錄"
                entries={practiceHistory}
                loading={historyLoading}
                isExam={false}
                accentColor={Colors.accent}
                fs={fs}
                style={styles.historyBoardFlex}
                onPress={() => router.push({
                  pathname: '/history',
                  params: {
                    title: '練習記錄',
                    isExam: '0',
                    accentColor: Colors.accent,
                    entries: JSON.stringify(practiceHistory),
                  },
                })}
              />
              <HistoryBoard
                title="考試記錄"
                entries={examHistory}
                loading={historyLoading}
                isExam={true}
                accentColor={Colors.primary}
                fs={fs}
                style={styles.historyBoardFlex}
                onPress={() => router.push({
                  pathname: '/history',
                  params: {
                    title: '考試記錄',
                    isExam: '1',
                    accentColor: Colors.primary,
                    entries: JSON.stringify(examHistory),
                  },
                })}
              />
            </View>
          </View>
        )}

        {/* ── NON-VIP: VIP Promotional Block ── */}
        {!profileLoading && !isVip && (
          <View style={styles.vipPromo}>
            <View style={styles.vipPromoHeader}>
              <MaterialIcons name="star" size={18} color="#2E7D32" />
              <Text style={[styles.vipPromoTitle, { fontSize: fs(Typography.base) }]}>立即升級 VIP 會員</Text>
            </View>
            <Text style={[styles.vipPromoText, { fontSize: fs(Typography.sm) }]}>
              VIP 會員可解鎖完整題庫，享受數百條練習{"\n"}
              及模擬考試題目，本系統沒有胡亂出題，{"\n"}
              所有題目貼近真實考試，肯定增加考試合格率。
            </Text>
            <View style={styles.vipPromoActionRow}>
              <Text style={[styles.vipPromoText, { fontSize: fs(Typography.sm) }]}>按</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.vipUpgradeBtn,
                  pressed ? { opacity: 0.8, transform: [{ scale: 0.97 }] } : null,
                ]}
                onPress={openPaymentPage}
                accessibilityRole="button"
                accessibilityLabel="升級 VIP，查看付款方式"
              >
                <MaterialIcons name="star" size={14} color={Colors.textOnPrimary} />
                <Text style={[styles.vipUpgradeBtnText, { fontSize: fs(Typography.sm) }]}>升級 VIP</Text>
              </Pressable>
              <Text style={[styles.vipPromoText, { fontSize: fs(Typography.sm) }]}>升級。</Text>
            </View>
            <Text style={[styles.vipPromoContact, { fontSize: fs(Typography.sm) }]}>
              如有什麼建議及查詢，請發電郵給{' '}
              <Text
                style={styles.vipPromoEmail}
                onPress={() => Linking.openURL('mailto:passaexam@gmail.com')}
              >
                passaexam@gmail.com
              </Text>
              。
            </Text>
          </View>
        )}

        {profileLoading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={[styles.loadingText, { fontSize: fs(Typography.sm) }]}>載入用戶資料...</Text>
          </View>
        )}

        {/* Match the login footer: version, privacy policy, and service terms. */}
        <View style={styles.footerRow}>
          <AppVersionFooter inline style={styles.versionFooter} />
          <Pressable
            style={({ pressed }) => [styles.tosLink, pressed ? { opacity: 0.6 } : null]}
            onPress={openPrivacy}
            accessibilityRole="button"
            accessibilityLabel="私隱條款"
          >
            <MaterialIcons name="lock" size={13} color={Colors.textMuted} />
            <Text style={[styles.tosLinkText, { fontSize: fs(Typography.xs) }]}>私隱條款</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.tosLink, pressed ? { opacity: 0.6 } : null]}
            onPress={openTerms}
            accessibilityRole="button"
            accessibilityLabel="服務條款"
            accessibilityHint="開啟完整中文及英文服務條款"
          >
            <Text style={[styles.termsLinkText, { fontSize: fs(Typography.xs) }]}>{'📄 服務條款'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <UserDetailsModal
        visible={showUserDetails}
        loading={userDetailsLoading}
        details={userDetails}
        error={userDetailsError}
        onClose={closeDetails}
        onRetry={retryUserDetails}
      />

      <VipPaymentModal
        visible={showPayment}
        openingEmail={openingEmail}
        loadingPayment={loadingPayment}
        payment={payment}
        paymentError={paymentError}
        onClose={closePaymentPage}
        onRetry={retryPayment}
        onEmailReceipt={emailReceipt}
      />

      <PrivacyPolicyModal visible={showPrivacy} onClose={closePrivacy} />
      {showTos ? <TermsOfServiceModal visible={showTos} onClose={closeTerms} /> : null}
    </View>
  );
}



// ─── HistoryBoard Styles ─────────────────────────────────────────────────────

const histStyles = StyleSheet.create({
  board: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    ...Shadows.card,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  boardTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  rows: {
    paddingBottom: 4,
  },
  statsBlock: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  statLabel: {
    fontWeight: Typography.semibold,
    textAlign: 'center',
  },
  statValue: {
    fontWeight: Typography.bold,
    lineHeight: 24,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.surfaceBorder,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tableHeaderText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  tableRowEven: {
    backgroundColor: `${Colors.surface}80`,
  },
  tableRowPass: {
    backgroundColor: '#E8F5E9',
  },
  tableRowFail: {
    backgroundColor: '#FFEBEE',
  },
  cellText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  cellCorrect: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.success,
    textAlign: 'center',
  },
  cellWrong: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.error,
    textAlign: 'center',
  },
  colDate: { flex: 1 },
  colCorrect: { width: 40, textAlign: 'center' },
  colWrong: { width: 40, textAlign: 'center' },
  colResult: { width: 58, alignItems: 'center' },
  resultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  passBadge: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  failBadge: { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
  resultBadgeText: {
    fontSize: 10,
    fontWeight: Typography.bold,
  },
  passText: { color: '#2E7D32' },
  failText: { color: '#C62828' },
  moreRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  moreText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: 6,
    gap: 8,
  },
  breakdownText: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  breakdownDivider: {
    fontSize: 9,
    color: Colors.surfaceBorder,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  tapHintText: {
    fontWeight: Typography.semibold,
  },
});

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, gap: 0 },

  logoSection: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },

  subtitleLine1: {
    width: '100%',
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 26,
    textAlign: 'center',
    includeFontPadding: false,
  },
  fontSizeControl: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  headerBtns: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.error}12`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.error}35`,
  },
  fontSizeBtn: {
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  fontSizeBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    minWidth: Typography.lg,
    height: Typography.lg,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
    includeFontPadding: false,
  },
  headerButtonPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  logoutBtn: {
    width: Spacing.xxl,
    height: Spacing.xxl,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    minHeight: 68,
    ...Shadows.card,
  },
  userCardVip: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: `${Colors.primary}45`,
  },
  userCardFree: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.surfaceBorder,
  },
  userCardLoading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarVip: { backgroundColor: Colors.primary },
  avatarFree: { backgroundColor: Colors.surfaceBorder },
  userInfo: { flex: 1 },
  userEmail: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  userEmailSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  userLevel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  vipBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadows.elevated,
  },
  upgradeBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  freeBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },

  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionBeforeFooter: {
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 26,
  },

  nonVipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: `${Colors.accent}10`,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.accent}25`,
    marginBottom: Spacing.md,
  },
  nonVipBannerText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tooltipOverlay: {
    width: '100%',
    marginBottom: Spacing.md,
    flexShrink: 0,
  },
  tooltipBubble: {
    width: '100%',
    flexShrink: 0,
    backgroundColor: Colors.tooltipBackground,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.card,
  },
  tooltipText: {
    alignSelf: 'stretch',
    flexShrink: 0,
    color: Colors.tooltipText,
    fontWeight: Typography.medium,
    includeFontPadding: false,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -Spacing.sm,
    right: Spacing.lg,
    width: 0,
    height: 0,
    borderLeftWidth: Spacing.sm,
    borderRightWidth: Spacing.sm,
    borderTopWidth: Spacing.sm,
    borderLeftColor: Colors.transparent,
    borderRightColor: Colors.transparent,
    borderTopColor: Colors.tooltipBackground,
  },

  modeList: {
    gap: Spacing.sm,
  },

  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.card,
    marginBottom: Spacing.sm,
  },
  modeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeCardBody: {
    flex: 1,
    gap: 4,
  },
  modeCardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  modeCardSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // VIP two-card grid
  vipCardGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  vipTopCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    ...Shadows.card,
    minHeight: 180,
    justifyContent: 'center',
  },
  vipTopCardExam: {
    borderColor: `${Colors.primary}35`,
  },
  vipTopCardIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipTopCardTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  vipTopCardSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  vipTopCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  vipPromo: {
    backgroundColor: '#E8F5E9',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  vipPromoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vipPromoTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: '#1B5E20',
  },
  vipPromoText: {
    fontSize: Typography.sm,
    color: '#2E7D32',
    lineHeight: 20,
  },
  vipPromoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  vipUpgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: Spacing.xxl,
  },
  vipUpgradeBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  vipPromoContact: {
    fontSize: Typography.sm,
    color: '#2E7D32',
    lineHeight: 20,
  },
  vipPromoEmail: {
    color: '#1565C0',
    fontWeight: Typography.semibold,
    textDecorationLine: 'underline',
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  historyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  historyBoardFlex: {
    flex: 1,
    marginTop: 0,
  },
  footerRow: {
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  versionFooter: {
    flexBasis: Spacing.xxl + Spacing.lg,
    minWidth: Spacing.xxl + Spacing.lg,
  },
  termsLinkText: {
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    textDecorationLine: 'underline',
    includeFontPadding: false,
  },
  tosLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: Spacing.xs,
    minHeight: Spacing.xxl + Spacing.sm,
  },
  tosLinkText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },

});
