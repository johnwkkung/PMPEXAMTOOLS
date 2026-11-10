import { useState, useEffect, useRef, useCallback } from 'react';
import {
  QuizSession,
  QuizResult,
  QuizConfig,
  generateQuizSession,
  calculateResults,
} from '@/services/quizService';

export interface QuizState {
  session: QuizSession | null;
  currentIndex: number;
  userAnswers: (number | null)[];
  skipped: boolean[];
  selectedAnswer: number | null;
  isAnswered: boolean;
  timeRemainingSeconds: number;
  isTimeUp: boolean;
  result: QuizResult | null;
}

export function useQuiz() {
  const [state, setState] = useState<QuizState>({
    session: null,
    currentIndex: 0,
    userAnswers: [],
    skipped: [],
    selectedAnswer: null,
    isAnswered: false,
    timeRemainingSeconds: 0,
    isTimeUp: false,
    result: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startQuiz = useCallback((config: QuizConfig, isVip: boolean = true) => {
    clearTimer();
    const session = generateQuizSession(config, isVip);
    const totalSeconds = config.timeLimitMinutes ? config.timeLimitMinutes * 60 : 0;

    setState({
      session,
      currentIndex: 0,
      userAnswers: new Array(session.questions.length).fill(null),
      skipped: new Array(session.questions.length).fill(false),
      selectedAnswer: null,
      isAnswered: false,
      timeRemainingSeconds: totalSeconds,
      isTimeUp: false,
      result: null,
    });
  }, [clearTimer]);

  // Timer tick
  useEffect(() => {
    if (!state.session || !state.session.config.timeLimitMinutes || state.isTimeUp || state.result) {
      return;
    }
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemainingSeconds <= 1) {
          clearTimer();
          // Time's up — finalize quiz
          const result = calculateResults(
            prev.session!,
            prev.userAnswers,
            prev.skipped
          );
          return { ...prev, timeRemainingSeconds: 0, isTimeUp: true, result };
        }
        return { ...prev, timeRemainingSeconds: prev.timeRemainingSeconds - 1 };
      });
    }, 1000);
    return () => clearTimer();
  }, [state.session, state.isTimeUp, state.result, clearTimer]);

  const selectAnswer = useCallback((index: number) => {
    setState(prev => {
      if (prev.isAnswered) return prev;
      const newAnswers = [...prev.userAnswers];
      newAnswers[prev.currentIndex] = index;
      return { ...prev, selectedAnswer: index, isAnswered: true, userAnswers: newAnswers };
    });
  }, []);

  const goToNext = useCallback(() => {
    setState(prev => {
      if (!prev.session) return prev;
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.session.questions.length) {
        clearTimer();
        const result = calculateResults(prev.session, prev.userAnswers, prev.skipped);
        return { ...prev, result };
      }
      return {
        ...prev,
        currentIndex: nextIndex,
        selectedAnswer: prev.userAnswers[nextIndex],
        isAnswered: prev.userAnswers[nextIndex] !== null,
      };
    });
  }, [clearTimer]);

  const skipQuestion = useCallback(() => {
    setState(prev => {
      if (!prev.session) return prev;
      const newSkipped = [...prev.skipped];
      newSkipped[prev.currentIndex] = true;
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.session.questions.length) {
        clearTimer();
        const newAnswers = [...prev.userAnswers];
        const result = calculateResults(prev.session, newAnswers, newSkipped);
        return { ...prev, skipped: newSkipped, result };
      }
      return {
        ...prev,
        skipped: newSkipped,
        currentIndex: nextIndex,
        selectedAnswer: prev.userAnswers[nextIndex],
        isAnswered: prev.userAnswers[nextIndex] !== null,
      };
    });
  }, [clearTimer]);

  const resetQuiz = useCallback(() => {
    clearTimer();
    setState({
      session: null,
      currentIndex: 0,
      userAnswers: [],
      skipped: [],
      selectedAnswer: null,
      isAnswered: false,
      timeRemainingSeconds: 0,
      isTimeUp: false,
      result: null,
    });
  }, [clearTimer]);

  return {
    ...state,
    startQuiz,
    selectAnswer,
    goToNext,
    skipQuestion,
    resetQuiz,
  };
}
