import { memo } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { manualVipPayment } from '@/constants/manualVipPayment';
import { useFontSize } from '@/hooks/useFontSize';
import type { VipPaymentInformation } from '@/services/manualVipPaymentService';

interface VipPaymentAmountProps {
  amount: string;
  promo: string | null;
  bodySize: number;
}

const VipPaymentAmount = memo(function VipPaymentAmount({ amount, promo, bodySize }: VipPaymentAmountProps) {
  const bodyStyle = { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) };
  return (
    <View style={styles.priceBlock}>
      <Text style={[styles.amount, bodyStyle]}>付款金額： {amount}</Text>
      {promo !== null ? <Text style={[styles.promo, bodyStyle]}>{promo}</Text> : null}
    </View>
  );
});

interface VipPaymentModalProps {
  visible: boolean;
  openingEmail: boolean;
  loadingPayment: boolean;
  payment: VipPaymentInformation | null;
  paymentError: string | null;
  onClose: () => void;
  onRetry: () => void;
  onEmailReceipt: () => void;
}

export const VipPaymentModal = memo(function VipPaymentModal({
  visible, openingEmail, loadingPayment, payment, paymentError, onClose, onRetry, onEmailReceipt,
}: VipPaymentModalProps) {
  const { fs } = useFontSize();
  const bodySize = Math.max(Typography.sm, fs(Typography.sm));
  const headingSize = Math.max(Typography.base, fs(Typography.base));
  const bodyStyle = { fontSize: bodySize, lineHeight: Math.ceil(bodySize * 1.6) };
  const headingStyle = { fontSize: headingSize, lineHeight: Math.ceil(headingSize * 1.4) };
  const emailDisabled = openingEmail || loadingPayment || payment === null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, headingStyle]} accessibilityRole="header">{manualVipPayment.title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="關閉 VIP 付款方式"
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <MaterialIcons name="close" size={Typography.xxl} color={Colors.textOnPrimary} />
            </Pressable>
          </View>

          {loadingPayment || payment === null ? (
            <View style={styles.statePanel} accessibilityLiveRegion="polite">
              {loadingPayment ? (
                <>
                  <ActivityIndicator size="large" color={Colors.primaryDark} />
                  <Text style={[styles.stateText, bodyStyle]}>正在讀取最新付款資料...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="error-outline" size={Typography.display} color={Colors.error} />
                  <Text style={[styles.errorText, bodyStyle]}>{paymentError ?? '未取得最新付款資料，請重試。'}</Text>
                  <Pressable
                    onPress={onRetry}
                    accessibilityRole="button"
                    accessibilityLabel="重新讀取最新付款資料"
                    style={({ pressed }) => [styles.emailButton, styles.retryButton, pressed ? styles.primaryPressed : null]}
                  >
                    <MaterialIcons name="refresh" size={Typography.xl} color={Colors.textOnPrimary} />
                    <Text style={[styles.emailButtonText, { fontSize: bodySize }]}>重試</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <Text style={[styles.body, bodyStyle]}>{manualVipPayment.intro}</Text>

              <View style={styles.methodCard}>
                <View style={styles.methodHeading}>
                  <MaterialIcons name="account-balance" size={Typography.xxl} color={Colors.primaryDark} />
                  <Text style={[styles.sectionTitle, headingStyle]} accessibilityRole="header">{manualVipPayment.bank.title}</Text>
                </View>
                <Text style={[styles.body, bodyStyle]} selectable>{manualVipPayment.bank.body}</Text>
                <VipPaymentAmount amount={payment.amount} promo={payment.promo} bodySize={bodySize} />
              </View>

              <View style={styles.methodCard}>
                <View style={styles.methodHeading}>
                  <MaterialIcons name="qr-code" size={Typography.xxl} color={Colors.primaryDark} />
                  <Text style={[styles.sectionTitle, headingStyle]} accessibilityRole="header">{manualVipPayment.alipay.title}</Text>
                </View>
                <Text style={[styles.body, bodyStyle]} selectable>{manualVipPayment.alipay.body}</Text>
                <VipPaymentAmount amount={payment.amount} promo={payment.promo} bodySize={bodySize} />
                {payment.calculatedPrice !== manualVipPayment.originalQrAmount ? (
                  <Text style={[styles.qrWarning, bodyStyle]}>
                    {`二維碼圖片內印有 HK$${manualVipPayment.originalQrAmount}。應付金額以本頁顯示為準，付款前請核對金額；如二維碼付款金額不同，請改用銀行轉帳或 FPS。`}
                  </Text>
                ) : null}
                <View style={styles.qrFrame}>
                  <Image
                    source={require('@/assets/images/RXRHEXAMTOOLS_Payment_QR_20percent.jpg')}
                    style={styles.qrImage}
                    contentFit="contain"
                    transition={200}
                    accessible
                    accessibilityLabel={`AlipayHK 付款二維碼；應付金額 ${payment.amount}，付款前請核對金額`}
                  />
                </View>
              </View>

              <View style={styles.methodCard}>
                <View style={styles.methodHeading}>
                  <MaterialIcons name="swap-horiz" size={Typography.xxl} color={Colors.primaryDark} />
                  <Text style={[styles.sectionTitle, headingStyle]} accessibilityRole="header">{manualVipPayment.fps.title}</Text>
                </View>
                <Text style={[styles.body, bodyStyle]} selectable>{manualVipPayment.fps.body}</Text>
                <VipPaymentAmount amount={payment.amount} promo={payment.promo} bodySize={bodySize} />
              </View>

              <View style={styles.notice}>
                <View style={styles.methodHeading}>
                  <MaterialIcons name="receipt-long" size={Typography.xxl} color={Colors.primaryDark} />
                  <Text style={[styles.sectionTitle, headingStyle]} accessibilityRole="header">{manualVipPayment.importantTitle}</Text>
                </View>
                <Text style={[styles.body, bodyStyle]} selectable>{manualVipPayment.importantBody}</Text>
                <Text style={[styles.body, bodyStyle]} selectable>{manualVipPayment.confirmationBody}</Text>
              </View>
              <Text style={[styles.thanks, bodyStyle]}>{manualVipPayment.thanks}</Text>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable
              onPress={onEmailReceipt}
              disabled={emailDisabled}
              accessibilityRole="button"
              accessibilityLabel="開啟電郵應用程式寄送 VIP 付款收據"
              accessibilityState={{ disabled: emailDisabled, busy: openingEmail || loadingPayment }}
              style={({ pressed }) => [styles.emailButton, emailDisabled ? styles.disabled : null, pressed ? styles.primaryPressed : null]}
            >
              <MaterialIcons name="mail-outline" size={Typography.xl} color={Colors.textOnPrimary} />
              <Text style={[styles.emailButtonText, { fontSize: bodySize }]}>{openingEmail ? '正在開啟電郵...' : '電郵付款收據'}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  panel: { height: '94%', width: '100%', maxWidth: Spacing.xxl * 14, flexShrink: 0, borderRadius: Radius.xl, backgroundColor: Colors.background, overflow: 'hidden', ...Shadows.elevated },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.primaryDark, flexShrink: 0 },
  headerText: { flex: 1 },
  headerTitle: { fontWeight: Typography.bold, color: Colors.textOnPrimary, includeFontPadding: false },
  closeButton: { width: Spacing.xxl, height: Spacing.xxl, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  statePanel: { flex: 1, padding: Spacing.lg, gap: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  stateText: { color: Colors.textSecondary, textAlign: 'center', includeFontPadding: false },
  errorText: { color: Colors.error, textAlign: 'center', includeFontPadding: false },
  retryButton: { width: '100%' },
  methodCard: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.lg },
  methodHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { flex: 1, color: Colors.textPrimary, fontWeight: Typography.semibold, includeFontPadding: false },
  body: { color: Colors.textSecondary, fontWeight: Typography.regular, includeFontPadding: false },
  priceBlock: { gap: Spacing.xs },
  amount: { color: Colors.primaryDark, fontWeight: Typography.bold, includeFontPadding: false },
  promo: { color: Colors.error, fontWeight: Typography.medium, includeFontPadding: false },
  qrWarning: { color: Colors.textSecondary, backgroundColor: Colors.warningBg, padding: Spacing.sm, borderRadius: Radius.sm, includeFontPadding: false },
  qrFrame: { width: '100%', maxWidth: Spacing.xxl * 9, alignSelf: 'center', backgroundColor: Colors.paymentQrSurface },
  qrImage: { width: '100%', aspectRatio: 986 / 959 },
  notice: { borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.surfaceBorder },
  thanks: { color: Colors.textPrimary, fontWeight: Typography.medium, includeFontPadding: false },
  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, backgroundColor: Colors.background, flexShrink: 0 },
  emailButton: { minHeight: Spacing.xxl, padding: Spacing.md, gap: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryDark, borderRadius: Radius.md },
  emailButtonText: { color: Colors.textOnPrimary, fontWeight: Typography.semibold, includeFontPadding: false, flexShrink: 1 },
  pressed: { opacity: 0.65 },
  primaryPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
});
