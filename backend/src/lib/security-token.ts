import {
  createHash,
  randomBytes,
} from "node:crypto";

export interface SecurityToken {
  token: string;
  tokenHash: string;
}

export function generateSecurityToken(): SecurityToken {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashSecurityToken(token),
  };
}

export function hashSecurityToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function expirationDate(
  minutes: number,
): Date {
  return new Date(
    Date.now() + minutes * 60 * 1000,
  );
}