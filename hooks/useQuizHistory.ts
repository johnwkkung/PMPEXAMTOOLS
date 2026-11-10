import { useState, useEffect, useCallback } from 'react';
import { fetchQuizHistory, HistoryEntry } from '@/services/quizManagerService';

export interface QuizHistoryState {
  practiceHistory: HistoryEntry[];
  examHistory: HistoryEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuizHistory(userEmail: string | null | undefined): QuizHistoryState {
  const [practiceHistory, setPracticeHistory] = useState<HistoryEntry[]>([]);
  const [examHistory, setExamHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError(null);
    const result = await fetchQuizHistory(userEmail);
    if (result.success) {
      // Service already splits by exam_type; hook just stores them
      setPracticeHistory(result.practiceHistory);
      setExamHistory(result.examHistory);
    } else {
      setError(result.message ?? '無法載入記錄');
    }
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) load();
  }, [userEmail, load]);

  return { practiceHistory, examHistory, loading, error, refetch: load };
}
