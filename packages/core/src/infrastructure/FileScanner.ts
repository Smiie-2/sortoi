import type { IFileScanner } from '../core/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Dirent } from 'fs';
import logger from './Logger.js';
import { LIMITS, REGEX } from '../common/constants.js';

export class FileScanner implements IFileScanner {
  public async scan(rootDir: string): Promise<string[]> {
    const files: string[] = [];
    const resolvedRootDir = path.resolve(rootDir);

    logger.info('Starting directory scan', { directory: resolvedRootDir });

    let entries: Dirent[];
    try {
      entries = await fs.readdir(resolvedRootDir, { withFileTypes: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to scan directory', { directory: resolvedRootDir, error: errorMessage });
      throw new Error(`Failed to scan directory ${resolvedRootDir}: ${errorMessage}`);
    }

    for (const entry of entries) {
      // 🔒 SECURITY: Skip hidden files and system files
      if (entry.name.startsWith('.')) {
        logger.debug('Skipping hidden file', { filename: entry.name });
        continue;
      }

      // 🔒 SECURITY: Validate filename safety
      if (!REGEX.SAFE_FILENAME.test(entry.name)) {
        logger.warn('Skipping file with unsafe characters', { filename: entry.name });
        console.warn(`⚠️  Skipping file with special characters: ${entry.name}`);
        continue;
      }

      // Only add files, skip directories
      if (!entry.isDirectory()) {
        const fullPath = path.join(resolvedRootDir, entry.name);
        files.push(fullPath);

        // 🔒 SECURITY: DoS protection - limit max files
        if (files.length >= LIMITS.MAX_FILES) {
          logger.warn('Maximum file limit reached', { limit: LIMITS.MAX_FILES });
          throw new Error(
            `Directory contains too many files (max: ${LIMITS.MAX_FILES}). ` +
            `This limit prevents memory exhaustion. ` +
            `Consider organizing files in smaller batches.`
          );
        }
      }
    }

    logger.info('Directory scan completed', { 
      directory: resolvedRootDir, 
      fileCount: files.length 
    });

    return files;
  }
}