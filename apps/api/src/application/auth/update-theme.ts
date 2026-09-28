import type { Clock } from "../../domain/ports/clock";
import type { SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";
import type { UserRepository } from "../../domain/ports/user-repository";

export interface UpdateThemeInput {
  token: string;
  setting: string;
}

export interface UpdateThemeOutput {
  user: {
    id: string;
    email: string;
    name: string;
    userTheme: string;
  };
}

export interface UpdateThemeDependencies {
  clock: Clock;
  sessionRepository: SessionRepository;
  userRepository: UserRepository;
  tokenHasher: TokenHasher;
}

const ALLOWED_THEMES = ["light", "dark", "system"] as const;
type AllowedTheme = (typeof ALLOWED_THEMES)[number];

export class InvalidThemeError extends Error {
  readonly code = "INVALID_THEME";
  constructor(public readonly setting: string) {
    super(`Invalid theme setting: ${setting}`);
    this.name = "InvalidThemeError";
  }
}

export class UpdateTheme {
  constructor(private readonly deps: UpdateThemeDependencies) {}

  async execute(input: UpdateThemeInput): Promise<UpdateThemeOutput | null> {
    const now = this.deps.clock.now();
    const tokenHash = this.deps.tokenHasher.hash(input.token);
    const session = await this.deps.sessionRepository.findByTokenHash(tokenHash);

    if (!session || session.deletedAt || session.expiresAt < now) {
      return null;
    }

    if (!this.deps.tokenHasher.verify(input.token, session.tokenHash)) {
      return null;
    }

    // Defense in depth: even though the zod schema validates this at the
    // RPC boundary, the use case is the last line of defense before
    // hitting the DB CHECK constraint (apps/api/migrations 001_initial
    // defines CHECK on user_theme IN ('light', 'dark', 'system')).
    if (
      !ALLOWED_THEMES.includes(input.setting as AllowedTheme)
    ) {
      throw new InvalidThemeError(input.setting);
    }

    await this.deps.userRepository.updateTheme(session.userId, input.setting);

    const user = await this.deps.userRepository.findById(session.userId);
    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userTheme: user.theme,
      },
    };
  }
}
