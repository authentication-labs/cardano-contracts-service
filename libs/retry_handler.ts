type RetryHandlerConfig = {
  maxAttempts: number;
  delayMs: number;
  errorMessageSubstring?: string;
};

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class RetryHandler {
  constructor(private config: RetryHandlerConfig) {}

  static Default() {
    return new RetryHandler({
      maxAttempts: 10,
      delayMs: 3000,
    });
  }

  async try<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (attempt < this.config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (
          this.config.errorMessageSubstring &&
          error instanceof Error &&
          !error.message.includes(this.config.errorMessageSubstring)
        ) {
          throw new Error(
            `Function failed with error: ${error}`,
          );
        }
        if (attempt >= this.config.maxAttempts) {
          throw new Error(
            `Function failed after ${this.config.maxAttempts} attempts: ${error}`,
          );
        }
        console.log(
          `Attempt ${attempt} failed. Retrying in ${this.config.delayMs} ms...`,
        );
        await sleep(this.config.delayMs);
      }
    }
    throw new Error("This line should never be reached");
  }
}
