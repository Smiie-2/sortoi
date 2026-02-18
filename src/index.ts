#!/usr/bin/env node
import { setupCLI } from './app/cli.js';
import { runInteractiveMode, showSummary, askYesNo } from './app/interactive.js';
import { FileScanner } from './infrastructure/FileScanner.js';
import { GeminiClient } from './infrastructure/GeminiClient.js';
import { CategorizationService } from './core/CategorizationService.js';
import { ConfigurationService } from './core/ConfigurationService.js';
import logger, { configureLogger } from './infrastructure/Logger.js';
import chalk from 'chalk';
import { SortoiError } from './core/errors.js';
import { ConsoleOutput } from './infrastructure/ConsoleOutput.js';
import { ProgressBar } from './infrastructure/ProgressBar.js';
import { MetricsCollector } from './infrastructure/MetricsCollector.js';
import { TelemetryService } from './infrastructure/TelemetryService.js';
import { HistoryService } from './infrastructure/HistoryService.js';
import { ConflictResolver } from './infrastructure/ConflictResolver.js';
import { FileOrganizer } from './infrastructure/FileOrganizer.js';
import { ConflictStrategy } from './common/constants.js';
import type { IDatabaseService } from './core/types.js';

// 🔒 SECURITY: Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  console.error(chalk.red('Fatal error: Unhandled promise rejection'));
  process.exit(1);
});


