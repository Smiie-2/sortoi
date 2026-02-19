import logger from './Logger.js';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface UnknownErrorReport {
  /** Unique error ID */
  id: string;
  /** When the error occurred */
  timestamp: Date;
  /** File that caused the error */
  filePath: string;
  /** Error message */
  message: string;
  /** Error name (Error, TypeError, etc.) */
  errorType: string;
  /** Full stack trace */
  stack?: string;
  /** System metadata */
  system: {
    platform: string;
    nodeVersion: string;
    arch: string;
    totalMemory: string;
    freeMemory: string;
  };
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface ITelemetryService {
  /**
   * Reports an unknown error for investigation
   */
  reportUnknownError(
    error: unknown,
    filePath: string,
    context?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Gets all reported unknown errors
   */
  getUnknownErrors(): Promise<UnknownErrorReport[]>;

  /**
   * Clears old error reports (older than X days)
   */
  clearOldReports(daysToKeep: number): Promise<void>;
}

/**
 * 🚀 Telemetry service for tracking unknown errors in production
 * 
 * This service captures full context when an "unknown" error occurs:
 * - Complete stack trace
 * - System metadata (OS, Node version, memory)
 * - File that caused the error
 * - Timestamp and unique ID
 * 
 * Reports are saved to .ai-file-sorter/telemetry/ for later analysis
 */
export class TelemetryService implements ITelemetryService {
  private readonly telemetryDir: string;

  constructor(baseDir: string = '.ai-file-sorter') {
    this.telemetryDir = path.join(baseDir, 'telemetry');
  }

  async reportUnknownError(
    error: unknown,
    filePath: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Generate unique error ID
      const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Extract error details
      const errorDetails = this.extractErrorDetails(error);

      // Build report
      const report: UnknownErrorReport = {
        id: errorId,
        timestamp: new Date(),
        filePath,
        message: errorDetails.message,
        errorType: errorDetails.type,
        ...(errorDetails.stack && { stack: errorDetails.stack }),
        system: {
          platform: os.platform(),
          nodeVersion: process.version,
          arch: os.arch(),
          totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
          freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        },
        ...(context && { context }),
      };

      // Save to disk
      await this.saveReport(report);

      // Log for immediate debugging
      logger.error('🔍 UNKNOWN ERROR DETECTED - Full telemetry captured', {
        errorId,
        filePath,
        message: errorDetails.message,
        type: errorDetails.type,
        reportPath: this.getReportPath(errorId),
      });

      // Console output for development
      if (process.env.NODE_ENV === 'development') {
        console.error('\n🔍 DEBUG - Unknown error details:');
        console.error(JSON.stringify(report, null, 2));
      }
    } catch (telemetryError) {
      // Don't let telemetry errors crash the app
      logger.error('Failed to report unknown error', { 
        error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) 
      });
    }
  }

  async getUnknownErrors(): Promise<UnknownErrorReport[]> {
    try {
      await fs.mkdir(this.telemetryDir, { recursive: true });
      const files = await fs.readdir(this.telemetryDir);
      
      const reports: UnknownErrorReport[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.telemetryDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const report = JSON.parse(content) as UnknownErrorReport;
          
          // Convert date strings back to Date objects
          report.timestamp = new Date(report.timestamp);
          
          reports.push(report);
        }
      }
      
      // Sort by timestamp (newest first)
      return reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error('Failed to read telemetry reports', { error });
      return [];
    }
  }

  async clearOldReports(daysToKeep: number = 30): Promise<void> {
    try {
      const reports = await this.getUnknownErrors();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;

      for (const report of reports) {
        if (report.timestamp < cutoffDate) {
          const reportPath = this.getReportPath(report.id);
          await fs.unlink(reportPath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info('Cleaned up old telemetry reports', { 
          deleted: deletedCount, 
          olderThan: `${daysToKeep} days` 
        });
      }
    } catch (error) {
      logger.error('Failed to clear old reports', { error });
    }
  }

  private extractErrorDetails(error: unknown): {
    message: string;
    type: string;
    stack?: string;
  } {
    if (error instanceof Error) {
      const result: { message: string; type: string; stack?: string } = {
        message: error.message,
        type: error.name || error.constructor.name,
      };
      if (error.stack) {
        result.stack = error.stack;
      }
      return result;
    }

    // Handle non-Error objects
    if (typeof error === 'object' && error !== null) {
      return {
        message: JSON.stringify(error),
        type: 'UnknownObject',
      };
    }

    return {
      message: String(error),
      type: 'Primitive',
    };
  }

  private getReportPath(errorId: string): string {
    return path.join(this.telemetryDir, `${errorId}.json`);
  }

  private async saveReport(report: UnknownErrorReport): Promise<void> {
    await fs.mkdir(this.telemetryDir, { recursive: true });
    
    const reportPath = this.getReportPath(report.id);
    await fs.writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    logger.debug('Telemetry report saved', { 
      errorId: report.id, 
      path: reportPath 
    });
  }
}
