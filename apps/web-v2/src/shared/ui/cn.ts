import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class merge utility used by every shadcn-vue-style component wrapper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
