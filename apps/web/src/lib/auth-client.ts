import {
  ApiFailureSchema,
  type ListOAuthAccountsResponse,
  ListOAuthAccountsResponseSchema,
  type OAuthProvider,
  type StartOAuthLinkResponse,
  StartOAuthLinkResponseSchema,
  type AuthMeResponse,
  type AuthUser,
  type ForgotPasswordBody,
  type ForgotPasswordResponse,
  type LoginBody,
  type LoginResponse,
  type LogoutResponse,
  type RegisterBody,
  type RegisterResponse,
  type ResetPasswordBody,
  type ResetPasswordResponse,
  type VerifyEmailBody,
  type VerifyEmailResponse,
} from "@testpulse/shared";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include", // First-party session cookies
  });

  const json: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const failure = ApiFailureSchema.safeParse(json);
    if (failure.success) {
      throw new ApiError(
        failure.data.error.code,
        failure.data.error.message,
        response.status,
        failure.data.error.details,
      );
    }
    throw new ApiError("UNKNOWN_ERROR", "An unexpected error occurred.", response.status);
  }

  const payload = json as { data: T };
  return payload.data;
}

export const authClient = {
  async register(body: RegisterBody): Promise<RegisterResponse> {
    return request<RegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async verifyEmail(body: VerifyEmailBody): Promise<VerifyEmailResponse> {
    return request<VerifyEmailResponse>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    return request<{ message: string }>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async login(body: LoginBody): Promise<LoginResponse> {
    return request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async logout(): Promise<LogoutResponse> {
    return request<LogoutResponse>("/api/v1/auth/logout", {
      method: "POST",
    });
  },

  async forgotPassword(body: ForgotPasswordBody): Promise<ForgotPasswordResponse> {
    return request<ForgotPasswordResponse>("/api/v1/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async resetPassword(body: ResetPasswordBody): Promise<ResetPasswordResponse> {
    return request<ResetPasswordResponse>("/api/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** Linked sign-in providers for the signed-in user (profile settings). */
  async listOAuthAccounts(): Promise<ListOAuthAccountsResponse> {
    const data = await request<unknown>("/api/v1/me/oauth-accounts", { method: "GET" });
    return ListOAuthAccountsResponseSchema.parse(data);
  },

  /** Starts a settings-initiated link; the caller navigates the browser to `authorizationUrl`. */
  async startOAuthLink(provider: OAuthProvider): Promise<StartOAuthLinkResponse> {
    const data = await request<unknown>(`/api/v1/me/oauth-accounts/${provider}/link`, { method: "POST" });
    return StartOAuthLinkResponseSchema.parse(data);
  },

  async unlinkOAuthAccount(id: string): Promise<void> {
    await request<unknown>(`/api/v1/me/oauth-accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async getMe(): Promise<AuthUser> {
    const res = await request<AuthMeResponse>("/api/v1/auth/me", {
      method: "GET",
    });
    return res.user;
  },
};
