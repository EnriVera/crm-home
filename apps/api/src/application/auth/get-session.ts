import type { Clock } from "../../domain/ports/clock";
import type { SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";
import type { UserRepository } from "../../domain/ports/user-repository";
import {
  SESSION_RENEWAL_THRESHOLD_MS,
  SESSION_TTL_MS,
} from "./constants";

export interface GetSessionInput {
  token: string;
}

export interface GetSessionOutput {
  user: {
    id: string;
    email: string;
    name: string;
  };
  renewed?: boolean;
}

export interface GetSessionDependencies {
  clock: Clock;
  sessionRepository: SessionRepository;
  userRepository: UserRepository;
  tokenHasher: TokenHasher;
}

export class GetSession {
  constructor(private readonly deps: GetSessionDependencies) {}

  async execute(input: GetSessionInput): Promise<GetSessionOutput | null> {
    const now = this.deps.clock.now();
    const tokenHash = this.deps.tokenHasher.hash(input.token);
    const session = await this.deps.sessionRepository.findByTokenHash(tokenHash);

    if (!session || session.deletedAt || session.expiresAt < now) {
      return null;
    }

    if (!this.deps.tokenHasher.verify(input.token, session.tokenHash)) {
      return null;
    }

    let renewed: true | undefined;
    if (session.expiresAt.getTime() - now.getTime() < SESSION_RENEWAL_THRESHOLD_MS) {
      await this.deps.sessionRepository.updateExpiresAt(
        session.id,
        new Date(now.getTime() + SESSION_TTL_MS),
      );
      renewed = true;
    }

    const user = await this.deps.userRepository.findById(session.userId);
    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      renewed,
    };
  }
}
