// Lightweight logging wrapper to allow DEBUG control
export const log = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.DEBUG) console.debug('[DEBUG]', ...args);
  },
};
