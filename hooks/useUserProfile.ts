import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, useAuth } from '@/template';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  mobile: string | null;
  is_vip: boolean;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const supabase = getSupabaseClient();
    supabase
      .from('user_profiles')
      .select('id, email, username, mobile, is_vip')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setProfile(data as UserProfile);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, username, mobile, is_vip')
      .eq('id', user.id)
      .single();
    if (!error && data) {
      setProfile(data as UserProfile);
    }
    setLoading(false);
  }, [user?.id]);

  return { profile, loading, refetch };
}
