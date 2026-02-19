import * as fs from 'fs/promises';
import * as readline from 'readline';
import chalk from 'chalk';
import { PathValidator } from '../infrastructure/PathValidator.js';
import type { CategorizationOptions } from '../core/types.js';

// Helper functions for interactive input
export function askYesNo(question: string, defaultValue: boolean = true): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const defaultText = defaultValue ? '[Y/n]' : '[y/N]';
    rl.question(`${question} ${defaultText}: `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      if (normalized === '') {
        resolve(defaultValue);
      } else if (normalized === 'y' || normalized === 'yes') {
        resolve(true);
      } else if (normalized === 'n' || normalized === 'no') {
        resolve(false);
      } else {
        resolve(defaultValue);
      }
    });
  });
}

function askChoice(validChoices: string[], question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    function ask() {
      rl.question(question, (answer) => {
        const choice = answer.trim();
        if (validChoices.includes(choice)) {
          rl.close();
          resolve(choice);
        } else {
          console.log(`Invalid choice. Must be one of: ${validChoices.join(', ')}`);
          ask();
        }
      });
    }
    ask();
  });
}

function askInput(question: string, defaultValue: string = ''): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${question} `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

export interface InteractiveOptions {
  directory: string;
  dryRun: boolean;
  useSubcategories: boolean;
  dbPath?: string;
  json?: boolean;
  categorizationOptions: CategorizationOptions;
}

export async function runInteractiveMode(): Promise<InteractiveOptions> {
  console.log(chalk.bold.magenta('🚀 Welcome to Sortoi - AI-Powered File Organizer\n'));

  // Select directory
  const directory = await selectDirectory();

  // Confirm selection
  const confirmDir = await askYesNo(`Organize files in: ${chalk.cyan(directory)}?`, true);

  if (!confirmDir) {
    console.log(chalk.yellow('✨ Operation cancelled. Have a great day!'));
    process.exit(0);
  }

  // Select mode
  console.log(chalk.bold.blue('\n🎯 Choose organization mode:'));
  console.log(`1. ${chalk.yellow('🛡️  Preview Mode')} - See what would happen (safe)`);
  console.log(`2. ${chalk.green('⚡ Live Organization')} - Actually move files`);

  const modeChoice = await askChoice(['1', '2'], 'Select mode (1-2):');
  const dryRun = modeChoice === '1';

  // Additional options
  const useSubcategories = await askYesNo('Create subfolders for categories?', true);

  // New options
  console.log(chalk.bold.blue('\n🔧 Categorization Settings:'));

  // Language selection
  console.log(chalk.bold('\n🌐 Expected language in the files:'));
  console.log(`  1. ${chalk.cyan('English')}`);
  console.log(`  2. ${chalk.cyan('Swedish')}`);
  console.log(`  3. ${chalk.cyan('Auto-detect')}`);
  const langChoice = await askChoice(['1', '2', '3'], 'Select language (1-3):');
  const languageMap: Record<string, string> = { '1': 'English', '2': 'Swedish', '3': '' };
  const language = languageMap[langChoice];

  // Model selection
  console.log(chalk.bold('\n🤖 Select Gemini model:'));
  console.log(`  1. ${chalk.cyan('gemini-2.0-flash')} (fast, recommended)`);
  console.log(`  2. ${chalk.cyan('gemini-2.0-flash-lite')} (fastest, lightweight)`);
  console.log(`  3. ${chalk.cyan('gemini-2.5-flash')} (latest, smart)`);
  console.log(`  4. ${chalk.cyan('gemini-2.5-pro')} (most capable)`);
  const modelChoiceNum = await askChoice(['1', '2', '3', '4'], 'Select model (1-4):');
  const modelMap: Record<string, string> = {
    '1': 'gemini-2.0-flash',
    '2': 'gemini-2.0-flash-lite',
    '3': 'gemini-2.5-flash',
    '4': 'gemini-2.5-pro',
  };
  const modelChoice = modelMap[modelChoiceNum] || 'gemini-2.0-flash';

  // Context
  console.log(chalk.bold('\n💡 Context:'));
  console.log(chalk.dim('  Describe the files to help the AI sort better (e.g., "university coursework", "vacation photos").'));
  const context = await askInput('Context (press Enter to skip):');

  // Folder structure
  const usePreset = await askYesNo('\n📋 Do you want to provide a folder structure for the model to use?', false);
  let preset: string | undefined;
  if (usePreset) {
    console.log(chalk.yellow('Describe the folder structure (e.g., "Year/Subject/Type", "Client/Project/Deliverable"):'));
    preset = await askInput('Folder structure:');
  }

  const useDatabase = await askYesNo('Use smart caching for faster results?', false);

  let dbPath: string | undefined;
  if (useDatabase) {
    dbPath = await askInput('Database path (press Enter for default):', 'sortoi_cache.db');

    // 🔒 SECURITY: Sanitize database path too
    try {
      const pathValidator = new PathValidator();
      dbPath = pathValidator.sanitizeAndValidate(dbPath);
    } catch (error) {
      console.log(chalk.red(`❌ Invalid database path: ${error instanceof Error ? error.message : String(error)}`));
      console.log(chalk.yellow('Using default database path instead.'));
      dbPath = 'sortoi_cache.db';
    }
  }

  return {
    directory,
    dryRun,
    useSubcategories,
    ...(dbPath && { dbPath }),
    categorizationOptions: {
      model: modelChoice,
      ...(language && { language }),
      ...(context && { context }),
      ...(preset && { preset }),
    }
  };
}

async function selectDirectory(): Promise<string> {
  console.log(chalk.bold.blue('\n📂 Directory Selection:'));
  console.log('Enter the full path to the directory you want to organize.');
  console.log('Examples:');
  console.log('  • /home/user/Downloads');
  console.log('  • C:\\Users\\user\\Desktop\\messy-folder');
  console.log('  • ./relative/path/to/folder');

  const directoryPath = await askInput('Directory path:');

  if (!directoryPath.trim()) {
    console.log(chalk.red('❌ Directory path cannot be empty.'));
    return await selectDirectory();
  }

  // 🔒 SECURITY: Sanitize and validate path
  let sanitizedPath: string;
  try {
    const pathValidator = new PathValidator();
    sanitizedPath = pathValidator.sanitizeAndValidate(directoryPath);
  } catch (error) {
    console.log(chalk.red(`❌ Invalid path: ${error instanceof Error ? error.message : String(error)}`));
    console.log('Please enter a valid directory path.');
    return await selectDirectory();
  }

  // Validate that path exists and is a directory
  try {
    const stats = await fs.stat(sanitizedPath);
    if (!stats.isDirectory()) {
      console.log(chalk.red('❌ The specified path is not a directory.'));
      return await selectDirectory();
    }
  } catch (error) {
    console.log(chalk.red(`❌ Directory not found: ${sanitizedPath}`));
    console.log('Please check the path and try again.');
    return await selectDirectory();
  }

  return sanitizedPath;
}

export async function showSummary(options: InteractiveOptions, fileCount: number): Promise<void> {
  console.log(chalk.bold.magenta('\n✨ Ready to organize your files!'));
  console.log(`${chalk.bold('📂 Directory:')} ${chalk.cyan(options.directory)}`);
  console.log(`${chalk.bold('📄 Files found:')} ${fileCount}`);
  console.log(`${chalk.bold('🔧 Mode:')} ${options.dryRun ? chalk.yellow('Preview (safe)') : chalk.green('Live organization')}`);
  console.log(`${chalk.bold('📁 Subcategories:')} ${options.useSubcategories ? 'Yes' : 'No'}`);
  console.log(`${chalk.bold('🤖 Model:')} ${chalk.cyan(options.categorizationOptions.model || 'gemini-1.5-flash')}`);
  if (options.categorizationOptions.language) {
    console.log(`${chalk.bold('🌐 Language:')} ${chalk.cyan(options.categorizationOptions.language)}`);
  }
  if (options.categorizationOptions.context) {
    console.log(`${chalk.bold('💡 Context:')} ${chalk.cyan(options.categorizationOptions.context)}`);
  }
  if (options.categorizationOptions.preset) {
    console.log(`${chalk.bold('📋 Folder structure:')} ${chalk.cyan(options.categorizationOptions.preset)}`);
  }
  console.log(`${chalk.bold('💾 Smart cache:')} ${options.dbPath ? 'Enabled' : 'Disabled'}`);

  if (options.dryRun) {
    console.log(chalk.yellow('\n🛡️ Preview mode - No files will be moved'));
    return;
  }

  const proceed = await askYesNo('\n🚀 Ready to organize? This will move files.', true);

  if (!proceed) {
    console.log(chalk.yellow('✨ Operation cancelled. Your files are safe!'));
    process.exit(0);
  }
}