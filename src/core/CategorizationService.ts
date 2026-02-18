import type { CategorizedFile, IFileScanner, ILLMClient, IDatabaseService, IOutputPort, IProgressReporter, IFileOrganizer, CategorizationOptions } from './types.js';
import path from 'path';
import { getFileName } from '../common/utils/pathUtils.js';
import { getFileHash } from '../common/utils/fileUtils.js';
import pLimit from 'p-limit';
import { CategorizationError } from './errors.js';
import { LIMITS, RETRY, ConflictStrategy } from '../common/constants.js';
import type { IMetricsCollector } from '../infrastructure/MetricsCollector.js';
import type { ITelemetryService } from '../infrastructure/TelemetryService.js';

export class CategorizationService {
  constructor(
    private readonly fileScanner: IFileScanner,
    private readonly llmClient: ILLMClient,
    private readonly output: IOutputPort,
    private readonly progress: IProgressReporter,
    private readonly fileOrganizer?: IFileOrganizer,
    private readonly databaseService?: IDatabaseService,
    private readonly metricsCollector?: IMetricsCollector,
    private readonly telemetryService?: ITelemetryService
  ) { }

  async categorizeDirectory(directory: string, options: { silent?: boolean, concurrency?: number, categorizationOptions?: CategorizationOptions } = {}): Promise<CategorizedFile[]> {
    const files = await this.fileScanner.scan(directory);
    const limit = pLimit(options.concurrency || LIMITS.MAX_CONCURRENCY);

    if (!options.silent) {
      this.progress.start(files.length, 0);
    }

    const categorizationPromises = files.map((file) =>
      limit(() => this.categorizeSingleFileWithRetry(file, options.silent, LIMITS.MAX_RETRIES, options.categorizationOptions))
    );

    const results = await Promise.all(categorizationPromises);

    if (!options.silent) {
      this.progress.stop();
    }

    return results.filter((result): result is CategorizedFile => result !== null);
  }

  private async categorizeSingleFileWithRetry(
    file: string,
    silent?: boolean,
    retries: number = LIMITS.MAX_RETRIES,
    options?: CategorizationOptions
  ): Promise<CategorizedFile | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const hash = await getFileHash(file);

        if (this.databaseService) {
          const cached = await this.databaseService.getCachedCategorization(file, hash);
          if (cached) {
            if (!silent) this.progress.increment();
            this.metricsCollector?.recordSuccess(true); // Cache hit
            return cached;
          }
        }

        const categorizedFile = await this.llmClient.categorize(file, options);
        const fileWithHash = { ...categorizedFile, hash };

