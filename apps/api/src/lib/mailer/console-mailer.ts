import type { Mailer, SendPasswordResetEmailOptions, SendVerificationEmailOptions } from "./types";

export class ConsoleMailer implements Mailer {
  async sendVerificationEmail(options: SendVerificationEmailOptions): Promise<void> {
    // In development, log the link so the developer can click it directly.
    console.info(
      `[Mailer:Verification] To: ${options.to} (${options.name})\nVerification URL: ${options.verifyUrl}\nToken: ${options.token}`,
    );
  }

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<void> {
    console.info(
      `[Mailer:PasswordReset] To: ${options.to} (${options.name})\nReset URL: ${options.resetUrl}\nToken: ${options.token}`,
    );
  }
}
