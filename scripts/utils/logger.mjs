/**
 * Lightweight logging wrapper to allow DEBUG control.
 * @namespace log
 * @property {(...args: any[]) => void} info  Log an informational message.
 * @property {(...args: any[]) => void} warn  Log a warning message.
 * @property {(...args: any[]) => void} error Log an error message.
 * @property {(...args: any[]) => void} debug Log when `DEBUG` is enabled.
 */
export const log = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.DEBUG) console.debug('[DEBUG]', ...args);
  },
};
