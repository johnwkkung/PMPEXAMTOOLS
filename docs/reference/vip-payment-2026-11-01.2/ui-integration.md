# Previous UI integration — payment protocol .2

This records the payment-specific portions of `app/home.tsx` and `app/debug-log.tsx` before their removal. It is not a full copy of those screens.

## Home imports and logic

```tsx
import { useVipPayment } from '@/hooks/useVipPayment';
import { PaymentDiagnosticsPanel } from '@/components/ui/PaymentDiagnosticsPanel';

const handlePaymentSuccess = useCallback(() => {
  showAlert('付款已確認', 'Stripe 已確認收到付款。\n請重新登入以更新您的 VIP 帳號狀態。', [
    {
      text: '重新登入',
      onPress: async () => {
        const result = await logout();
        if (result.error) {
          showAlert('登出失敗', result.error);
          return;
        }
        router.replace('/login');
      },
    },
  ]);
}, [showAlert, logout, router]);
const { checkingOut, paymentStatus, subscriptionEnd, startCheckout: handleUpgradeStripe } = useVipPayment({
  onPaymentSuccess: handlePaymentSuccess,
});
```

The upgrade button previously called `handleUpgradeStripe`, was disabled while `checkingOut`, showed an ActivityIndicator and `處理中...` while busy, and displayed `paymentStatus` below it. Home then rendered `<PaymentDiagnosticsPanel compact />`. `useVipPayment` also checked active Stripe subscriptions at mount and on AppState activation; the subscription expiry bar displayed `subscriptionEnd` for VIP accounts. The new manual-payment UI removes these automatic Stripe requests and the expiry bar, and leaves server-backed `profile.is_vip` as the existing access authority.

## Original upgrade button

```tsx
<Pressable
  style={({ pressed }) => [
    styles.vipUpgradeBtn,
    checkingOut ? { opacity: 0.6 } : null,
    pressed && !checkingOut ? { opacity: 0.8, transform: [{ scale: 0.97 }] } : null,
  ]}
  onPress={handleUpgradeStripe}
  disabled={checkingOut}
  accessibilityRole="button"
  accessibilityLabel={checkingOut ? '正在連接付款服務' : '升級 VIP'}
  accessibilityState={{ disabled: checkingOut, busy: checkingOut }}
>
  {checkingOut ? (
    <ActivityIndicator size="small" color={Colors.textOnPrimary} />
  ) : (
    <MaterialIcons name="star" size={14} color={Colors.textOnPrimary} />
  )}
  <Text style={[styles.vipUpgradeBtnText, { fontSize: fs(Typography.sm) }]}>{checkingOut ? '處理中...' : '升級 VIP'}</Text>
</Pressable>
```

## Original status and diagnostic blocks

```tsx
{checkingOut ? (
  <Text style={[styles.paymentStatus, { fontSize: fs(Typography.sm) }]} accessibilityLiveRegion="polite">
    {paymentStatus}
  </Text>
) : null}
<PaymentDiagnosticsPanel compact />
```

```tsx
{!profileLoading && isVip && subscriptionEnd && (
  <View style={styles.subscriptionInfoBar}>
    <MaterialIcons name="verified" size={15} color="#2E7D32" />
    <Text style={[styles.subscriptionInfoText, { fontSize: fs(Typography.xs) }]}>
      訂閱到期：{new Date(subscriptionEnd).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' })}
    </Text>
  </View>
)}
```

The removed `paymentStatus` style used textSecondary, Typography.sm, and lineHeight Typography.sm * 1.6. The expiry-bar styles remain reconstructable from the existing green promotional block: #E8F5E9 background, #A5D6A7 border, #2E7D32 text, Radius.md, horizontal Spacing.md, vertical 8, and fontWeight Typography.semibold.

## API Testing

Previously imported `PaymentDiagnosticsPanel` and rendered it immediately below the header:

```tsx
<View style={styles.paymentDiagnostics}>
  <PaymentDiagnosticsPanel compact />
</View>
```

```tsx
paymentDiagnostics: { marginHorizontal: Spacing.md, marginVertical: Spacing.sm, flexShrink: 0 },
```

All general API log and interactive question-test controls remain unchanged.
