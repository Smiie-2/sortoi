/**
 * Application-wide constants
 */

/**
 * Limits and thresholds for the application
 */
export const LIMITS = {
  /** Maximum number of files to scan in a directory */
  MAX_FILES: 10000,
  /** Maximum number of concurrent API requests */
  MAX_CONCURRENCY: 5,
  /** Maximum number of retry attempts for failed operations */
  MAX_RETRIES: 3,
} as const;

/**
 * Regular expressions for validation
 */
export const REGEX = {
  /** 
   * Pattern for safe filenames - BLACKLIST approach (blocks dangerous chars)
   * 
   * ✅ ALLOWS:
   * - Alphanumeric (a-z, A-Z, 0-9)
   * - Spaces and common punctuation (._-,;&!)
   * - Parentheses, brackets ()[]{}
   * - Special symbols (@#$%+=)
   * - Unicode letters (á, é, í, ó, ú, ñ, à, è, etc.)
   * 
   * ❌ BLOCKS dangerous characters:
   * - < > (redirection operators)
   * - " (quote - can break command line parsing)
   * - | (pipe operator)
   * - ? * (wildcards)
   * - : (colon - reserved in Windows, except drive letters)
   * - / \ (path separators)
   * - NULL and control characters (\x00-\x1F)
   * 
   * ⚠️  LIMITATION: This is a blacklist approach
   * For maximum security, consider using PathValidator with OS-specific whitelist
   */
  SAFE_FILENAME: /^[^<>"|?*:\\/\x00-\x1F]+$/,
} as const;

/**
 * Retry and backoff configuration
 */
export const RETRY = {
  /** Base delay in milliseconds for exponential backoff */
  BASE_DELAY_MS: 1000,
  /** Maximum delay in milliseconds for exponential backoff */
  MAX_DELAY_MS: 10000,
} as const;

/**
 * Conflict resolution strategies when destination file already exists
 */
export enum ConflictStrategy {
  /** Skip the file and don't move it */
  SKIP = 'skip',
  /** Overwrite the existing file */
  OVERWRITE = 'overwrite',
  /** Rename the new file with a suffix (e.g., file(1).txt) */
  RENAME = 'rename',
  /** Ask the user what to do (interactive mode) */
  ASK = 'ask',
}
