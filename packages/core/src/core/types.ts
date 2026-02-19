import { ConflictStrategy } from '../common/constants.js';

export interface CategorizedFile {
  path: string;
  category: string;
  subcategory?: string;
  hash?: string; // Optional - used for cache invalidation
}

export interface IFileScanner {
  scan(directory: string): Promise<string[]>;
}

export interface CategorizationOptions {
  model?: string;
  language?: string;
  context?: string;
  preset?: string;
}

export interface ILLMClient {
  categorize(filePath: string, options?: CategorizationOptions): Promise<CategorizedFile>;
}

export interface IDatabaseService {
  getCachedCategorization(filePath: string, hash: string): Promise<CategorizedFile | null>;
  setCachedCategorization(file: CategorizedFile): Promise<void>;
}

export interface IOutputPort {
  info(message: string): void;
  success(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  log(message: string): void;
}

export interface IProgressReporter {
  start(total: number, startValue: number): void;
  update(current: number, payload?: object): void;
  increment(payload?: object): void;
  stop(): void;
}

export interface IFileOrganizer {
  /**
   * Organizes files by moving them to categorized directories
   * @param baseDirectory - The root directory where categorized folders will be created
   * @param categorizedFiles - Array of files with their categories
   * @param conflictStrategy - How to handle file conflicts
   * @param dryRun - If true, only simulates the operation without moving files
   * @param sessionId - Optional session ID for history tracking
   */
  organize(
    baseDirectory: string,
    categorizedFiles: CategorizedFile[],
    conflictStrategy: ConflictStrategy,
    dryRun?: boolean,
    sessionId?: string
  ): Promise<FileOperationResult[]>;
}

export interface FileOperationResult {
  success: boolean;
  sourcePath: string;
  destinationPath?: string;
  error?: string;
  skipped?: boolean;
}