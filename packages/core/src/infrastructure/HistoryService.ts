import * as fs from 'fs/promises';
import * as path from 'path';
import logger from './Logger.js';

export interface FileOperation {
  /** Type of operation performed */
  type: 'move' | 'create_directory';
  /** Original file path (for move operations) */
  sourcePath?: string;
  /** Destination file path (for move operations) */
  destinationPath?: string;
  /** Directory path (for directory operations) */
  directoryPath?: string;
  /** Timestamp when operation was performed */
  timestamp: Date;
}

export interface OperationHistory {
  /** Unique ID for this batch of operations */
  sessionId: string;
  /** When this batch started */
  startTime: Date;
  /** When this batch ended */
  endTime?: Date;
  /** All operations in this batch */
  operations: FileOperation[];
  /** Whether this batch has been rolled back */
  rolledBack: boolean;
}

export interface IHistoryService {
  /**
   * Starts a new operation session
   */
  startSession(): string;

  /**
   * Records a file operation
   */
  recordOperation(sessionId: string, operation: FileOperation): void;

  /**
   * Ends the current session
   */
  endSession(sessionId: string): void;

  /**
   * Gets the history for a specific session
   */
  getHistory(sessionId: string): OperationHistory | null;

  /**
   * Gets all sessions
   */
  getAllSessions(): OperationHistory[];

  /**
   * Rolls back all operations in a session (in reverse order)
   */
  rollback(sessionId: string): Promise<RollbackResult>;

  /**
   * Saves history to disk
   */
  save(): Promise<void>;

  /**
   * Loads history from disk
   */
  load(): Promise<void>;
}

export interface RollbackResult {
  success: boolean;
  operationsReverted: number;
  errors: Array<{ operation: FileOperation; error: string }>;
}

export class HistoryService implements IHistoryService {
  private sessions: Map<string, OperationHistory> = new Map();
  private historyFilePath: string;

  constructor(historyDirectory: string = '.ai-file-sorter') {
    this.historyFilePath = path.join(historyDirectory, 'history.json');
  }

  startSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.sessions.set(sessionId, {
      sessionId,
      startTime: new Date(),
      operations: [],
      rolledBack: false,
    });

    logger.info('Started new operation session', { sessionId });
    return sessionId;
  }

  recordOperation(sessionId: string, operation: FileOperation): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      logger.warn('Attempted to record operation for unknown session', { sessionId });
      return;
    }

    session.operations.push(operation);
    logger.debug('Recorded operation', { sessionId, operation });
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      logger.warn('Attempted to end unknown session', { sessionId });
      return;
    }

    session.endTime = new Date();
    logger.info('Ended operation session', { 
      sessionId, 
      operationCount: session.operations.length 
    });
  }

  getHistory(sessionId: string): OperationHistory | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessions(): OperationHistory[] {
    return Array.from(this.sessions.values());
  }

  async rollback(sessionId: string): Promise<RollbackResult> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.rolledBack) {
      throw new Error(`Session already rolled back: ${sessionId}`);
    }

    logger.info('Starting rollback', { 
      sessionId, 
      operationCount: session.operations.length 
    });

    const result: RollbackResult = {
      success: true,
      operationsReverted: 0,
      errors: [],
    };

    // Process operations in reverse order
    const operations = [...session.operations].reverse();

    for (const operation of operations) {
      try {
        await this.revertOperation(operation);
        result.operationsReverted++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to revert operation', { operation, error: errorMessage });
        
        result.success = false;
        result.errors.push({
          operation,
          error: errorMessage,
        });
      }
    }

    session.rolledBack = true;
    
    logger.info('Rollback completed', { 
      sessionId, 
      success: result.success,
      reverted: result.operationsReverted,
      errors: result.errors.length 
    });

    return result;
  }

  private async revertOperation(operation: FileOperation): Promise<void> {
    switch (operation.type) {
      case 'move':
        if (!operation.sourcePath || !operation.destinationPath) {
          throw new Error('Invalid move operation: missing paths');
        }
        
        // Move file back to original location
        await fs.rename(operation.destinationPath, operation.sourcePath);
        logger.debug('Reverted move operation', { 
          from: operation.destinationPath,
          to: operation.sourcePath 
        });
        break;
      
      case 'create_directory':
        if (!operation.directoryPath) {
          throw new Error('Invalid directory operation: missing path');
        }
        
        // Try to remove directory if it's empty
        try {
          await fs.rmdir(operation.directoryPath);
          logger.debug('Removed created directory', { 
            path: operation.directoryPath 
          });
        } catch (error) {
          // Directory not empty or doesn't exist - that's okay
          logger.debug('Could not remove directory (may not be empty)', { 
            path: operation.directoryPath 
          });
        }
        break;
      
      default:
        throw new Error(`Unknown operation type: ${(operation as FileOperation).type}`);
    }
  }

  async save(): Promise<void> {
    const historyDir = path.dirname(this.historyFilePath);
    await fs.mkdir(historyDir, { recursive: true });

    const data = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      sessions: Array.from(this.sessions.values()),
    };

    await fs.writeFile(
      this.historyFilePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    logger.info('History saved to disk', { 
      path: this.historyFilePath,
      sessionCount: this.sessions.size 
    });
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.historyFilePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.version !== '1.0') {
        logger.warn('Unknown history file version', { version: data.version });
        return;
      }

      this.sessions.clear();
      
      for (const session of data.sessions) {
        // Convert date strings back to Date objects
        session.startTime = new Date(session.startTime);
        if (session.endTime) {
          session.endTime = new Date(session.endTime);
        }
        
        for (const operation of session.operations) {
          operation.timestamp = new Date(operation.timestamp);
        }
        
        this.sessions.set(session.sessionId, session);
      }

      logger.info('History loaded from disk', { 
        sessionCount: this.sessions.size 
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('No history file found, starting fresh');
      } else {
        logger.error('Failed to load history', { error });
        throw error;
      }
    }
  }
}