async function runInteractiveMain() {
  logger.info('Starting Sortoi in interactive mode');

  try {
    const configService = new ConfigurationService();
    const apiKey = await configService.getApiKey(true);

    const options = await runInteractiveMode();
    logger.info('User selected options', {
      options: { ...options, dbPath: options.dbPath ? '***' : undefined }
    });

    if (options.json) {
      throw new SortoiError('INTERACTIVE_JSON_UNSUPPORTED');
    }

    const fileScanner = new FileScanner();
    const llmClient = new GeminiClient(apiKey);
    const output = new ConsoleOutput();
    const progress = new ProgressBar();
    const metricsCollector = new MetricsCollector();
    const telemetryService = new TelemetryService();
    const historyService = new HistoryService();
    const conflictResolver = new ConflictResolver();
    const fileOrganizer = new FileOrganizer(conflictResolver, historyService);
    let databaseService: IDatabaseService | undefined = undefined;

    if (options.dbPath) {
      try {
        const { SQLiteDatabaseService } = await import('./infrastructure/SQLiteDatabaseService.js');
        databaseService = new SQLiteDatabaseService(options.dbPath);
        logger.info('Database service initialized', { dbPath: options.dbPath });
      } catch (error) {
        const errorMsg = 'Database not available, running without cache';
        logger.warn(errorMsg, { error: error instanceof Error ? error.message : String(error) });
        console.warn(`${errorMsg}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const categorizationService = new CategorizationService(fileScanner, llmClient, output, progress, fileOrganizer, databaseService, metricsCollector, telemetryService);

    logger.info('Scanning directory', { directory: options.directory });
    console.log(chalk.blue(`🔍 Scanning: ${options.directory}`));
    const files = await fileScanner.scan(options.directory);
    logger.info('Directory scan completed', { fileCount: files.length });

    console.log(chalk.bold(`📄 Found ${files.length} files to organize`));

    metricsCollector.startOperation();
    await historyService.load();
    const sessionId = historyService.startSession();

    logger.info('Starting AI categorization process');
    console.log(chalk.blue('\n🧠 Analyzing files with AI...'));
    const categorizedFiles = await categorizationService.categorizeDirectory(options.directory, {
      categorizationOptions: options.categorizationOptions
    });
    logger.info('Categorization completed', { categorizedCount: categorizedFiles.length });

    console.log(chalk.bold.magenta('\n🎯 Categorization Results:'));
    categorizedFiles.forEach((file, index) => {
      const categoryPath = file.subcategory ? `${file.category}/${file.subcategory}` : file.category;
      console.log(`  ${index + 1}. ${file.path.split('\\').pop()} → ${chalk.cyan(categoryPath)}`);
    });

    await showSummary(options, files.length);

    logger.info('Starting file organization', { dryRun: options.dryRun });

    if (!options.dryRun) {
      console.log(chalk.blue('\n📂 Organizing files...'));
      const results = await fileOrganizer.organize(
        options.directory,
        categorizedFiles,
        ConflictStrategy.RENAME,
        false,
        sessionId
      );

      historyService.endSession(sessionId);
      await historyService.save();

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const skipped = results.filter(r => r.skipped).length;

      output.success(`✓ Moved: ${successful} files`);
      if (failed > 0) output.error(`✗ Failed: ${failed} files`);
      if (skipped > 0) output.warn(`⏭  Skipped: ${skipped} files (already exist)`);
    } else {
      console.log(chalk.yellow('\n🛡️  Preview — proposed file moves:'));
      categorizedFiles.forEach((file, index) => {
        const fileName = file.path.split('\\').pop() || file.path.split('/').pop() || file.path;
        const targetFolder = file.subcategory ? `${file.category}/${file.subcategory}` : file.category;
        console.log(`  ${index + 1}. ${chalk.white(fileName)} → ${chalk.cyan(targetFolder + '/' + fileName)}`);
      });

      const applyNow = await askYesNo('\n🚀 Apply these changes now?', false);
      if (applyNow) {
        console.log(chalk.blue('\n📂 Organizing files...'));
        const results = await fileOrganizer.organize(
          options.directory,
          categorizedFiles,
          ConflictStrategy.RENAME,
          false,
          sessionId
        );

        historyService.endSession(sessionId);
        await historyService.save();

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const skipped = results.filter(r => r.skipped).length;

        output.success(`✓ Moved: ${successful} files`);
        if (failed > 0) output.error(`✗ Failed: ${failed} files`);
        if (skipped > 0) output.warn(`⏭  Skipped: ${skipped} files (already exist)`);

        options.dryRun = false; // Mark as applied for the completion message
      }
    }

    metricsCollector.endOperation();
    metricsCollector.printSummary();

    logger.info('Process completed successfully');
    if (options.dryRun) {
      console.log(chalk.bold.yellow('\n🛡️  Preview complete. No files were moved.'));
    } else {
      console.log(chalk.bold.green('\n🎉 Organization complete! Your files are now perfectly sorted.'));
    }

  } catch (error) {
    throw new SortoiError('UNEXPECTED_ERROR', error);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Check if interactive mode is requested
  if (args.includes('--interactive') || args.includes('-i') || args.length === 0) {
    await runInteractiveMain();
    return;
  }

  // Traditional CLI mode
  // @ts-ignore
  const program = setupCLI();
  const options = program.opts();

  if (options.verbose) {
    configureLogger('debug');
  }

  // Custom logger that respects --json flag
  const log = (...args: any[]) => {
    if (!options.json) {
      console.log(...args);
    }
  };

  const [directory] = program.args;

  if (!directory) {
    throw new SortoiError('DIRECTORY_NOT_PROVIDED');
  }

  const configService = new ConfigurationService();
  const apiKey = await configService.getApiKey(options.interactive);
  logger.info('API Key validated successfully');

  const fileScanner = new FileScanner();
  const llmClient = new GeminiClient(apiKey);
  const output = new ConsoleOutput();
  const progress = new ProgressBar();
  const metricsCollector = new MetricsCollector();
  const telemetryService = new TelemetryService();
  const historyService = new HistoryService();
  const conflictResolver = new ConflictResolver();
  const fileOrganizer = new FileOrganizer(conflictResolver, historyService);
  let databaseService: IDatabaseService | undefined = undefined;

  if (options.db) {
    try {
      const { SQLiteDatabaseService } = await import('./infrastructure/SQLiteDatabaseService.js');
      databaseService = new SQLiteDatabaseService(options.db);
    } catch (error) {
      console.warn('Database not available, running without cache:', error instanceof Error ? error.message : String(error));
    }
  }

  const categorizationService = new CategorizationService(fileScanner, llmClient, output, progress, fileOrganizer, databaseService, metricsCollector, telemetryService);

  // In JSON mode, we skip the interactive parts and go straight to business
  if (options.json) {
    metricsCollector.startOperation();
    await historyService.load();
    const sessionId = historyService.startSession();

    const categorizedFiles = await categorizationService.categorizeDirectory(directory, {
      silent: true,
      categorizationOptions: {
        model: options.model,
        language: options.language,
        context: options.context,
        preset: options.preset
      }
    });

    let results;
    if (!options.dryRun) {
      results = await fileOrganizer.organize(
        directory,
        categorizedFiles,
        ConflictStrategy.RENAME,
        false,
        sessionId
      );
      historyService.endSession(sessionId);
      await historyService.save();
    } else {
      results = await categorizationService.moveFiles(categorizedFiles, {
        dryRun: options.dryRun,
        useSubcategories: options.subcategories !== false,
        baseDirectory: directory,
      });
    }

    metricsCollector.endOperation();
    metricsCollector.printSummary();
    console.log(JSON.stringify({ success: true, options, results }, null, 2));
    return;
  }


  // Standard (non-JSON) execution flow
  metricsCollector.startOperation();
  await historyService.load();
  const sessionId = historyService.startSession();

  log(chalk.blue(`🔍 Scanning: ${directory}`));
  const categorizedFiles = await categorizationService.categorizeDirectory(directory, {
    categorizationOptions: {
      model: options.model,
      language: options.language,
      context: options.context,
      preset: options.preset
    }
  });

  log(chalk.bold(`📄 Found ${categorizedFiles.length} files to organize`));
  log(chalk.bold.magenta('\n🎯 Categorization Results:'));
  categorizedFiles.forEach((file, index) => {
    const categoryPath = file.subcategory ? `${file.category}/${file.subcategory}` : file.category;
    log(`  ${index + 1}. ${file.path.split('\\').pop()} → ${chalk.cyan(categoryPath)}`);
  });

  log(chalk.blue('\n📂 Organizing files...'));

  if (!options.dryRun) {
    const results = await fileOrganizer.organize(
      directory,
      categorizedFiles,
      ConflictStrategy.RENAME,
      false,
      sessionId
    );

    historyService.endSession(sessionId);
    await historyService.save();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = results.filter(r => r.skipped).length;

    output.success(`✓ Moved: ${successful} files`);
    if (failed > 0) output.error(`✗ Failed: ${failed} files`);
    if (skipped > 0) output.warn(`⏭  Skipped: ${skipped} files (already exist)`);
  } else {
    await categorizationService.moveFiles(categorizedFiles, {
      dryRun: options.dryRun,
      useSubcategories: options.subcategories !== false,
      baseDirectory: directory,
    });
  }

  metricsCollector.endOperation();
  metricsCollector.printSummary();

  if (options.dryRun) {
    log(chalk.bold.yellow('\n🛡️  Preview complete. No files were moved. Run without --dry-run to apply changes.'));
  } else {
    log(chalk.bold.green('\n🎉 Organization complete! Your files are now perfectly sorted.'));
  }
}

main().catch(error => {
  if (error instanceof SortoiError) {
    console.error(chalk.red(error.message));
  } else {
    const unexpectedError = new SortoiError('UNEXPECTED_ERROR', error);
    console.error(chalk.red(unexpectedError.message));
  }
  process.exit(1);
});