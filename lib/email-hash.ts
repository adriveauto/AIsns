import "server-only";
import { createHash } from "node:crypto";

export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
