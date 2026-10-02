import { describe, expect, it } from "vitest";
import {
  ACCESS_COOKIE_NAME,
  generateRandomToken,
  hashRefreshToken,
  hashVerificationToken,
  REFRESH_COOKIE_NAME,
} from "../../src/modules/auth/tokens";

describe("Token and Cookie Helpers", () => {
  it("generates 32-byte cryptographically random hex tokens", () => {
    const token1 = generateRandomToken();
    const token2 = generateRandomToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it("hashes refresh tokens deterministically using HMAC-SHA256", () => {
    const token = "fixed-token-for-test-purposes-1234";
    const secret = "super-secret-key-for-refresh-tokens";

    const hash1 = hashRefreshToken(token, secret);
    const hash2 = hashRefreshToken(token, secret);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);

    const differentSecretHash = hashRefreshToken(token, "different-secret");
    expect(differentSecretHash).not.toBe(hash1);
  });

  it("hashes verification tokens with SHA-256", () => {
    const token = "verification-token-test-1234";
    const hash = hashVerificationToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashVerificationToken(token));
  });

  it("exports correct cookie name constants", () => {
    expect(ACCESS_COOKIE_NAME).toBe("tp_access");
    expect(REFRESH_COOKIE_NAME).toBe("tp_refresh");
  });
});
