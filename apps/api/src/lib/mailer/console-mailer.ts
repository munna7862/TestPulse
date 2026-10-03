import type { Mailer, SendPasswordResetEmailOptions, SendVerificationEmailOptions } from "./types";

export interface ConsoleMailerOptions {
  /**
   * Print links and tokens (local development only). In production the console ends up in hosted logs,
   * so tokens are withheld (AGENTS.md: never log secrets).
   */
  revealSecrets?: boolean;
}

/** Development mailer: writes messages to stdout instead of sending them. */
export class ConsoleMailer implements Mailer {
  private readonly revealSecrets: boolean;

  constructor({ revealSecrets = true }: ConsoleMailerOptions = {}) {
    this.revealSecrets = revealSecrets;
  }

  async sendVerificationEmail(options: SendVerificationEmailOptions): Promise<void> {
    const detail = this.revealSecrets
      ? `
Verification URL: ${options.verifyUrl}
Token: ${options.token}`
      : " (link withheld: no mail transport is configured in this environment)";
    console.info(`[Mailer:Verification] To: ${options.to} (${options.name})${detail}`);
  }

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<void> {
    const detail = this.revealSecrets
      ? `
Reset URL: ${options.resetUrl}
Token: ${options.token}`
      : " (link withheld: no mail transport is configured in this environment)";
    console.info(`[Mailer:PasswordReset] To: ${options.to} (${options.name})${detail}`);
  }
}
