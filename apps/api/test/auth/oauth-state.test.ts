import { describe, expect, it } from "vitest";
import { createStateCodec, OAUTH_STATE_TTL_SECONDS, safeEqual } from "../../src/modules/auth/oauth/state-cookie";

const SECRET = "unit-test-secret-at-least-32-characters-long";
const payload = {
  s: "s".repeat(32),
  v: "v".repeat(64),
  p: "github" as const,
  r: "/runs",
};

describe("[SC-AUTH-014] OAuth state cookie codec", () => {
  const codec = createStateCodec(SECRET);

  it("round-trips a freshly sealed payload", () => {
    const opened = codec.open(codec.seal(payload));
    expect(opened).toMatchObject(payload);
  });

  it("rejects a missing value", () => {
    expect(codec.open(undefined)).toBeNull();
    expect(codec.open("")).toBeNull();
  });

  it("rejects a payload edited after signing", () => {
    const [encoded, signature] = codec.seal(payload).split(".") as [string, string];
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")), p: "google" }),
    ).toString("base64url");
    expect(codec.open(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a tampered or truncated signature", () => {
    const sealed = codec.seal(payload);
    expect(codec.open(`${sealed.slice(0, -2)}AA`)).toBeNull();
    expect(codec.open(sealed.slice(0, -10))).toBeNull();
    expect(codec.open(`${sealed}.extra`)).toBeNull();
  });

  it("rejects a value signed with a different secret", () => {
    const other = createStateCodec("another-secret-at-least-32-characters-long");
    expect(codec.open(other.seal(payload))).toBeNull();
  });

  it("rejects an expired value and one dated far in the future", () => {
    const now = Date.now();
    const old = codec.seal(payload, now - (OAUTH_STATE_TTL_SECONDS + 5) * 1000);
    expect(codec.open(old, now)).toBeNull();
    const fresh = codec.seal(payload, now - (OAUTH_STATE_TTL_SECONDS - 5) * 1000);
    expect(codec.open(fresh, now)).not.toBeNull();
    const future = codec.seal(payload, now + 10 * 60 * 1000);
    expect(codec.open(future, now)).toBeNull();
  });

  it("rejects well-signed JSON that does not match the payload schema", () => {
    const wrong = codec.seal({ ...payload, p: "gitlab" as never });
    expect(codec.open(wrong)).toBeNull();
  });
});

describe("safeEqual", () => {
  it("compares in constant time and tolerates differing lengths", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
