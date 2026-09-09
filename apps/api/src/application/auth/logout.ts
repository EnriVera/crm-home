import type { Clock } from "../../domain/ports/clock";
import type { SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";

export interface LogoutInput {
  token: string;
}

export interface LogoutOutput {
  ok: true;
}

export interface LogoutDependencies {
  clock: Clock;
  sessionRepository: SessionRepository;
  tokenHasher: TokenHasher;
}

export class Logout {
  constructor(private readonly deps: LogoutDependencies) {}

  async execute(input: LogoutInput): Promise<LogoutOutput> {
    const tokenHash = this.deps.tokenHasher.hash(input.token);
    await this.deps.sessionRepository.softDelete(tokenHash);
    return { ok: true };
  }
}
