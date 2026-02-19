#!/usr/bin/env node
import { Command } from 'commander';
import { HistoryService } from '../infrastructure/HistoryService.js';
import chalk from 'chalk';

const program = new Command();
const historyService = new HistoryService();

program
  .name('ai-file-sorter-history')
  .description('Manage file organization history and rollbacks')
  .version('1.0.0');

program
  .command('list')
  .description('List all operation sessions')
  .action(async () => {
    await historyService.load();
    const sessions = historyService.getAllSessions();

    if (sessions.length === 0) {
      console.log(chalk.yellow('No operation history found.'));
      return;
    }

    console.log(chalk.bold('\n📜 Operation History\n'));

    for (const session of sessions) {
      const duration = session.endTime 
        ? ((session.endTime.getTime() - session.startTime.getTime()) / 1000).toFixed(1) 
        : 'N/A';
      
      const status = session.rolledBack 
        ? chalk.red('ROLLED BACK') 
        : chalk.green('ACTIVE');

      console.log(`${chalk.bold('Session ID:')} ${session.sessionId}`);
      console.log(`  ${chalk.dim('Started:')} ${session.startTime.toLocaleString()}`);
      console.log(`  ${chalk.dim('Duration:')} ${duration}s`);
      console.log(`  ${chalk.dim('Operations:')} ${session.operations.length}`);
      console.log(`  ${chalk.dim('Status:')} ${status}`);
      console.log('');
    }
  });

program
  .command('show <sessionId>')
  .description('Show details of a specific session')
  .action(async (sessionId: string) => {
    await historyService.load();
    const session = historyService.getHistory(sessionId);

    if (!session) {
      console.log(chalk.red(`Session not found: ${sessionId}`));
      return;
    }

    console.log(chalk.bold(`\n📋 Session: ${sessionId}\n`));
    console.log(`${chalk.dim('Started:')} ${session.startTime.toLocaleString()}`);
    
    if (session.endTime) {
      console.log(`${chalk.dim('Ended:')} ${session.endTime.toLocaleString()}`);
    }
    
    console.log(`${chalk.dim('Status:')} ${session.rolledBack ? chalk.red('ROLLED BACK') : chalk.green('ACTIVE')}`);
    console.log(`\n${chalk.bold('Operations:')}\n`);

    for (let i = 0; i < session.operations.length; i++) {
      const op = session.operations[i];
      if (!op) continue;
      
      console.log(`  ${i + 1}. ${chalk.cyan(op.type.toUpperCase())}`);
      
      if (op.type === 'move') {
        console.log(`     ${chalk.dim('From:')} ${op.sourcePath}`);
        console.log(`     ${chalk.dim('To:')}   ${op.destinationPath}`);
      } else if (op.type === 'create_directory') {
        console.log(`     ${chalk.dim('Path:')} ${op.directoryPath}`);
      }
      
      console.log(`     ${chalk.dim('Time:')} ${op.timestamp.toLocaleString()}`);
      console.log('');
    }
  });

program
  .command('rollback <sessionId>')
  .description('Rollback all operations in a session')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (sessionId: string, options: { yes?: boolean }) => {
    await historyService.load();
    const session = historyService.getHistory(sessionId);

    if (!session) {
      console.log(chalk.red(`Session not found: ${sessionId}`));
      return;
    }

    if (session.rolledBack) {
      console.log(chalk.yellow(`Session ${sessionId} has already been rolled back.`));
      return;
    }

    console.log(chalk.bold(`\n⚠️  Rollback Session: ${sessionId}\n`));
    console.log(`This will revert ${chalk.bold(String(session.operations.length))} operations:`);
    console.log(`  - ${session.operations.filter(op => op.type === 'move').length} file moves`);
    console.log(`  - ${session.operations.filter(op => op.type === 'create_directory').length} directory creations`);
    console.log('');

    if (!options.yes) {
      const { default: inquirer } = await import('inquirer');
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to rollback this session?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Rollback cancelled.'));
        return;
      }
    }

    console.log(chalk.blue('\n⏳ Rolling back operations...\n'));

    const result = await historyService.rollback(sessionId);

    if (result.success) {
      console.log(chalk.green(`\n✓ Successfully rolled back ${result.operationsReverted} operations!`));
    } else {
      console.log(chalk.yellow(`\n⚠️  Rollback completed with ${result.errors.length} errors:`));
      
      for (const error of result.errors) {
        console.log(chalk.red(`  ✗ ${error.error}`));
      }
      
      console.log(chalk.green(`\n✓ Reverted ${result.operationsReverted} operations`));
    }

    await historyService.save();
  });

program
  .command('clear')
  .description('Clear all operation history')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options: { yes?: boolean }) => {
    await historyService.load();
    const sessions = historyService.getAllSessions();

    if (sessions.length === 0) {
      console.log(chalk.yellow('No history to clear.'));
      return;
    }

    if (!options.yes) {
      const { default: inquirer } = await import('inquirer');
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `This will delete ${sessions.length} session(s) from history. Continue?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Clear cancelled.'));
        return;
      }
    }

    // Create a new empty history service and save it
    const newHistoryService = new HistoryService();
    await newHistoryService.save();

    console.log(chalk.green('✓ History cleared.'));
  });

program.parse();
