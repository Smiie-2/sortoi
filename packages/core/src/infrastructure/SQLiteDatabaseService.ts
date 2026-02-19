import Database from 'better-sqlite3';
import type { IDatabaseService, CategorizedFile } from '../core/types.js';
import logger from './Logger.js';

export class SQLiteDatabaseService implements IDatabaseService {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categorizations (
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (file_path, file_hash)
      );
      CREATE INDEX IF NOT EXISTS idx_category ON categorizations(category);
    `);
    
    logger.debug('Database tables initialized');
  }

  async getCachedCategorization(filePath: string, hash: string): Promise<CategorizedFile | null> {
    if (!hash) {
      return null;
    }
    
    const stmt = this.db.prepare(`
      SELECT category, subcategory
      FROM categorizations
      WHERE file_path = ? AND file_hash = ?
    `);

    const row = stmt.get(filePath, hash) as { category: string; subcategory?: string } | undefined;

    if (!row) {
      return null;
    }

    const result: CategorizedFile = {
      path: filePath,
      hash,
      category: row.category,
    };
    if (row.subcategory) {
      result.subcategory = row.subcategory;
    }
    return result;
  }

  async setCachedCategorization(file: CategorizedFile): Promise<void> {
    if (!file.hash) {
      logger.debug('Skipping cache (no hash)', { path: file.path });
      return;
    }
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO categorizations (file_path, file_hash, category, subcategory)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(file.path, file.hash, file.category, file.subcategory || null);
  }

  close(): void {
    this.db.close();
  }
}