// QuizManager API service
// Fetches quiz questions from the external quizManager backend

import { logApiCall } from '@/services/logService';
import { EXAM_FAIL_THRESHOLD } from '@/constants/exam';

import { domainApiConfig } from '@/constants/domainApi';

const QUIZ_MANAGER_URI = `${domainApiConfig.baseUrl}/quizManager`;
const API_USER_ID = domainApiConfig.userId;
const API_PASSWORD = domainApiConfig.password;

export interface QuizQuestion {
  QNO: number;
  QUESTION: string;
  ANS1: string;
  ANS2: string;
  ANS3: string;
  ANS4: string;
  CORRECT: string; // '1' | '2' | '3' | '4'
  QIMG: string | null;
  CIMG1: string | null;
  CIMG2: string | null;
  CIMG3: string | null;
}

export type QuizMode = 'SAMP' | 'PRACA1' | 'PRACA2' | 'PRACA3' | 'PRACB' | 'EXAM';

export interface QuizManagerResult {
  success: boolean;
  questions: QuizQuestion[];
  message?: string;
}

export async function fetchQuizQuestions(mode: QuizMode): Promise<QuizManagerResult> {
  try {
    const requestBody = { mode, user_id: API_USER_ID, password: API_PASSWORD };
    logApiCall({ apiUrl: QUIZ_MANAGER_URI, apiMode: mode, body: requestBody });
    const response = await fetch(QUIZ_MANAGER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (response.status !== 200) {
      let errMsg = `伺服器錯誤 (${response.status})`;
      if (typeof data === 'string' && data.trim()) {
        errMsg = data.trim();
      } else if (typeof data === 'object' && data !== null) {
        const d = data as Record<string, unknown>;
        errMsg =
          (typeof d['error'] === 'string' ? d['error'] : null) ??
          (typeof d['message'] === 'string' ? d['message'] : null) ??
          errMsg;
      }
      return { success: false, questions: [], message: errMsg };
    }

    if (typeof data !== 'object' || data === null) {
      return { success: false, questions: [], message: '無效的回應格式' };
    }

    const obj = data as Record<string, unknown>;

    // Find the questions array inside the data field
    // Response: { mode, success, data: { ExamA1: [...], ExamB: [...] } }
    // or for SAMP/PRAC: { data: { ExamA1: [...] } }
    const dataField = obj['data'];
    if (typeof dataField !== 'object' || dataField === null) {
      return { success: false, questions: [], message: '找不到題目資料' };
    }

    const dataObj = dataField as Record<string, unknown>;
    const questions: QuizQuestion[] = [];

    // Collect all question arrays (supports multiple sections like EXAM)
    for (const key of Object.keys(dataObj)) {
      const arr = dataObj[key];
      if (Array.isArray(arr)) {
        for (const item of arr) {
          questions.push(item as QuizQuestion);
        }
      }
    }

    if (questions.length === 0) {
      return { success: false, questions: [], message: '未能取得題目，請稍後再試' };
    }

    return { success: true, questions };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '網絡連接失敗，請稍後再試。';
    return { success: false, questions: [], message };
  }
}

export interface SaveResultPayload {
  mode: 'SAVEPR' | 'SAVEEX';
  useremail: string;
  rectime?: string;          // SAVEPR only
  ncorrect?: number;         // SAVEPR only
  nwrong?: number;           // SAVEPR only
  ncorrectA?: number;        // SAVEEX only – Part A correct
  nwrongA?: number;          // SAVEEX only – Part A wrong
  ncorrectB?: number;        // SAVEEX only – Part B correct
  nwrongB?: number;          // SAVEEX only – Part B wrong
  qlist: number[];
  anslist: (number | null | '')[]; // SAVEPR sends unanswered entries as empty strings
  istmo: string | number;    // SAVEPR: '' | SAVEEX: 0 | 1
}

export interface SaveResultResponse {
  success: boolean;
  message?: string;
}

/** Formats a Date to 'YYYY-MM-DD HH:MM:SS' */
function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Saves a completed practice (SAVEPR) or exam (SAVEEX) result to the server.
 * Fire-and-forget safe — errors are returned, not thrown.
 */
export async function saveQuizResult(
  payload: SaveResultPayload
): Promise<SaveResultResponse> {
  try {
    // Build request body based on mode
    const rectime = formatDateTime(new Date());
    const requestBody: Record<string, unknown> =
      payload.mode === 'SAVEEX'
        ? {
            mode: 'SAVEEX',
            useremail: payload.useremail,
            rectime,
            ncorrectA: payload.ncorrectA ?? 0,
            nwrongA: payload.nwrongA ?? 0,
            ncorrectB: payload.ncorrectB ?? 0,
            nwrongB: payload.nwrongB ?? 0,
            qlist: payload.qlist,
            anslist: payload.anslist,
            istmo: payload.istmo,
            user_id: API_USER_ID,
            password: API_PASSWORD,
          }
        : {
            mode: payload.mode,
            useremail: payload.useremail,
            rectime: payload.rectime ?? rectime,
            ncorrect: payload.ncorrect ?? 0,
            nwrong: payload.nwrong ?? 0,
            qlist: payload.qlist,
            anslist: payload.anslist.map((answer) => answer ?? ''),
            istmo: payload.istmo,
            user_id: API_USER_ID,
            password: API_PASSWORD,
          };
    logApiCall({ apiUrl: QUIZ_MANAGER_URI, apiMode: payload.mode, userEmail: payload.useremail, body: requestBody });
    const response = await fetch(QUIZ_MANAGER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 200) {
      return { success: true };
    }
    const saveText = await response.text();
    let saveErrMsg = `伺服器錯誤 (${response.status})`;
    try {
      const parsed = JSON.parse(saveText) as Record<string, unknown>;
      saveErrMsg =
        (typeof parsed['error'] === 'string' ? parsed['error'] : null) ??
        (typeof parsed['message'] === 'string' ? parsed['message'] : null) ??
        saveErrMsg;
    } catch { if (saveText.trim()) saveErrMsg = saveText.trim(); }
    return { success: false, message: saveErrMsg };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '網絡連接失敗';
    return { success: false, message };
  }
}

// ─── History ──────────────────────────────────────────────────────────────

export interface HistoryEntry {
  date: string;              // ISO date string from server
  exam_type: 'PRAC' | 'EXAM';
  correct: number;
  wrong: number;
  status: 'pass' | 'fail';
  // EXAM-only breakdown
  correcta?: number;         // Part A correct
  correctb?: number;         // Part B correct
  wronga?: number;           // Part A wrong
  wrongb?: number;           // Part B wrong
}

export interface FetchHistoryResult {
  success: boolean;
  practiceHistory: HistoryEntry[];
  examHistory: HistoryEntry[];
  message?: string;
}

/** Parse a section count without treating missing/null/empty values as zero. */
function parseSectionWrongCount(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : undefined;
}

/**
 * Fetches quiz result history for a user.
 * Splits results into practice (SAVEPR) and exam (SAVEEX) lists.
 * Applies the shared exam rule when both section wrong counts are available.
 * Otherwise preserves the server status, since totals alone cannot determine a pass.
 */
export async function fetchQuizHistory(useremail: string): Promise<FetchHistoryResult> {
  try {
    const requestBody = {
      mode: 'GETHISTORY',
      useremail,
      user_id: API_USER_ID,
      password: API_PASSWORD,
    };
    logApiCall({ apiUrl: QUIZ_MANAGER_URI, apiMode: 'GETHISTORY', userEmail: useremail, body: requestBody });

    const response = await fetch(QUIZ_MANAGER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    if (response.status !== 200) {
      let histErrMsg = `伺服器錯誤 (${response.status})`;
      if (typeof data === 'string' && data.trim()) {
        histErrMsg = data.trim();
      } else if (typeof data === 'object' && data !== null) {
        const d = data as Record<string, unknown>;
        histErrMsg =
          (typeof d['error'] === 'string' ? d['error'] : null) ??
          (typeof d['message'] === 'string' ? d['message'] : null) ??
          histErrMsg;
      }
      return { success: false, practiceHistory: [], examHistory: [], message: histErrMsg };
    }

    const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const dataField = obj['data'];
    const allEntries: HistoryEntry[] = [];

    // Server returns data as a flat array sorted newest-first
    const src = Array.isArray(dataField) ? dataField : [];
    for (const item of src) {
      const e = item as Record<string, unknown>;
      const examType = String(e['exam_type'] ?? '').toUpperCase();
      const wronga = parseSectionWrongCount(e['wronga']);
      const wrongb = parseSectionWrongCount(e['wrongb']);
      const serverStatus = String(e['status'] ?? '').toLowerCase() === 'pass' ? 'pass' : 'fail';
      const status: HistoryEntry['status'] =
        examType === 'EXAM' && wronga !== undefined && wrongb !== undefined
          ? (wronga < EXAM_FAIL_THRESHOLD && wrongb < EXAM_FAIL_THRESHOLD ? 'pass' : 'fail')
          : serverStatus;
      allEntries.push({
        date: String(e['date'] ?? ''),
        exam_type: examType === 'EXAM' ? 'EXAM' : 'PRAC',
        correct: Number(e['correct'] ?? 0),
        wrong: Number(e['wrong'] ?? 0),
        status,
        correcta: e['correcta'] !== undefined ? Number(e['correcta']) : undefined,
        correctb: e['correctb'] !== undefined ? Number(e['correctb']) : undefined,
        wronga,
        wrongb,
      });
    }

    return {
      success: true,
      practiceHistory: allEntries.filter((e) => e.exam_type === 'PRAC'),
      examHistory: allEntries.filter((e) => e.exam_type === 'EXAM'),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '網絡連接失敗';
    return { success: false, practiceHistory: [], examHistory: [], message };
  }
}

/** Returns the correct answer index (0-based) from CORRECT field ('1'~'4') */
export function getCorrectIndex(correct: string): number {
  const n = parseInt(correct, 10);
  return isNaN(n) ? 0 : Math.max(0, n - 1);
}

/** Image base path — maps QIMG/CIMG filenames to local assets */
export const IMAGE_BASE_PATH = '/images/';
