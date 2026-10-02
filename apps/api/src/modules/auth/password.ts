import * as argon2 from "argon2";

/**
 * ADR-005 Password Policy:
 * argon2id, memory >= 19 MiB (19,456 KiB), iterations >= 2, parallelism 1.
 */
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2, // 2 iterations
  parallelism: 1,
};

/**
 * Static dummy hash computed with identical parameters (argon2id, 19 MiB, 2 iterations).
 * Verified against when an email does not exist to eliminate timing disparity (ADR-005 §9, Threat Model T11).
 */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,p=1,t=2$oebvLd6SrHJvYRlhu9nVVg$xfnn8CAQDITN+dOLQ94rTj6tIj3HTeULiIaarildjAg";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
