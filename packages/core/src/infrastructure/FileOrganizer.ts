import * as fs from 'fs/promises';
import * as path from 'path';
import type { CategorizedFile, IFileOrganizer, FileOperationResult } from '../core/types.js';
import { ConflictStrategy } from '../common/constants.js';
import type { IConflictResolver } from './ConflictResolver.js';
import type { IHistoryService } from './HistoryService.js';
import logger from './Logger.js';

export class FileOrganizer implements IFileOrganizer {
  constructor(
    private readonly conflictResolver: IConflictResolver,
    private readonly historyService?: IHistoryService
  ) { }

  async organize(
    baseDirectory: string,
    categorizedFiles: CategorizedFile[],
    conflictStrategy: ConflictStrategy,
    dryRun: boolean = false,
    sessionId?: string
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];

    for (const file of categorizedFiles) {
      try {
        const result = await this.organizeFile(
          baseDirectory,
          file,
          conflictStrategy,
          dryRun,
          sessionId
        );
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to organize file', {
          file: file.path,
          error: errorMessage
        });

        results.push({
          success: false,
          sourcePath: file.path,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  private async organizeFile(
    baseDirectory: string,
    file: CategorizedFile,
    conflictStrategy: ConflictStrategy,
    dryRun: boolean,
    sessionId?: string
  ): Promise<FileOperationResult> {
    const categoryPath = file.subcategory
      ? path.join(baseDirectory, file.category, file.subcategory)
      : path.join(baseDirectory, file.category);

    // 🔒 SECURITY: Ensure category doesn't escape the base directory
    const resolvedCategoryPath = path.resolve(categoryPath);
    const resolvedBaseDir = path.resolve(baseDirectory);

    if (!resolvedCategoryPath.startsWith(resolvedBaseDir)) {
      throw new Error(`Security breach: AI suggested category "${file.category}" escapes the base directory.`);
    }

    const fileName = path.basename(file.path);
    let destinationPath = path.join(resolvedCategoryPath, fileName);

    logger.debug('Organizing file', {
      source: file.path,
      category: file.category,
      subcategory: file.subcategory,
      destination: destinationPath,
      dryRun,
    });

    if (dryRun) {
      return {
        success: true,
        sourcePath: file.path,
        destinationPath,
      };
    }

    // Create category directory if it doesn't exist
    await fs.mkdir(categoryPath, { recursive: true });

    // Record directory creation in history
    if (sessionId && this.historyService) {
      this.historyService.recordOperation(sessionId, {
        type: 'create_directory',
        directoryPath: categoryPath,
        timestamp: new Date(),
      });
    }

    // Resolve conflicts
    try {
      destinationPath = await this.conflictResolver.resolve(
        file.path,
        destinationPath,
        conflictStrategy
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ConflictSkipError') {
        logger.info('File skipped due to conflict', { path: file.path });
        return {
          success: true,
          sourcePath: file.path,
          destinationPath,
          skipped: true,
        };
      }
      throw error;
    }

    // Move the file
    await fs.rename(file.path, destinationPath);

    // Record move operation in history
    if (sessionId && this.historyService) {
      this.historyService.recordOperation(sessionId, {
        type: 'move',
        sourcePath: file.path,
        destinationPath,
        timestamp: new Date(),
      });
    }

    logger.info('File organized successfully', {
      from: file.path,
      to: destinationPath
    });

    return {
      success: true,
      sourcePath: file.path,
      destinationPath,
    };
  }
}
