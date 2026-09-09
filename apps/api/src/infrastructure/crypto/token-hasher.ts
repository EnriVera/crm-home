import { createHash, timingSafeEqual } from "node:crypto";
import type { TokenHasher } from "../../domain/ports/token-hasher";

export function createTokenHasher(): TokenHasher {
  return {
    hash(token: string): string {
      return createHash("sha256").update(token).digest("hex");
    },

    verify(token: string, hash: string): boolean {
      const expected = Buffer.from(hash, "hex");
      const actual = createHash("sha256").update(token).digest();

      if (expected.length !== actual.length) {
        return false;
      }

      return timingSafeEqual(expected, actual);
    },
  };
}
