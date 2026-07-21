import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Kiosk PINs are stored as "salt:sha256(salt:pin)" on the employee row.
export function hashPin(pin: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

export function makePinHash(pin: string): string {
  const salt = randomBytes(8).toString("hex");
  return `${salt}:${hashPin(pin, salt)}`;
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  return !!salt && !!hash && hashPin(pin, salt) === hash;
}
