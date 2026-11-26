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

export interface SendInvitationEmailOptions {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  token: string;
  acceptUrl: string;
}

export interface Mailer {
  sendVerificationEmail(options: SendVerificationEmailOptions): Promise<void>;
  sendPasswordResetEmail(options: SendPasswordResetEmailOptions): Promise<void>;
  sendInvitationEmail(options: SendInvitationEmailOptions): Promise<void>;
}
