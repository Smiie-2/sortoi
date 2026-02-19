import * as path from 'path';
import * as os from 'os';

/**
 * Windows reserved filenames (case-insensitive)
 * https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Maximum path length on Windows (without long path support)
 */
const WINDOWS_MAX_PATH = 260;

/**
 * Maximum filename length on most filesystems
 */
const MAX_FILENAME_LENGTH = 255;

export class PathValidator {
  private readonly isWindows: boolean;

  constructor() {
    this.isWindows = os.platform() === 'win32';
  }

  public sanitizeAndValidate(userInput: string): string {
    // 1. Remove any null bytes
    const cleaned = userInput.replace(/\0/g, '');

    // 2. Normalize path separators and resolve to an absolute path
    const resolvedPath = path.resolve(cleaned);

    // 3. Check for path traversal specifically
    if (cleaned.includes('/../') || 
        cleaned.includes('\\..\\') || 
        cleaned.startsWith('../') || 
        cleaned.startsWith('..\\') ||
        cleaned === '..' ||
        cleaned.endsWith('/..') ||
        cleaned.endsWith('\\..')) {
      throw new Error('Path traversal sequences ("../") are not allowed.');
    }

    // 4. Check for other shell metacharacters that are unlikely in a legitimate path
    const dangerousChars = /[\$\`\|;&]/;
    if (dangerousChars.test(cleaned)) {
      throw new Error('Path contains dangerous shell characters (e.g., $, `, |, ;, &).');
    }

    // 5. Validate using OS-specific rules
    this.validateOsSpecific(resolvedPath);

    // 6. Return the resolved, absolute path for consistency
    return resolvedPath;
  }

  /**
   * OS-specific validation using native path APIs and whitelisting
   */
  private validateOsSpecific(resolvedPath: string): void {
    // Parse the path using native API
    const parsed = path.parse(resolvedPath);

    // Validate filename component
    if (parsed.base) {
      this.validateFilename(parsed.base);
    }

    // Validate path length
    if (this.isWindows && resolvedPath.length > WINDOWS_MAX_PATH) {
      throw new Error(`Path exceeds Windows MAX_PATH limit (${WINDOWS_MAX_PATH} characters): ${resolvedPath.length} characters`);
    }

    // Validate each component of the path
    const components = resolvedPath.split(path.sep).filter(c => c.length > 0);
    for (const component of components) {
      // Skip drive letter on Windows (C:, D:, etc.)
      if (this.isWindows && /^[A-Za-z]:$/.test(component)) {
        continue;
      }

      this.validatePathComponent(component);
    }
  }

  /**
   * Validate a single filename using whitelist approach
   */
  private validateFilename(filename: string): void {
    // Check filename length
    if (filename.length > MAX_FILENAME_LENGTH) {
      throw new Error(`Filename exceeds maximum length (${MAX_FILENAME_LENGTH} characters): ${filename}`);
    }

    // Windows-specific validation
    if (this.isWindows) {
      this.validateWindowsFilename(filename);
    }

    // Universal validation (works for both Windows and Unix)
    this.validateUniversalFilename(filename);
  }

  /**
   * Validate Windows-specific filename rules
   */
  private validateWindowsFilename(filename: string): void {
    // Check for reserved names
    const baseNameWithoutExt = filename.split('.')[0]?.toUpperCase() || '';
    if (WINDOWS_RESERVED_NAMES.has(baseNameWithoutExt)) {
      throw new Error(`Filename uses Windows reserved name: ${filename}`);
    }

    // Windows doesn't allow these characters in filenames
    const windowsInvalidChars = /[<>:"|?*]/;
    if (windowsInvalidChars.test(filename)) {
      throw new Error(`Filename contains Windows-invalid characters (<>:"|?*): ${filename}`);
    }

    // Windows doesn't allow filenames ending with space or period
    if (filename.endsWith(' ') || filename.endsWith('.')) {
      throw new Error(`Windows filenames cannot end with space or period: ${filename}`);
    }
  }

  /**
   * Validate filename using universal rules (safe on all OS)
   */
  private validateUniversalFilename(filename: string): void {
    // Path separators should never be in filenames
    if (filename.includes('/') || filename.includes('\\')) {
      throw new Error(`Filename contains path separators: ${filename}`);
    }

    // Control characters (0x00-0x1F) are never valid
    if (/[\x00-\x1F]/.test(filename)) {
      throw new Error(`Filename contains control characters: ${filename}`);
    }

    // Empty filename
    if (filename.trim().length === 0) {
      throw new Error('Filename cannot be empty or whitespace-only');
    }
  }

  /**
   * Validate a single path component (directory or filename)
   */
  private validatePathComponent(component: string): void {
    // Each component has same rules as filename
    this.validateFilename(component);
  }
}
