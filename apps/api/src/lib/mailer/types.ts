export interface SendVerificationEmailOptions {
  to: string;
  name: string;
  token: string;
  verifyUrl: string;
}

export interface SendPasswordResetEmailOptions {
  to: string;
  name: string;
  token: string;
  resetUrl: string;
}

export interface Mailer {
  sendVerificationEmail(options: SendVerificationEmailOptions): Promise<void>;
  sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<void>;
}
