import ora, { Ora } from 'ora';

/**
 * Spinner utility for long-running operations
 */
export class Spinner {
  private spinner: Ora | null = null;
  private jsonMode: boolean;

  constructor(jsonMode = false) {
    this.jsonMode = jsonMode;
  }

  /**
   * Start spinner with message
   */
  start(message: string): void {
    if (this.jsonMode) return;
    this.spinner = ora(message).start();
  }

  /**
   * Update spinner message
   */
  update(message: string): void {
    if (this.jsonMode) return;
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Mark spinner as successful and stop
   */
  succeed(message?: string): void {
    if (this.jsonMode) return;
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  /**
   * Mark spinner as failed and stop
   */
  fail(message?: string): void {
    if (this.jsonMode) return;
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  /**
   * Mark spinner as warning and stop
   */
  warn(message?: string): void {
    if (this.jsonMode) return;
    if (this.spinner) {
      this.spinner.warn(message);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner without marking
   */
  stop(): void {
    if (this.jsonMode) return;
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Set JSON mode
   */
  setJsonMode(jsonMode: boolean): void {
    this.jsonMode = jsonMode;
    if (jsonMode && this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}
