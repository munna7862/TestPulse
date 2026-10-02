import type { Mailer, SendPasswordResetEmailOptions, SendVerificationEmailOptions } from "./types";

export interface SentEmail {
  type: "verification" | "password_reset";
  to: string;
  name: string;
  token: string;
  url: string;
  sentAt: Date;
}

export class TestMailer implements Mailer {
  private sent: SentEmail[] = [];

  async sendVerificationEmail(options: SendVerificationEmailOptions): Promise<void> {
    this.sent.push({
      type: "verification",
      to: options.to,
      name: options.name,
      token: options.token,
      url: options.verifyUrl,
      sentAt: new Date(),
    });
  }

  async sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<void> {
    this.sent.push({
      type: "password_reset",
      to: options.to,
      name: options.name,
      token: options.token,
      url: options.resetUrl,
      sentAt: new Date(),
    });
  }

  getSentEmails(): readonly SentEmail[] {
    return this.sent;
  }

  getLastEmail(): SentEmail | undefined {
    return this.sent[this.sent.length - 1];
  }

  findEmailsTo(email: string): SentEmail[] {
    return this.sent.filter((item) => item.to.toLowerCase() === email.toLowerCase());
  }

  clear(): void {
    this.sent = [];
  }
}
