import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getFileHash } from './fileUtils.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('fileUtils - getFileHash', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fileutils-test-'));
  });

  afterAll(async () => {
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('📦 Small Files (< 100MB)', () => {
    it('should hash small text file consistently', async () => {
      const filePath = path.join(testDir, 'small.txt');
      await fs.writeFile(filePath, 'Hello World!', 'utf-8');

      const hash1 = await getFileHash(filePath);
      const hash2 = await getFileHash(filePath);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hashes for different content', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');

      await fs.writeFile(file1, 'Content A', 'utf-8');
      await fs.writeFile(file2, 'Content B', 'utf-8');

      const hash1 = await getFileHash(file1);
      const hash2 = await getFileHash(file2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for identical content', async () => {
      const file1 = path.join(testDir, 'identical1.txt');
      const file2 = path.join(testDir, 'identical2.txt');
      const content = 'Same content in both files';

      await fs.writeFile(file1, content, 'utf-8');
      await fs.writeFile(file2, content, 'utf-8');

      const hash1 = await getFileHash(file1);
      const hash2 = await getFileHash(file2);

      expect(hash1).toBe(hash2);
    });

    it('should detect single byte change', async () => {
      const filePath = path.join(testDir, 'sensitive.txt');
      
      await fs.writeFile(filePath, 'Original content', 'utf-8');
      const hash1 = await getFileHash(filePath);

      await fs.writeFile(filePath, 'Original Content', 'utf-8'); // Changed 'c' to 'C'
      const hash2 = await getFileHash(filePath);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty file', async () => {
      const filePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(filePath, '', 'utf-8');

      const hash = await getFileHash(filePath);
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(16);
    });

    it('should handle binary files', async () => {
      const filePath = path.join(testDir, 'binary.bin');
      const buffer = Buffer.from([0x00, 0xFF, 0x42, 0xAA, 0x55]);
      await fs.writeFile(filePath, buffer);

      const hash = await getFileHash(filePath);
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(16);
    });

    it('should handle files with special characters', async () => {
      const filePath = path.join(testDir, 'unicode.txt');
      await fs.writeFile(filePath, '你好世界 🌍 مرحبا', 'utf-8');

      const hash = await getFileHash(filePath);
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(16);
    });
  });

  describe('🐘 Large Files (> 100MB)', () => {
    it('should hash large file quickly (partial hash)', async () => {
      const filePath = path.join(testDir, 'large.bin');
      
      // Create a 150MB file
      const chunkSize = 1024 * 1024; // 1MB
      const chunks = 150; // 150MB total
      const chunk = Buffer.alloc(chunkSize, 0x42); // Fill with 'B'

      const stream = await fs.open(filePath, 'w');
      for (let i = 0; i < chunks; i++) {
        await stream.write(chunk);
      }
      await stream.close();

      const startTime = Date.now();
      const hash = await getFileHash(filePath);
      const duration = Date.now() - startTime;

      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(16);
      // Should be MUCH faster than hashing full 150MB
      // Typically < 100ms vs several seconds
      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('should detect changes in first 10MB of large file', async () => {
      const filePath = path.join(testDir, 'large-modified.bin');
      
      // Create a 150MB file
      const chunkSize = 1024 * 1024; // 1MB
      const chunks = 150;
      const chunk = Buffer.alloc(chunkSize, 0x42);

      const stream = await fs.open(filePath, 'w');
      for (let i = 0; i < chunks; i++) {
        await stream.write(chunk);
      }
      await stream.close();

      const hash1 = await getFileHash(filePath);

      // Modify first byte (within first 10MB)
      const stream2 = await fs.open(filePath, 'r+');
      await stream2.write(Buffer.from([0xFF]), 0, 1, 0);
      await stream2.close();

      const hash2 = await getFileHash(filePath);

      expect(hash1).not.toBe(hash2);
    });

    it('should NOT detect content changes after first 10MB (but WILL detect mtime)', async () => {
      const filePath = path.join(testDir, 'large-end-modified.bin');
      
      // Create a 150MB file
      const chunkSize = 1024 * 1024; // 1MB
      const chunks = 150;
      const chunk = Buffer.alloc(chunkSize, 0x42);

      const stream = await fs.open(filePath, 'w');
      for (let i = 0; i < chunks; i++) {
        await stream.write(chunk);
      }
      await stream.close();

      const hash1 = await getFileHash(filePath);

      // Modify byte at position 140MB (beyond first 10MB)
      const modifyPosition = 140 * 1024 * 1024;
      const stream2 = await fs.open(filePath, 'r+');
      await stream2.write(Buffer.from([0xFF]), 0, 1, modifyPosition);
      await stream2.close();

      const hash2 = await getFileHash(filePath);

      // Hash WILL be different because mtime changed (even though content change is outside first 10MB)
      // This is GOOD: it detects file modifications even if we don't hash the entire file
      expect(hash1).not.toBe(hash2);
    });

    it('should detect file size changes for large files', async () => {
      const filePath = path.join(testDir, 'large-size-change.bin');
      
      // Create a 150MB file
      const chunkSize = 1024 * 1024;
      const chunks = 150;
      const chunk = Buffer.alloc(chunkSize, 0x42);

      const stream = await fs.open(filePath, 'w');
      for (let i = 0; i < chunks; i++) {
        await stream.write(chunk);
      }
      await stream.close();

      const hash1 = await getFileHash(filePath);

      // Append more data (change file size)
      await fs.appendFile(filePath, Buffer.alloc(1024, 0xFF));

      const hash2 = await getFileHash(filePath);

      // Hash should be DIFFERENT because file size changed
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('⚡ Performance Characteristics', () => {
    it('should be fast for medium files (10MB)', async () => {
      const filePath = path.join(testDir, 'medium.bin');
      const size = 10 * 1024 * 1024; // 10MB
      const buffer = Buffer.alloc(size, 0x42);
      await fs.writeFile(filePath, buffer);

      const startTime = Date.now();
      const hash = await getFileHash(filePath);
      const duration = Date.now() - startTime;

      expect(hash).toBeTruthy();
      expect(duration).toBeLessThan(500); // Should be fast
    });

    it('should be consistent across multiple runs', async () => {
      const filePath = path.join(testDir, 'consistent.txt');
      await fs.writeFile(filePath, 'Test content for consistency', 'utf-8');

      const hashes = await Promise.all([
        getFileHash(filePath),
        getFileHash(filePath),
        getFileHash(filePath),
        getFileHash(filePath),
        getFileHash(filePath),
      ]);

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1); // All should be the same
    });
  });

  describe('🚨 Error Handling', () => {
    it('should reject for non-existent file', async () => {
      await expect(getFileHash('/non/existent/file.txt')).rejects.toThrow();
    });

    it('should reject for directory', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      await fs.mkdir(dirPath, { recursive: true });

      await expect(getFileHash(dirPath)).rejects.toThrow();
    });
  });

  describe('🔬 Edge Cases', () => {
    it('should handle file at exactly 100MB boundary', async () => {
      const filePath = path.join(testDir, 'exactly-100mb.bin');
      
      // Write in chunks to avoid memory issues
      const stream = await fs.open(filePath, 'w');
      const chunkSize = 1024 * 1024; // 1MB chunks
      const chunk = Buffer.alloc(chunkSize, 0x42);
      
      for (let i = 0; i < 100; i++) {
        await stream.write(chunk);
      }
      await stream.close();

      const hash = await getFileHash(filePath);
      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(16);
    });

    it('should handle file at 100MB + 1 byte (triggers large file logic)', async () => {
      const filePath = path.join(testDir, '100mb-plus-1.bin');
      
      const stream = await fs.open(filePath, 'w');
      const chunkSize = 1024 * 1024;
      const chunk = Buffer.alloc(chunkSize, 0x42);
      
      for (let i = 0; i < 100; i++) {
        await stream.write(chunk);
      }
      await stream.write(Buffer.from([0xFF])); // +1 byte
      await stream.close();

      const startTime = Date.now();
      const hash = await getFileHash(filePath);
      const duration = Date.now() - startTime;

      expect(hash).toBeTruthy();
      // Should use fast path (partial hash)
      expect(duration).toBeLessThan(500);
    });
  });
});
