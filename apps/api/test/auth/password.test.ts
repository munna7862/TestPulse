import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/modules/auth/password";

describe("Password hashing (argon2id)", () => {
  it("hashes password with argon2id algorithm", async () => {
    const plain = "SuperSecretPassword123!";
    const hash = await hashPassword(plain);

    expect(hash).toContain("$argon2id$");
    expect(hash).toContain("m=19456"); // 19 MiB memory cost
    expect(hash).toContain("t=2"); // 2 iterations
    expect(hash).toContain("p=1"); // parallelism 1

    const isValid = await verifyPassword(hash, plain);
    expect(isValid).toBe(true);
  });

  it("fails verification for incorrect password", async () => {
    const plain = "SuperSecretPassword123!";
    const hash = await hashPassword(plain);

    const isValid = await verifyPassword(hash, "WrongPassword123!");
    expect(isValid).toBe(false);
  });

  it("handles invalid hash strings gracefully without throwing", async () => {
    const isValid = await verifyPassword("not-a-valid-argon2-hash", "password");
    expect(isValid).toBe(false);
  });
});
