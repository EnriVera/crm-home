import { timingSafeEqual } from "node:crypto";
import type { SecureComparator } from "../../domain/ports/secure-comparator";

export function createSecureComparator(): SecureComparator {
  return {
    areEqual(a: string, b: string): boolean {
      const bufferA = Buffer.from(a, "utf8");
      const bufferB = Buffer.from(b, "utf8");

      if (bufferA.length !== bufferB.length) {
        return false;
      }

      return timingSafeEqual(bufferA, bufferB);
    },
  };
}
