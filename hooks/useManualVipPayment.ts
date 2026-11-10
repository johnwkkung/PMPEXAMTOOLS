import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useAlert, useAuth } from '@/template';
import { manualVipPayment } from '@/constants/manualVipPayment';
import {
  buildVipReceiptEmailUrl, fetchVipPaymentInformation, type VipPaymentInformation,
} from '@/services/manualVipPaymentService';

export function useManualVipPayment() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [visible, setVisible] = useState(false);
  const [openingEmail, setOpeningEmail] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [payment, setPayment] = useState<VipPaymentInformation | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const emailInFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, []);

  const retryPayment = useCallback(async () => {
    if (request.current !== null) return;
    const controller = new AbortController();
    request.current = controller;
    setLoadingPayment(true);
    setPayment(null);
    setPaymentError(null);
    try {
      const result = await fetchVipPaymentInformation(controller.signal);
      if (!mounted.current || controller.signal.aborted || request.current !== controller) return;
      if (result.error || !result.payment) {
        setPaymentError(result.error ?? '無法取得最新付款資料，請重試。');
        return;
      }
      setPayment(result.payment);
    } catch {
      if (mounted.current && !controller.signal.aborted && request.current === controller) {
        setPaymentError('無法取得最新付款資料，請檢查網絡連線後重試。');
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setLoadingPayment(false);
      }
    }
  }, []);

  const openPaymentPage = useCallback(() => {
    setVisible(true);
    void retryPayment();
  }, [retryPayment]);

  const closePaymentPage = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setVisible(false);
    setLoadingPayment(false);
    setPayment(null);
    setPaymentError(null);
  }, []);

  const emailReceipt = useCallback(async () => {
    if (emailInFlight.current || payment === null || loadingPayment) return;
    emailInFlight.current = true;
    setOpeningEmail(true);
    try {
      await Linking.openURL(buildVipReceiptEmailUrl(user?.email ?? '', payment));
    } catch {
      showAlert('無法開啟電郵', `請使用您的電郵應用程式，將付款參考編號及付款收據寄至：${manualVipPayment.email}`);
    } finally {
      emailInFlight.current = false;
      if (mounted.current) setOpeningEmail(false);
    }
  }, [showAlert, user?.email, payment, loadingPayment]);

  return {
    visible, openingEmail, loadingPayment, payment, paymentError,
    openPaymentPage, closePaymentPage, retryPayment, emailReceipt,
  };
}
