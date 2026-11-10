// logService.ts
// Appends API call records to a local log file using expo-file-system.
// Log file location: <app documents directory>/api_calls.log
// On Android: /data/data/<package>/files/api_calls.log
// On iOS:     <AppSandbox>/Documents/api_calls.log

import * as FileSystem from 'expo-file-system';

const LOG_FILE = (FileSystem.documentDirectory ?? '') + 'api_calls.log';

/** Strips sensitive credential fields before logging */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const { password: _pw, api_password: _ap, newpassword: _np, ...safe } = body as Record<string, unknown> & {
    password?: unknown;
    api_password?: unknown;
    newpassword?: unknown;
  };
  return safe;
}

/** Formats a Date to 'YYYY-MM-DD HH:MM:SS' */
function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Appends a single API call entry to api_calls.log (fire-and-forget).
 * Each entry is one line: [YYYY-MM-DD HH:MM:SS] MODE url\n{json}\n---\n
 */
export function logApiCall(params: {
  apiUrl: string;
  apiMode: string;
  userEmail?: string;
  body: Record<string, unknown>;
}): void {
  const safeBody = sanitizeBody(params.body);
  if (params.userEmail) safeBody['_user'] = params.userEmail;

  const entry =
    `[${formatNow()}] ${params.apiMode} ${params.apiUrl}\n` +
    JSON.stringify(safeBody, null, 2) +
    '\n---\n';

  (async () => {
    try {
      let existing = '';
      const info = await FileSystem.getInfoAsync(LOG_FILE);
      if (info.exists) {
        existing = await FileSystem.readAsStringAsync(LOG_FILE);
      }
      await FileSystem.writeAsStringAsync(LOG_FILE, existing + entry);
    } catch (err) {
      console.warn('[logService] write error:', err);
    }
  })();
}

/** Returns the full path to the log file (for display purposes) */
export function getLogFilePath(): string {
  return LOG_FILE;
}
