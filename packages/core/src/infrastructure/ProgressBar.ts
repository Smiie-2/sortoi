import cliProgress from 'cli-progress';
import type { IProgressReporter } from '../core/types.js';

export class ProgressBar implements IProgressReporter {
  private bar: cliProgress.SingleBar | null = null;

  start(total: number, startValue: number): void {
    this.bar = new cliProgress.SingleBar({
      format: 'Progress [{bar}] {percentage}% | {value}/{total} files | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    }, cliProgress.Presets.shades_classic);
    this.bar.start(total, startValue);
  }

  update(current: number, payload?: object): void {
    this.bar?.update(current, payload);
  }

  increment(payload?: object): void {
    this.bar?.increment(1, payload);
  }

  stop(): void {
    this.bar?.stop();
  }
}