        if (this.databaseService) {
          await this.databaseService.setCachedCategorization(fileWithHash);
        }
        if (!silent) this.progress.increment();
        this.metricsCollector?.recordSuccess(false); // Cache miss
        return fileWithHash;
      } catch (error) {
        const categorizationError = this.classifyError(error, file);

        // 🚀 CRITICAL: Report unknown errors to telemetry for investigation
        if (categorizationError.reason === 'unknown' && this.telemetryService) {
          await this.telemetryService.reportUnknownError(error, file, {
            attempt,
            maxRetries: retries,
            hasCache: !!this.databaseService,
          });
        }

        if (categorizationError.reason === 'network' && attempt < retries) {
          await this.delay(RETRY.BASE_DELAY_MS * attempt);
          continue;
        }

        if (!silent) this.progress.increment();
        this.metricsCollector?.recordFailure(categorizationError.reason);
        this.output.error(`\n✗ Failed to categorize ${getFileName(file)}: ${categorizationError.message}`);
        return null;
      }
    }
    return null;
  }

  private classifyError(error: unknown, filePath: string): CategorizationError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Database errors (should be rare after migration)
      if (message.includes('no such column') ||
        message.includes('sqlite') ||
        message.includes('database')) {
        return new CategorizationError(filePath, 'unknown', `Database error: ${error.message}`, error);
      }

      // Network errors
      if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch failed') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('etimedout')) {
        return new CategorizationError(filePath, 'network', 'Network error', error);
      }

      // API errors
      if (message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('429')) {
        return new CategorizationError(filePath, 'api_limit', 'API rate limit exceeded', error);
      }

      // Authentication errors
      if (message.includes('unauthorized') ||
        message.includes('invalid api key') ||
        message.includes('403') ||
        message.includes('401')) {
        return new CategorizationError(filePath, 'auth', 'Authentication error', error);
      }

      // API errors (general)
      if (message.includes('api error') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503')) {
        return new CategorizationError(filePath, 'api_error', 'API server error', error);
      }
    }

    // Log the unknown error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Use a more descriptive unknown error message
    return new CategorizationError(
      filePath,
      'unknown',
      `Unknown error: ${errorMessage}`,
      error as Error
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async moveFiles(categorizedFiles: CategorizedFile[], options: {
    dryRun?: boolean;
    useSubcategories?: boolean;
    baseDirectory: string;
  }): Promise<{ from: string; to: string; success: boolean; error?: string }[]> {
    if (!this.fileOrganizer) {
      // Fallback to old implementation for dry runs or when no organizer is provided
      if (options.dryRun) {
        return this.handleDryRun(categorizedFiles, options);
      }
      return this.handleLiveRun(categorizedFiles, options);
    }

    // Use FileOrganizer for live runs
    const results = await this.fileOrganizer.organize(
      options.baseDirectory,
      categorizedFiles,
      ConflictStrategy.RENAME,
      options.dryRun,
      undefined // No session ID for CategorizationService
    );

    // Convert FileOperationResult[] to the expected format
    return results.map(result => ({
      from: result.sourcePath,
      to: result.destinationPath || '',
      success: result.success,
      ...(result.error && { error: result.error }),
    }));
  }

  private handleDryRun(categorizedFiles: CategorizedFile[], options: { useSubcategories?: boolean; baseDirectory: string; }): { from: string; to: string; success: boolean; }[] {
    this.output.warn('DRY RUN - Would move the following files:');
    return categorizedFiles.map(file => {
      const targetPath = this.buildTargetPath(file, options);
      this.output.log(`${file.path} -> ${targetPath}`);
      return { from: file.path, to: targetPath, success: true };
    });
  }

  private async handleLiveRun(categorizedFiles: CategorizedFile[], options: { useSubcategories?: boolean; baseDirectory: string; }): Promise<{ from: string; to: string; success: boolean; error?: string }[]> {
    this.output.info('Moving files...');
    const fs = await import('fs/promises');
    const movePromises = categorizedFiles.map(file => this.moveSingleFile(file, options, fs));
    const results = await Promise.all(movePromises);
    this.output.success('File moving completed.');
    return results;
  }

  private async moveSingleFile(file: CategorizedFile, options: { useSubcategories?: boolean; baseDirectory: string; }, fs: typeof import('fs/promises')): Promise<{ from: string; to: string; success: boolean; error?: string }> {
    const targetPath = this.buildTargetPath(file, options);
    const targetDir = path.dirname(targetPath);

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.rename(file.path, targetPath);
      this.output.log(`✓ Moved: ${file.path} -> ${targetPath}`);
      return { from: file.path, to: targetPath, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.output.error(`✗ Failed to move ${file.path}: ${errorMessage}`);
      return { from: file.path, to: targetPath, success: false, error: errorMessage };
    }
  }

  private buildTargetPath(file: CategorizedFile, options: {
    useSubcategories?: boolean;
    baseDirectory: string;
  }): string {
    const parts = [options.baseDirectory, file.category];

    if (options.useSubcategories && file.subcategory) {
      parts.push(file.subcategory);
    }

    const fileName = getFileName(file.path);
    parts.push(fileName);

    return parts.join(path.sep);
  }
}