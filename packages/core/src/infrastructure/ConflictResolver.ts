import * as fs from 'fs/promises';
import * as path from 'path';
import { ConflictStrategy } from '../common/constants.js';
import logger from './Logger.js';

export interface IConflictResolver {
  /**
   * Resolves file conflicts when moving/copying files
   * @param sourcePath - Original file path
   * @param destinationPath - Intended destination path
   * @param strategy - Strategy to use for conflict resolution
   * @returns The final destination path to use
   */
  resolve(sourcePath: string, destinationPath: string, strategy: ConflictStrategy): Promise<string>;
}

export class ConflictResolver implements IConflictResolver {
  async resolve(sourcePath: string, destinationPath: string, strategy: ConflictStrategy): Promise<string> {
    const exists = await this.fileExists(destinationPath);
    
    if (!exists) {
      return destinationPath;
    }

    logger.info('File conflict detected', { 
      source: sourcePath, 
      destination: destinationPath, 
      strategy 
    });

    switch (strategy) {
      case ConflictStrategy.SKIP:
        throw new ConflictSkipError(destinationPath);
      
      case ConflictStrategy.OVERWRITE:
        logger.warn('Overwriting existing file', { path: destinationPath });
        return destinationPath;
      
      case ConflictStrategy.RENAME:
        return await this.findAvailableName(destinationPath);
      
      case ConflictStrategy.ASK:
        throw new Error('Interactive conflict resolution not yet implemented');
      
      default:
        throw new Error(`Unknown conflict strategy: ${strategy}`);
    }
  }

  /**
   * Finds an available filename by appending (1), (2), etc.
   * Example: document.pdf -> document(1).pdf -> document(2).pdf
   */
  private async findAvailableName(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    let counter = 1;
    let newPath: string;
    
    do {
      newPath = path.join(dir, `${baseName}(${counter})${ext}`);
      counter++;
      
      // Safety limit to prevent infinite loops
      if (counter > 1000) {
        throw new Error(`Too many file conflicts for ${filePath}`);
      }
    } while (await this.fileExists(newPath));
    
    logger.info('Resolved conflict with rename', { 
      original: filePath, 
      renamed: newPath 
    });
    
    return newPath;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Error thrown when a conflict is resolved by skipping the file
 */
export class ConflictSkipError extends Error {
  constructor(public readonly filePath: string) {
    super(`File already exists and was skipped: ${filePath}`);
    this.name = 'ConflictSkipError';
  }
}
