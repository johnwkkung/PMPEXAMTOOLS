import { manualVipPayment } from '@/constants/manualVipPayment';
import { fetchAppInformation, type AppInformation } from '@/services/appManagerService';
import { calculateVipPrice, type VipPriceCalculation } from '@/services/vipPricing';

export type VipPaymentInformation = Omit<AppInformation, 'price' | 'discount'> & VipPriceCalculation;

export async function fetchVipPaymentInformation(signal?: AbortSignal): Promise<{
  payment: VipPaymentInformation | null;
  error: string | null;
}> {
  const result = await fetchAppInformation(signal);
  if (result.error || !result.success || !result.information) {
    return { payment: null, error: result.error ?? '無法取得最新付款資料，請重試。' };
  }
  const calculation = calculateVipPrice(result.information.price, result.information.discount);
  if (calculation === null) {
    return { payment: null, error: '伺服器回覆的 PRICE 或 DISCOUNT 無效，暫時無法顯示付款金額。請重試或聯絡我們。' };
  }
  return { payment: { ...result.information, ...calculation }, error: null };
}

// Prepare an email draft only. No payment, verification, or VIP activation is
// performed, and no unresolved Stripe attempt is read, cleared, or replaced.
export function buildVipReceiptEmailUrl(accountEmail: string, payment: VipPaymentInformation): string {
  const subject = '升級 VIP 會員付款收據';
  const body = [
    '《的士及網約車筆試專家》團隊：',
    '',
    `VIP 帳號電郵：${accountEmail}`,
    `付款金額：${payment.amount}`,
    ...(payment.promo !== null ? [`推廣優惠：${payment.promo}`] : []),
    '付款方式：',
    '付款參考編號（Reference Number）：',
    '',
    '請在寄出前附上銀行轉帳收據或付款成功截圖，以便核實付款。',
  ].join('\n');
  return `mailto:${manualVipPayment.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
