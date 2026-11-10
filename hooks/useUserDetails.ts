import { useCallback, useEffect, useRef, useState } from 'react';
import { callGetUser, type UserDetails } from '@/services/userManagerService';

/** Fetch on demand only; never changes the account's authoritative VIP access. */
export function useUserDetails(userEmail: string | null) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    setVisible(false);
    setLoading(false);
    setDetails(null);
    setError(null);
    return () => {
      sequence.current += 1;
      pending.current?.abort();
      pending.current = null;
    };
  }, [userEmail]);

  const loadDetails = useCallback(async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const request = ++sequence.current;
    setLoading(true);
    setDetails(null);
    setError(null);
    try {
      const result = await callGetUser(userEmail ?? '', controller.signal);
      if (sequence.current !== request || controller.signal.aborted) return;
      if (!result.success || !result.details) {
        setError(result.message ?? '未能取得會員資料，請重試。');
      } else {
        setDetails(result.details);
      }
    } catch {
      if (sequence.current === request && !controller.signal.aborted) {
        setError('未能取得會員資料，請重試。');
      }
    } finally {
      if (sequence.current === request) {
        pending.current = null;
        setLoading(false);
      }
    }
  }, [userEmail]);

  const openDetails = useCallback(() => {
    setVisible(true);
    void loadDetails();
  }, [loadDetails]);

  const closeDetails = useCallback(() => {
    sequence.current += 1;
    pending.current?.abort();
    pending.current = null;
    setVisible(false);
    setLoading(false);
    setDetails(null);
    setError(null);
  }, []);

  return { visible, loading, details, error, openDetails, closeDetails, retry: loadDetails };
}
