import chalk from 'chalk';
import type { IOutputPort } from '../core/types.js';

export class ConsoleOutput implements IOutputPort {
  info(message: string): void {
    console.log(chalk.blue(message));
  }

  success(message: string): void {
    console.log(chalk.green.bold(message));
  }

  error(message: string): void {
    console.error(chalk.red.bold(message));
  }

  warn(message: string): void {
    console.warn(chalk.yellow(message));
  }

  log(message: string): void {
    console.log(message);
  }
}