import * as dotenv from 'dotenv';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import logger from '../infrastructure/Logger.js';
import { SortoiError } from './errors.js';

// 🔒 SECURITY: API key validation - flexible length for different providers
const API_KEY_REGEX = /^[A-Za-z0-9_-]{20,100}$/;

export class ConfigurationService {
  private readonly globalConfigDir: string;
  private readonly globalEnvPath: string;

  constructor() {
    const userHomeDir = os.homedir();
    this.globalConfigDir = path.join(userHomeDir, '.sortoi');
    this.globalEnvPath = path.join(this.globalConfigDir, '.env');
  }

  /**
   * Validates API key format
   * @param apiKey - The API key to validate
   * @returns True if valid, false otherwise
   */
  private validateApiKey(apiKey: string): boolean {
    // Basic validation: not empty and reasonable length
    if (!apiKey || apiKey.length < 20 || apiKey.length > 100) {
      return false;
    }
    
    // Check for valid characters (alphanumeric, dash, underscore)
    if (!API_KEY_REGEX.test(apiKey)) {
      logger.warn('API key contains invalid characters');
      return false;
    }
    
    return true;
  }

  /**
   * Loads API key from development .env file
   * @returns The API key
   * @throws Error if key is missing or invalid
   */
  private async loadFromDevelopmentEnv(): Promise<string> {
    dotenv.config();
    
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY in .env file for development.');
    }
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // In development, show a warning but don't fail if format is unusual
    if (!this.validateApiKey(apiKey)) {
      logger.warn('API key format is unusual but will be used anyway (development mode)');
    }
    
    logger.info('API Key loaded from local .env file (development mode)');
    return apiKey;
  }

  /**
   * Loads API key from global config (~/.sortoi/.env)
   * @returns The API key or null if not found
   */
  private async loadFromGlobalConfig(): Promise<string | null> {
    if (!fs.existsSync(this.globalEnvPath)) {
      return null;
    }

    const globalConfig = dotenv.parse(fs.readFileSync(this.globalEnvPath));
    const apiKey = globalConfig.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      return null;
    }

    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format in global config');
    }
    
    logger.info(`API Key loaded from global config: ${this.globalEnvPath}`);
    return apiKey;
  }

  /**
   * Prompts user for API key interactively
   * @returns The API key entered by user
   */
  private async promptForApiKey(): Promise<string> {
    console.log(chalk.yellow('🔑 Google Generative AI API Key not found.'));
    
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Please enter your API key:',
        mask: '*',
        validate: (input: string) => {
          if (!input) return 'API key is required';
          if (!this.validateApiKey(input)) {
            return 'Invalid API key format (expected 20-100 alphanumeric characters)';
          }
          return true;
        },
      },
    ]);

    return answers.apiKey;
  }

  /**
   * Saves API key to global config with secure permissions
   * @param apiKey - The API key to save
   */
  private async saveApiKey(apiKey: string): Promise<void> {
    const saveKey = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: `Do you want to save the API key to ${this.globalEnvPath} for future use?`,
        default: true,
      },
    ]);

    if (!saveKey.save) {
      return;
    }

    await fsPromises.mkdir(this.globalConfigDir, { recursive: true });
    
    await fsPromises.writeFile(
      this.globalEnvPath,
      `GOOGLE_GENERATIVE_AI_API_KEY=${apiKey}`,
      { mode: 0o600 }
    );
    
    // Verify permissions
    const stats = await fsPromises.stat(this.globalEnvPath);
    const permissions = (stats.mode & parseInt('777', 8)).toString(8);
    
    if (permissions !== '600') {
      logger.warn(`Warning: File permissions are ${permissions}, expected 600`);
      await fsPromises.chmod(this.globalEnvPath, 0o600);
    }
    
    logger.info(`API Key saved securely to ${this.globalEnvPath}`);
  }

  /**
   * Gets API key from various sources (dev env, global config, or user prompt)
   * @param isInteractive - Whether the application is running in interactive mode
   * @returns The API key
   * @throws Error if key cannot be obtained
   */
  public async getApiKey(isInteractive: boolean = false): Promise<string> {
    // Development mode: load from local .env
    if (process.env.NODE_ENV === 'development') {
      return await this.loadFromDevelopmentEnv();
    }

    // Production mode: try global config first
    const globalApiKey = await this.loadFromGlobalConfig();
    if (globalApiKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = globalApiKey;
      return globalApiKey;
    }
    
    // If not interactive, we can't prompt user
    if (!isInteractive) {
      throw new SortoiError('API_KEY_NOT_FOUND');
    }

    // Interactive mode: prompt user
    const apiKey = await this.promptForApiKey();
    await this.saveApiKey(apiKey);
    
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    return apiKey;
  }
}
