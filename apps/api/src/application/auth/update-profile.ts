import type { Clock } from "../../domain/ports/clock";
import type { SessionRepository } from "../../domain/ports/session-repository";
import type { TokenHasher } from "../../domain/ports/token-hasher";
import type { UserRepository } from "../../domain/ports/user-repository";

export interface UpdateProfileInput {
  token: string;
  name: string;
  studio: string | null;
}

export interface UpdateProfileOutput {
  id: string;
  email: string;
  name: string;
  studio: string | null;
  userTheme: string;
}

export interface UpdateProfileDependencies {
  clock: Clock;
  sessionRepository: SessionRepository;
  userRepository: UserRepository;
  tokenHasher: TokenHasher;
}

const NAME_MAX = 120;
const STUDIO_MAX = 120;

/**
 * Caso de uso: editar el perfil del usuario (PRD-v4 línea 231).
 *
 * Editables: `name` y `studio`. NO editable: `email` — la identidad del
 * usuario es el email (constraint UNIQUE en la DB y verificación por OTP).
 *
 * El `studio` vacío se guarda como `null` ("sin definir"), no como "".
 */
export class UpdateProfile {
  constructor(private readonly deps: UpdateProfileDependencies) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput | null> {
    const now = this.deps.clock.now();
    const tokenHash = this.deps.tokenHasher.hash(input.token);
    const session =
      await this.deps.sessionRepository.findByTokenHash(tokenHash);

    if (!session || session.deletedAt || session.expiresAt < now) {
      return null;
    }

    if (!this.deps.tokenHasher.verify(input.token, session.tokenHash)) {
      return null;
    }

    const name = input.name.trim();
    if (name.length === 0 || name.length > NAME_MAX) {
      throw new InvalidProfileError("name must be 1-120 chars");
    }

    const studio = input.studio === null ? null : input.studio.trim();
    if (studio !== null && studio.length > STUDIO_MAX) {
      throw new InvalidProfileError("studio must be at most 120 chars");
    }

    await this.deps.userRepository.updateProfile(session.userId, {
      name,
      studio: studio === "" ? null : studio,
    });

    const user = await this.deps.userRepository.findById(session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      studio: user.studio,
      userTheme: user.theme,
    };
  }
}

/**
 * Entrada inválida (nombre vacío o demasiado largo). El contract Zod ya
 * valida esto en el borde RPC; el use case es la última línea de defensa.
 */
export class InvalidProfileError extends Error {
  readonly code = "INVALID_PROFILE";
  constructor(message: string) {
    super(message);
    this.name = "InvalidProfileError";
  }
}
