import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return ["scrypt", SCRYPT_COST, SCRYPT_BLOCK_SIZE, SCRYPT_PARALLELIZATION, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export function verifyAdminPassword(password: string, storedHash: string) {
  const [algorithm, costValue, blockValue, parallelValue, salt, expected] = storedHash.split("$");
  const N = Number(costValue);
  const r = Number(blockValue);
  const p = Number(parallelValue);
  if (algorithm !== "scrypt" || !Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || !salt || !expected) return false;
  try {
    const actual = scryptSync(password, Buffer.from(salt, "base64url"), SCRYPT_KEY_LENGTH, { N, r, p, maxmem: 64 * 1024 * 1024 }).toString("base64url");
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}
