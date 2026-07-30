import { randomBytes, createHash } from "node:crypto";

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiry(): Date {
  return new Date(Date.now() + RESET_TOKEN_DURATION_MS);
}
