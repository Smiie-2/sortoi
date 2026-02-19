import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';

const logDirectory = 'logs';
const logFilePath = path.join(logDirectory, 'app.log');

// Ensure the log directory exists
async function ensureLogDirectory() {
  try {
    await fs.mkdir(logDirectory, { recursive: true });
  } catch (error) {
    console.error(`Failed to create log directory: ${error}`);
  }
}

ensureLogDirectory();

const logger = winston.createLogger({
  level: 'info', // Default level
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: logFilePath, level: 'debug' }), // Log everything to file
    new winston.transports.Console({
      level: 'info', // Default console level
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
      ),
    }),
  ],
});

export function configureLogger(level: string) {
  if (level === 'debug') {
    logger.transports.find(t => t instanceof winston.transports.Console)!.level = 'debug';
  }
}

export default logger;