export interface TokenHasher {
  hash(token: string): string;
  verify(token: string, hash: string): boolean;
}
