/**
 * Simple logging utility with adjustable log levels.
 *
 * Set `LOG_LEVEL` to one of `DEBUG`, `INFO`, `WARN`, or `ERROR` to control
 * verbosity. Defaults to `INFO`. Messages below the configured level are
 * suppressed. `process.env.DEBUG` is treated the same as `LOG_LEVEL=DEBUG` for
 * backwards compatibility.
 *
 * @namespace log
 * @property {(...args: any[]) => void} info  Log an informational message.
 * @property {(...args: any[]) => void} warn  Log a warning message.
 * @property {(...args: any[]) => void} error Log an error message.
 * @property {(...args: any[]) => void} debug Log a debug message.
 */

const levelMap = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const envLevel = process.env.LOG_LEVEL || (process.env.DEBUG ? 'DEBUG' : 'INFO');
const currentLevel = levelMap[envLevel.toUpperCase()] ?? levelMap.INFO;

const shouldLog = (level) => levelMap[level] >= currentLevel;

export const log = {
  info: (...args) => {
    if (shouldLog('INFO')) console.log('[INFO]', ...args);
  },
  warn: (...args) => {
    if (shouldLog('WARN')) console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    if (shouldLog('ERROR')) console.error('[ERROR]', ...args);
  },
  debug: (...args) => {
    if (shouldLog('DEBUG')) console.debug('[DEBUG]', ...args);
  },
};
