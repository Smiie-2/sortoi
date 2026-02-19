import logger from './Logger.js';

export interface OperationMetrics {
  /** Total files processed */
  totalFiles: number;
  /** Files successfully categorized */
  successCount: number;
  /** Files that failed categorization */
  failureCount: number;
  /** Files retrieved from cache */
  cacheHits: number;
  /** Files categorized via LLM */
  cacheMisses: number;
  /** Files skipped due to conflicts */
  skippedFiles: number;
  /** Start time of the operation */
  startTime: Date;
  /** End time of the operation */
  endTime?: Date;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Error breakdown by type */
  errorsByType: Record<string, number>;
  /** Average time per file (ms) */
  avgTimePerFile?: number;
  /** Cache hit rate (percentage) */
  cacheHitRate?: number;
}

export interface IMetricsCollector {
  /**
   * Starts tracking a new operation
   */
  startOperation(): void;

  /**
   * Records a successful categorization
   */
  recordSuccess(fromCache: boolean): void;

  /**
   * Records a failed categorization
   */
  recordFailure(errorType: string): void;

  /**
   * Records a skipped file
   */
  recordSkip(): void;

  /**
   * Ends the current operation and calculates final metrics
   */
  endOperation(): void;

  /**
   * Gets the current metrics
   */
  getMetrics(): OperationMetrics;

  /**
   * Resets all metrics
   */
  reset(): void;

  /**
   * Prints a formatted summary of metrics
   */
  printSummary(): void;
}

export class MetricsCollector implements IMetricsCollector {
  private metrics: OperationMetrics = this.createEmptyMetrics();

  private createEmptyMetrics(): OperationMetrics {
    return {
      totalFiles: 0,
      successCount: 0,
      failureCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      skippedFiles: 0,
      startTime: new Date(),
      errorsByType: {},
    };
  }

  startOperation(): void {
    this.metrics.startTime = new Date();
    logger.info('Started metrics collection');
  }

  recordSuccess(fromCache: boolean): void {
    this.metrics.totalFiles++;
    this.metrics.successCount++;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  recordFailure(errorType: string): void {
    this.metrics.totalFiles++;
    this.metrics.failureCount++;
    
    if (!this.metrics.errorsByType[errorType]) {
      this.metrics.errorsByType[errorType] = 0;
    }
    this.metrics.errorsByType[errorType]++;
  }

  recordSkip(): void {
    this.metrics.skippedFiles++;
  }

  endOperation(): void {
    this.metrics.endTime = new Date();
    this.metrics.durationMs = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
    
    if (this.metrics.totalFiles > 0) {
      this.metrics.avgTimePerFile = this.metrics.durationMs / this.metrics.totalFiles;
    }
    
    const totalCategorized = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCategorized > 0) {
      this.metrics.cacheHitRate = (this.metrics.cacheHits / totalCategorized) * 100;
    }
    
    logger.info('Ended metrics collection', { metrics: this.metrics });
  }

  getMetrics(): OperationMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = this.createEmptyMetrics();
    logger.debug('Metrics reset');
  }

  printSummary(): void {
    const m = this.metrics;
    
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║              📊 OPERATION SUMMARY                    ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║ Total Files:           ${String(m.totalFiles).padStart(4)} files                  ║`);
    console.log(`║ ✓ Successful:          ${String(m.successCount).padStart(4)} files                  ║`);
    console.log(`║ ✗ Failed:              ${String(m.failureCount).padStart(4)} files                  ║`);
    console.log(`║ ⏭  Skipped:             ${String(m.skippedFiles).padStart(4)} files                  ║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║ 💾 Cache Hits:         ${String(m.cacheHits).padStart(4)} files                  ║`);
    console.log(`║ 🤖 LLM Calls:          ${String(m.cacheMisses).padStart(4)} files                  ║`);
    
    if (m.cacheHitRate !== undefined) {
      console.log(`║ 📈 Cache Hit Rate:     ${m.cacheHitRate.toFixed(1).padStart(5)}%                   ║`);
    }
    
    console.log('╠══════════════════════════════════════════════════════╣');
    
    if (m.durationMs !== undefined) {
      const seconds = (m.durationMs / 1000).toFixed(2);
      console.log(`║ ⏱  Duration:           ${String(seconds).padStart(6)} seconds              ║`);
    }
    
    if (m.avgTimePerFile !== undefined) {
      const avgMs = m.avgTimePerFile.toFixed(0);
      console.log(`║ ⚡ Avg per file:       ${String(avgMs).padStart(6)} ms                   ║`);
    }
    
    // Show error breakdown if there are errors
    if (m.failureCount > 0 && Object.keys(m.errorsByType).length > 0) {
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log('║ Error Breakdown:                                     ║');
      
      for (const [errorType, count] of Object.entries(m.errorsByType)) {
        const truncatedType = errorType.length > 25 
          ? errorType.substring(0, 22) + '...' 
          : errorType;
        const countStr = String(count).padStart(3);
        const label = truncatedType.padEnd(25);
        console.log(`║   ${label} ${countStr}                       ║`);
      }
    }
    
    console.log('╚══════════════════════════════════════════════════════╝\n');
  }
}

/**
 * Global singleton metrics collector
 */
export const globalMetrics = new MetricsCollector();
